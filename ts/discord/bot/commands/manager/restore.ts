/** INFORMATION
 * Restore will restore a backup of a guild. It requires either the guild ID or the backup id.
 *
*/

import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import async = require('async');

import Backups = require('../../../models/backup');

import Command = require('../../command');

import utils = require('../../../utils');
import { DiscordBot, Optional } from '@type-manager';


const PERMS = {
	MAIN: 'commands.restore'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member!, server, PERMS.MAIN)) return Command.noPermsMessage('');

interface Backup {
	_id?: string;
	id?: string;

	ignore: string[];

	server_id: string;

	pid: string;
	items: string[];
	json: string;

	created_at: Date;
}

type ITEMS = 'all' | 'channels' | 'roles' | 'bans' | 'moderation' | 'overview' | 'emojis' | 'commands' | 'ignored' |
			 'intervals' | 'phrases' | 'blacklists' | 'perms' | 'prefix' | 'ranks' | 'alias' | 'warnings' | 'disabled';

const items = [
	'channels', 'roles', 'bans', 'moderation', 'overview', 'emojis',
	'commands', 'intervals', 'phrases', 'blacklists', 'perms', 'prefix', 'ranks', 'alias', 'warnings',
	'ignored', 'disabled'
];

class Restore extends Command {
	constructor() {
		super('restore');

		this.perms = Object.values(PERMS);

		this.description = 'Restore the backed up discord server to the new server.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					server.getPrefix() + 'restore <guild id/pid>'
				]
			]);
		}

		let pid = params.shift();

		let resp = await message.channel.send(Command.info([['Restore', 'Searching for backups from imputted ID.']]));

		let backups = await Backups.find({ $or: [ { server_id: pid }, { pid: pid } ]});

		if (backups.length == 0) {
			await message.channel.send(Command.info([['Restore', 'No Backups found for server/pid.']]));
			return Promise.resolve();
		}

		const selector = utils.createPageSelector(message.author.id, message.channel)!
		.setFormat([
			'Please pick a backup from the list below.',
			'',
			'{page_items}',
			'',
			'_Enter the number for the backup you\'d like to use/view._'
		])
		.setCollectionFormat(s => s.input + ' > ' + s.description)
		.setEditing(resp);

		for(let i = 0; i < backups.length; i++) {
			(function(pos, backup: Backup) {
				// TODO: Add version
				selector.addSelection('' + pos, `Created At: ${backup.created_at.toUTCString()}\nItems: \`${backup.items.join(', ')}\``, async page => {
					await mainEditPage(backup, page, server);
				});
			}(i + 1, backups[i].toJSON()));
		}

		await selector.display();
	}
}

async function mainEditPage(backup: Backup, page: utils.MessagePage, server: DiscordServer) {
	backup.ignore = [];

	page.setFormat([
		'From here you can toggle specifically what you want it to restore from the backup.',
		'{page_items}',
		'',
		'_Enter the type name from the backup you\'d like to toggle._'
	])
	.setCollectionFormat(s => s.input + ' -> ' + s.description);

	page.addSelection('all', 'Select all for importing.', async () => {
		let ignoring = Array.from(backup.ignore);

		ignoring.forEach(i => {
			toggleIgnore(i);

			page.editSelection(i, {
				description: isIgnoringText(i)
			});
		});

		await page.refresh();
	});

	backup.items.forEach(type => {
		toggleIgnore(type);

		page.addSelection(type, isIgnoringText(type), async () => {
			toggleIgnore(type);

			await page.editSelection(type, {
				description: isIgnoringText(type)
			}).refresh();
		});
	});

	page.addSpacer();

	page.addSelection('Finish', 'Import selected items', async () => {
		page.close('stop');

		// TODO: Option to clear guild before restoring.
		await startImport(backup, page.editingMessage!, server);
	});

	page.addSpacer();

	await page.display();


	function toggleIgnore(name: string) {
		let indexOf = backup.ignore.indexOf(name);

		if (indexOf == -1) backup.ignore.push(name);
		else backup.ignore.splice(indexOf, 1);
	}

	function isIgnoring(name: string) {
		return backup.ignore.indexOf(name) != -1;
	}

	function isIgnoringText(name: string) {
		return isIgnoring(name) ? ':no_entry_sign: Not importing' : ':white_check_mark: Importing';
	}
}

