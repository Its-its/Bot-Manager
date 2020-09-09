import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Backups = require('../../../models/backup');

import Command = require('../../command');
import { DiscordBot, Nullable } from '@type-manager';
import utils = require('../../../utils');

const PERMISSIONS = {
	MAIN: 'commands.backup'
};

type ITEMS = 'all' | 'channels' | 'roles' | 'bans' | 'moderation' | 'overview' | 'emojis' | 'commands' | 'ignored' |
			 'intervals' | 'phrases' | 'blacklists' | 'perms' | 'prefix' | 'ranks' | 'alias' | 'warnings' | 'disabled';

const items = [
	'channels', 'roles', 'bans', 'moderation', 'overview', 'emojis',
	'commands', 'intervals', 'phrases', 'blacklists', 'perms', 'prefix', 'ranks', 'alias', 'warnings',
	'ignored', 'disabled'
];

// TODO: DO NOT USE ANY TYPE OF CACHE IN HERE.

class Backup extends Command {
	constructor() {
		super('backup');

		this.description = 'Save the discord server so you can restore it to an empty one.';

		this.perms = Object.values(PERMISSIONS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			let backups = await Backups.find({ server_id: server.serverId });

			await message.channel.send(Command.info([
				[ 'Description', this.description ],
				[
					'Backups',
					backups.length == 0
					? 'None'
					: backups.map(b => `**ID:** ${b.pid}\n**Created:** ${b.created_at.toUTCString()}\n**Items:** \`\`${b.items}\`\``).join('\n\n')
				],
				[
					'Command Usage',
					[
						server.getPrefix() + 'backup remove <ID>',
						// server.getPrefix() + 'backup info <ID>',
						server.getPrefix() + 'backup <items>',
						'',
						'Items:',
						' - all',
						'_Individual items:_',
						' - channels, roles, bans, moderation, overview, emojis',
						' - commands, intervals, phrases, blacklists, disabled, ignored, perms, prefix, ranks, alias, warnings'
					].join('\n')
				],
				[
					'Examples',
					[
						'backup all\n_Backup all the data_\n',
						'backup channels commands\n_Backup channels and commands._\n',
						'backup all -bans',
						'backup -bans\n_Backup all the data except for the bans._'
					].map(t => server.getPrefix() + t).join('\n')
				]
			]));

			return Promise.resolve();
		}

		if (params[0] == 'clone') {
			let chann = message.guild!.channels.cache.get(params[1]);

			if (chann != null) {
				await createChannels([parseChannel(chann)]);

				console.log('fin');
			} else {
				console.log('errr');
			}

			function parseChannel(channel: Discord.GuildChannel): DiscordBot.BackupChannel {
				let opt: DiscordBot.BackupChannel = {
					id: channel.id,
					name: channel.name,
					// @ts-ignore
					type: channel.type,
					perms: channel.permissionOverwrites.map(p => {
						return {
							id: p.id,
							allow: p.allow,
							deny: p.deny,
							type: p.type
						}
					}).filter(p => p.id != null),
					position: channel.calculatedPosition
				}


				if (channel.parentID != null) {
					opt.parent = channel.parentID;
				}

				if (channel.type == 'category') {
					opt.children = (<Discord.CategoryChannel>channel).children.map(c => parseChannel(c));
				}

				return opt;
			}

			let tempIdToNew: { [old_id: string]: string } = {};


			async function createChannels(channels: DiscordBot.BackupChannel[]) {
				if (channels == null || channels.length == 0) return Promise.resolve();

				channels = channels.sort((c1, c2) => c1.position - c2.position);

				createAtPos(0);

				async function createAtPos(pos: number) {
					if (channels.length == pos) return Promise.resolve();

					let c = channels[pos];

					let channel = await message.guild!.channels.create(c.name, {
						type: c.type,
						permissionOverwrites: c.perms
					});

					console.log(`[Channels]: ${c.id} - ${channel.id}`);
					tempIdToNew[c.id] = channel.id;

					if (c.parent != null && tempIdToNew[c.parent] != null) {
						channel.setParent(tempIdToNew[c.parent], { reason: 'Restore' });
					}

					//TODO: temp save channel name. (ignored channels)
					if (c.children != null) {
						await createChannels(c.children);
					}

					await utils.asyncTimeout(1000);

					await createAtPos(pos + 1);
				}
			}

			return Promise.resolve();
		}

		if (params[0] == 'remove') {
			if (params[1] == null) return Command.error([['Backup', 'Invalid usage.']]);

			let item = await Backups.findOneAndRemove({ server_id: server.serverId, pid: params[1] });

			await message.channel.send(Command.info([
				[
					'Backup',
					item == null ? 'Item with said ID does not exist.' : 'Successfully removed item.'
				]
			]));

			return Promise.resolve();
		}

		if (params[0] == 'list') {
			if (params[1] == null) params[1] = server.serverId;

			let backups = await Backups.find({ server_id: params[1] });

			await message.channel.send(Command.info([
				[
					'Backups',
					[
						'**Server ID:** ' + params,
						backups.length == 0
						? 'None'
						: backups.map(b => `**ID:** ${b.pid}\n**Created:** ${b.created_at.toUTCString()}\n**Items:** ${b.items}`).join('\n\n')
					].join('\n')
				]
			]));

			return Promise.resolve();
		}


		let count = await Backups.count({ server_id: server.serverId });

		if (count >= 5) {
			await message.channel.send(Command.info([['Backup', 'Max Backups created. If you would like to make a new one, delete an existing one.']]));
			return Promise.resolve();
		}

		// Start Backup.

		// TODO: Page: Show what will not be backed up. Confirm/Exit.

		await createNewBackup();

		function isBackingUp(item: ITEMS) {
			return params.indexOf(item) != -1;
		}

		async function createNewBackup() {
			let hasAll = isBackingUp('all');

			if (hasAll || params[0][0] == '-') {
				if (hasAll) params.splice(params.indexOf('all'), 1);

				let removeList = params;
				params = items;

				for(let i = 0; i < removeList.length; i++) {
					let remove = removeList[i];

					if (remove[0] == '-') {
						let index = params.indexOf(remove.slice(1));
						if (index != -1) params.splice(index, 1);
						else {
							await message.channel.send(Command.error([['Backup', 'Invalid item to remove "' + remove.slice(1) + '"']]));
							return Promise.resolve();
						}
					} else {
						await message.channel.send(Command.error([['Backup', 'Invalid backup usage.']]));
						return Promise.resolve();
					}
				}
			}


			let compiled: Compiled = {};

			let guild = message.guild!;

			let lastMessage: Nullable<Discord.Message> = null;


			if (!isBackingUp('roles')) {
				let sending = [];

				if (isBackingUp('perms')) sending.push('Cannot save role perms if roles aren\'t saved. (FOR NOW)');
				if (isBackingUp('ranks')) {
					params.splice(params.indexOf('ranks'), 1);
					sending.push('Cannot save ranks if roles aren\'t saved. (FOR NOW)');
				}

				if (sending.length != 0) {
					lastMessage = await message.channel.send(Command.info([[ 'Backup', sending.join('\n') ]]));
				}
			}


			await asdf([
				// Guild
				async function() {
					// Required for: perms.roles, ranks
					if (isBackingUp('roles')) {
						compiled['roles'] = guild.roles.cache.filter(r => !r.managed).map(r => {

							return {
								id: r.id,

								position: r.position,
								name: r.name,
								color: r.color,
								hoist: r.hoist,
								mentionable: r.mentionable,
								permissions: r.permissions.bitfield,
								editable: r.editable
							};
						});
					}

					// Required for: overview.afk_channel, overview.new_member_channel
					// TODO: Proper order.
					if (isBackingUp('channels')) {
						compiled['channels'] = guild.channels.cache.filter(c => c.parent == null).map(c => parseChannel(c));

						function parseChannel(channel: Discord.GuildChannel): DiscordBot.BackupChannel {

							let opt: DiscordBot.BackupChannel = {
								id: channel.id,
								name: channel.name,
								// @ts-ignore
								type: channel.type,
								perms: channel.permissionOverwrites.map(p => {
									return {
										id: p.id,
										allow: p.allow,
										deny: p.deny,
										type: p.type
									}
								}).filter(p => p.id != null),
								position: channel.calculatedPosition
							}


							if (channel.parentID != null) {
								opt.parent = channel.parentID;
							}

							if (channel.type == 'category') {
								opt.children = (<Discord.CategoryChannel>channel).children.map(c => parseChannel(c));
							}

							return opt;
						}
					}

					if (isBackingUp('overview')) {
						compiled['overview']! = {
							server_image: guild.icon + '',
							server_name: guild.name,
							server_region: guild.region,
							afk_channel: guild.afkChannelID == null ? undefined : guild.afkChannelID,
							afk_timeout: guild.afkTimeout,
							new_member_channel: guild.systemChannelID == null ? undefined : guild.systemChannelID,
							notification_settings: guild.defaultMessageNotifications
						};
					}

					if (isBackingUp('moderation')) {
						compiled['moderation'] = {
							verification: verificationLvlToNumber(guild.verificationLevel),
							content_filter: contentFilterToNumber(guild.explicitContentFilter)
						};
					}

					if (isBackingUp('emojis')) {
						compiled['emojis'] = guild.emojis.cache.filter(r => !r.managed).map(e => {
							return {
								name: e.name,
								animated: e.animated,
								requiresColons: e.requiresColons,
								image: e.url,
								roles: e.roles.cache.map(r => r.id)
							};
						});
					}

					if (isBackingUp('bans')) {
						let bans = await guild.fetchBans();
						compiled['bans'] = bans.keyArray();
					}

					return Promise.resolve();
				},
				// Custom
				async function() {
					if (isBackingUp('commands')) {
						compiled['commands'] = server.commands.items.map(c => { return { alias: c.alias, params: c.params }; });
					}

					if (isBackingUp('intervals')) {
						compiled['intervals'] = server.intervals.items.map(i => {
							return {
								active: false,
								displayName: i.displayName,
								events: i.events,
								every: i.every,
								message: i.message,
								nextCall: i.nextCall
							};
						});
					}

					if (isBackingUp('phrases')) {
						compiled['phrases'] = server.phrases.items.map(p => {
							return {
								enabled: p.enabled,
								ignoreCase: p.ignoreCase,
								phrases: p.phrases,
								responses: p.responses
							};
						});
					}

					if (isBackingUp('blacklists')) {
						compiled['blacklists'] = server.moderation.blacklisted;
					}

					if (isBackingUp('disabled')) {
						compiled['disabled_custom_comm'] = server.moderation.disabledCustomCommands;
						compiled['disabled_default_comm'] = server.moderation.disabledDefaultCommands;
					}

					if (isBackingUp('ignored')) {
						compiled['ignored_channels'] = server.moderation.ignoredChannels;
						compiled['ignored_users'] = server.moderation.ignoredUsers;
					}

					if (isBackingUp('perms')) {
						let perms: Partial<DiscordBot.Permissions> = compiled['perms'] = server.permissions;

						if (!isBackingUp('roles')) delete perms['roles'];
					}

					if (isBackingUp('prefix')) compiled['prefix'] = server.commandPrefix;

					if (isBackingUp('ranks') && isBackingUp('roles')) {
						compiled['ranks'] = server.ranks.items;
					}

					if (isBackingUp('alias')) compiled['alias'] = server.alias.items.map(a => { return { command: a.command, alias: a.alias }; });

					return Promise.resolve();
				},
			],
			// Finish
			async function() {
				let backup = new Backups({
					version: 1,
					server_id: server.serverId,
					pid: uniqueID(8),
					items: params,
					json: JSON.stringify(compiled),
					created_at: Date.now()
				});

				await backup.save();

				let toSend = Command.success([
					[
						'Backup',
						'Completed.'
					]
				]);

				if (lastMessage != null) {
					await lastMessage.edit(toSend);
				} else {
					await message.channel.send(toSend);
				}

				console.log(JSON.stringify(compiled, null, 2));

				return Promise.resolve();
			});

			return Promise.resolve();
		}
	}
}


async function asdf(items: (() => Promise<void>)[], finish: () => Promise<void>) {
	for (let i = 0; i < items.length; i++) {
		await items[i]();
	}

	return finish();
}

function contentFilterToNumber(level: Discord.ExplicitContentFilterLevel): number {
	switch (level) {
		case 'DISABLED': return 0;
		case 'MEMBERS_WITHOUT_ROLES': return 1;
		case 'ALL_MEMBERS': return 2;
	}
}

function verificationLvlToNumber(level: Discord.VerificationLevel): number {
	switch (level) {
		case 'NONE': return 0;
		case 'LOW': return 1;
		case 'MEDIUM': return 2;
		case 'HIGH': return 3;
		case 'VERY_HIGH': return 4;
	}
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
}


function tempID() {
	return uniqueID(1);
}

function uniqueID(size: number): string {
	let bloc = [];

	for(let i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

export = Backup;