async function startImport(backup: Backup, message: Discord.Message, server: DiscordServer) {
	backup.ignore.forEach(i => backup.items.splice(backup.items.indexOf(i), 1));

	if (backup.items.length == 0) {
		return message.edit(Command.error([['Restore', 'Unable to restore. No items selected to restore.']]));
	}


	let items: Compiled = JSON.parse(backup.json);

	function isRestoring(name: ITEMS) {
		return backup.items.indexOf(name) != -1 && items[name] != null;
	}

	let tempIdToNew: { [str: string]: string } = {};

	const guild = message.guild!;

	let startTime = Date.now();

	let failed = [];

	await message.edit(Command.info([['Restore', 'Starting restore process...\n__' + backup.items.join(',') + '__']]));

	await asdf([
		// Roles || Required for: perms.roles, ranks
		async function() {
			if (isRestoring('roles')) {
				await message.edit(Command.info([
					[
						'Restore',
						'Restoring Roles...\n' + items.roles!.length + ' roles will take ~' + Math.round(items.roles!.length * 1.5) + ' seconds.'
					]
				]));

				await nextRole(0);

				// 0, 1, 2, 3
				items.roles = items.roles!.sort((r1, r2) => r1.position - r2.position);

				async function nextRole(pos: number) {
					if (items.roles!.length == pos) {
						return Promise.resolve();
					}

					let or = items.roles![pos];

					if (or.name == '@everyone' && or.position == 0) {
						let roles = guild.roles.cache.array();

						for(let i = 0; i < roles.length; i++) {
							let role = roles[i];

							if (role.position == 0) {
								let discRole = await role.edit({
									permissions: or.permissions,//<any>utils.getPermissions(or.permissions).toArray()
								});

								console.log(`[Roles]: ${or.id} - ${discRole.id} - ${discRole.name}`);
								tempIdToNew[or.id] =  discRole.id;

								await utils.asyncTimeout(1000);

								await nextRole(pos + 1);

								break;
							}
						}
					} else {
						let discRole = await guild.roles.create({
							data: {
								name: or.name,
								color: or.color,
								hoist: or.hoist,
								// position: or.position, // No need b/c it appends roles and I sort it from 0+
								permissions: or.permissions,//<any>utils.getPermissions().toArray(),
								mentionable: or.mentionable
							},
							reason: 'Restore'
						});

						console.log(`[Roles]: ${or.id} - ${discRole.id} - ${discRole.name}`);
						tempIdToNew[or.id] =  discRole.id;

						await utils.asyncTimeout(1000);

						await nextRole(pos + 1);
					}

					return Promise.resolve();
				}
			}

			return Promise.resolve();
		},
		// Channels || Required for: overview.afk_channel, overview.new_member_channel
		async function() {
			if (isRestoring('channels')) {
				await message.edit(Command.info([['Restore', 'Restoring Channels...']]));

				await createChannels(items.channels!);
			}

			async function createChannels(channels: Optional<DiscordBot.BackupChannel[]>) {
				if (channels == null || channels.length == 0) {
					return Promise.resolve();
				}

				channels = channels.sort((c1, c2) => c1.position - c2.position);

				await create(0);

				async function create(pos: number) {
					if (channels!.length == pos) {
						return Promise.resolve();
					}

					let c = channels![pos];

					let channel = await guild.channels.create(c.name, {
						type: c.type,
						permissionOverwrites: c.perms
					});

					console.log(`[Channels]: ${c.id} - ${channel.id}`);
					tempIdToNew[c.id] = channel.id;

					if (c.parent != null && tempIdToNew[c.parent] != null) {
						await channel.setParent(tempIdToNew[c.parent], { reason: 'Restore' });
					}

					//TODO: temp save channel name. (ignored channels)
					await createChannels(c.children);

					await utils.asyncTimeout(1000);

					await create(pos + 1);

					return Promise.resolve();
				}
			}

			return Promise.resolve();
		},
		// Overview
		async function() {
			if (!isRestoring('moderation') && !isRestoring('overview')) {
				return Promise.resolve();
			}

			await message.edit(Command.info([['Restore', 'Restoring Overview/Moderation...']]));

			if (isRestoring('overview')) {
				let overview = items.overview;

				await utils.asyncCatchBool(guild.setName(overview!.server_name));
				await utils.asyncCatchBool(guild.setRegion(overview!.server_region));
				await utils.asyncCatchBool(guild.setAFKTimeout(overview!.afk_timeout));
				// overview.server_image ? guild.setIcon(overview.server_image) : null,
				// Possibility to be null if channels weren't included in backup.
				if (overview!.afk_channel) {
					await utils.asyncCatchBool(guild.setAFKChannel(tempIdToNew[overview!.afk_channel]));
				}

				if (overview!.new_member_channel) {
					await utils.asyncCatchBool(guild.setSystemChannel(tempIdToNew[overview!.new_member_channel]));
				}

				// notification_settings: Discord.MessageNotifications;
			}

			return Promise.resolve();
		},
		// Moderation
		async function() {
			if (isRestoring('moderation')) {
				await utils.asyncCatchBool(guild.setVerificationLevel(items.moderation!.verification));

				// TODO: Linode crashes @ this one. guild.setExcplicitContentFilter(items.moderation.content_filter)
			}

			return Promise.resolve();
		},
		// Emoji
		async function() {
			if (isRestoring('emojis')) {
				// nextEmoji(0);

				function nextEmoji(pos: number) {
					if (items.emojis!.length == pos) return;

					let emoji = items.emojis![pos];

					// emoji.
				}
			}

			return Promise.resolve();
		},
		// Bans
		async function() {
			if (isRestoring('bans')) {
				await message.edit(Command.info([
					[
						'Restore',
						'Restoring Bans...\n' + items.roles!.length + ' bans may take ~' + Math.round(items.roles!.length * 1.5) + ' seconds.'
					]
				]));

				await nextBan(0);


				async function nextBan(pos: number) {
					if (items.bans!.length == pos) {
						return Promise.resolve();
					}

					let b = items.bans![pos];

					await guild.members.ban(b/*, { days: null, reason: null }*/);

					await utils.asyncTimeout(200);

					await nextBan(pos + 1);

					return Promise.resolve();
				}
			}

			return Promise.resolve();
		},
		// Phrases
		async function() {
			if (isRestoring('phrases')) {
				await message.edit(Command.info([['Restore', 'Restoring Phrases...']]));

				await nextPhrase(0);

				async function nextPhrase(pos: number) {
					if (items.phrases!.length == pos) {
						return Promise.resolve();
					}

					let p = items.phrases![pos];

					let phrase = await server.createPhrase(message.member!, p.phrases);

					server.setPhraseIgnoreCase(phrase.pid, p.ignoreCase);
					server.setPhraseResponse(phrase.pid, p.responses);

					await nextPhrase(pos + 1);
				}
			}

			return Promise.resolve();
		},
		// Commands
		async function() {
			if (isRestoring('commands')) {
				await message.edit(Command.info([['Restore', 'Restoring Commands...']]));

				nextCommand(0);


				async function nextCommand(pos: number): Promise<void> {
					if (items.commands!.length == pos) {
						return Promise.resolve();
					}

					let c = items.commands![pos];

					await server.createCommand(guild.owner!, c.alias, c.params);

					return nextCommand(pos + 1);
				}
			}

			return Promise.resolve();
		},
		// Everything else.
		async function() {
			if (isRestoring('alias')) {
				items.alias!.forEach(a => server.createAlias(a.alias, a.command));
			}

			if (isRestoring('blacklists')) {
				for(let cid in items.blacklists) {
					let item = items.blacklists[cid];
					item.items.forEach(b => server.blacklist(cid, b));
					server.blacklistPunishment(cid, item.punishment);
				}
			}

			if (isRestoring('disabled')) {
				server.moderation.disabledCustomCommands = items.disabled_custom_comm!;
				server.moderation.disabledDefaultCommands = items.disabled_default_comm!;
			}

			if (isRestoring('ignored')) {
				server.moderation.ignoredChannels = items.ignored_channels!;
				server.moderation.ignoredUsers = items.ignored_users!;
			}

			if (isRestoring('perms')) {
				let perms = items.perms!;
				// TODO: Add groups

				for(let id in perms!.groups) {
					let group = perms!.groups[id];
					let roleClazz = guild.roles.cache.get(tempIdToNew[id]);

					if (roleClazz != null) {
						group.perms.forEach(p => server.addPermTo('groups', roleClazz!.id, p));
					} else {
						//
					}

					// group.groups.forEach(p => server.addGroupTo('groups', id, p));
				}

				for(let id in perms.roles) {
					let actualId = tempIdToNew[id];
					if (actualId != null) {
						let role = perms.roles[id];
						role.perms.forEach(p => server.addPermTo('roles', actualId, p));
						role.groups.forEach(p => server.addGroupTo('roles', actualId, p));
					}
				}

				for(let id in perms.users) {
					let user = perms.users[id];
					// Only add if member is in guild.
					if (guild.members.cache.has(id)) {
						user.perms.forEach(p => server.addPermTo('users', id, p));
						user.groups.forEach(p => server.addGroupTo('users', id, p));
					}
				}
			}

			if (isRestoring('intervals')) {
				items.intervals!.forEach(i => {
					server.createInterval({
						guild_id: guild.id,

						displayName: i.displayName,
						message: i.message,
						active: false,

						every: i.every,
						nextCall: i.nextCall,
						events: i.events
					});
				});
			}

			if (isRestoring('prefix')) {
				server.commandPrefix = items.prefix;
			}

			if (isRestoring('ranks')) {
				items.ranks!.forEach(r => {
					let actualId = tempIdToNew[r];
					if (actualId != null) {
						server.addRank(actualId);
					}
				});
			}

			return Promise.resolve();
		}
	], async function() {
		await server.save();

		await message.edit(Command.info([['Restore', 'Finished.\nTook: ' + ((Date.now() - startTime)/1000) + 's']]));

		console.log('Saved to server.');

		return Promise.resolve();
	});
}

export = Restore;


async function asdf(items: (() => Promise<void>)[], finish: () => Promise<void>) {
	for (let i = 0; i < items.length; i++) {
		await items[i]();
	}

	return finish();
}

interface Compiled {
	roles?: DiscordBot.Role[];

	channels?: DiscordBot.BackupChannel[];

	overview?: DiscordBot.BackupOverview;

	moderation?: DiscordBot.BackupModeration;

	bans?: string[];

	emojis?: DiscordBot.BackupEmojis[];

	blacklists?: DiscordBot.ModerationBlacklist;
	disabled_custom_comm?: string[];
	disabled_default_comm?: string[];
	ignored_channels?: string[];
	ignored_users?: string[];
	perms?: DiscordBot.Permissions;
	prefix?: string;
	ranks?: string[];
	alias?: Omit<DiscordBot.Alias, 'pid'>[];


	commands?: Omit<DiscordBot.Command, '_id' | 'pid'>[];

	intervals?: DiscordBot.Interval[];

	phrases?: Omit<DiscordBot.Phrase, 'pid'>[];

	[key: string]: any;
}