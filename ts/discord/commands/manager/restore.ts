import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import async = require('async');

import Backups = require('../../models/backup');

import Command = require('../../command');

import utils = require('../../utils');


import chatUtil = require('../../utils/chat');
import { MessagePage } from '../../utils/chat';

const PERMS = {
	MAIN: 'commands.restore'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');

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

const items = [
	'channels', 'roles', 'bans', 'moderation', 'overview', 'emojis',
	'commands', 'intervals', 'phrases', 'blacklists', 'perms', 'prefix', 'ranks', 'alias', 'warnings'
];

class Restore extends Command {
	constructor() {
		super('restore');

		this.perms = Object.values(PERMS);

		this.description = 'Restore the backed up discord server to the new server.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					server.getPrefix() + 'restore <guild id/pid>'
				]
			]);
		}

		var pid = params.shift();

		message.channel.send(Command.info([['Restore', 'Searching for backups from imputted ID.']]))
		.then((resp: Discord.Message) => {
			Backups.find({ $or: [ { server_id: pid }, { pid: pid } ]}, (err, backups) => {
				if (err != null) return message.channel.send(Command.info([['Restore', 'An error occured. Please try again in a few moments.']]));
				if (backups.length == 0) return message.channel.send(Command.info([['Restore', 'No Backups found for server/pid.']]));
	
				// if (backups.length == 1) {
				// 	const selector = chatUtil.createPageSelector(message.author.id, <any>message.channel)
				// 	.setEditing(resp);

				// 	mainEditPage(backups[0].toJSON(), selector, server);
				// 	return; 
				// }

				const selector = chatUtil.createPageSelector(message.author.id, <any>message.channel)
				.setFormat([
					'Please pick a backup from the list below.',
					'',
					'{page_items}',
					'',
					'_Enter the number for the backup you\'d like to use/view._'
				])
				.setCollectionFormat(s => s.input + ' > ' + s.description)
				.setEditing(resp);

				for(var i = 0; i < backups.length; i++) {
					(function(pos, backup: Backup) {
						selector.addSelection('' + pos, `Created At: ${backup.created_at.toUTCString()}\nItems: \`${backup.items.join(', ')}\``, (page, fin) => {
							mainEditPage(backup, page, server);
							fin();
						});
					}(i + 1, backups[i].toJSON()));
				}

				selector.display();
			});
		})
		.catch(e => console.error(e));
	}
}

function mainEditPage(backup: Backup, page: MessagePage, server: DiscordServer) {
	backup.ignore = [];

	page.setFormat([
		'From here you can toggle specifically what you want it to restore from the backup.',
		'{page_items}',
		'',
		'_Enter the type name from the backup you\'d like to toggle._'
	])
	.setCollectionFormat(s => s.input + ' -> ' + s.description);

	page.addSelection('all', 'Select all for importing.', () => {
		var ignoring = [].concat(backup.ignore);

		ignoring.forEach(i => {
			toggleIgnore(i);

			page.editSelection(i, {
				description: isIgnoringText(i)
			});
		});

		page.refresh();
	});

	backup.items.forEach(type => {
		toggleIgnore(type);

		page.addSelection(type, isIgnoringText(type), () => {
			toggleIgnore(type);

			page.editSelection(type, {
				description: isIgnoringText(type)
			}).refresh();
		});
	});

	page.addSpacer();

	page.addSelection('Finish', 'Import selected items', () => {
		page.close('stop');

		// TODO: Option to clear guild before restoring.
		startImport(backup, page.editingMessage, server);
	});

	page.addSpacer();

	page.display();


	function toggleIgnore(name: string) {
		var indexOf = backup.ignore.indexOf(name);

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

function startImport(backup: Backup, message: Discord.Message, server: DiscordServer) {
	backup.ignore.forEach(i => backup.items.splice(backup.items.indexOf(i), 1));

	if (backup.items.length == 0) {
		return message.edit(Command.error([['Restore', 'Unable to restore. No items selected to restore.']]))
			.catch(e => console.error(e));
	}


	var items: Compiled = JSON.parse(backup.json);

	function isImporting(name: string) {
		return backup.items.indexOf(name) != -1 && items[name] != null;
	}

	var tempIdToNew: { [str: string]: string } = {};

	const guild = message.guild;

	var startTime = Date.now();

	message.edit(Command.info([['Restore', 'Starting restore process...\n__' + backup.items.join(',') + '__']]))
	.then(() => {
		asdf([
			// Roles || Required for: perms.roles, ranks
			function(next) {
				if (isImporting('roles')) {
					message.edit(Command.info([['Restore', 'Restoring Roles...']]))
					.then(() => nextRole(0))
					.catch(e => console.error(e));

					function nextRole(pos) {
						if (items.roles.length == pos) return next();

						var or = items.roles[pos];

						guild.createRole({
							name: or.name,
							color: or.color,
							hoist: or.hoist,
							position: or.position,
							permissions: <any>utils.getPermissions(or.permissions).toArray(),
							mentionable: or.mentionable
						})
						.then(r => {
							tempIdToNew[or.id] =  r.id;
							nextRole(pos + 1);
						})
						.catch(e => {
							console.error(e);
							nextRole(pos + 1);
						})
					}

				} else next();
			},
			// Channels || Required for: overview.afk_channel, overview.new_member_channel
			function(next) {
				if (isImporting('channels')) {
					message.edit(Command.info([['Restore', 'Restoring Channels...']]))
					.then(() => {
						createChannels(items.channels, () => {
							next();
						});
					})
					.catch(e => console.error(e));
				} else next();
	
				function createChannels(channels: CompiledChannel[], fin: () => any) {
					if (channels == null || channels.length == 0) return fin();

					create(0);

					function create(pos: number) {
						if (channels.length == pos) return fin && fin();

						var c = channels[pos];

						guild.createChannel(c.name, c.type)
						.then(channel => {
							tempIdToNew[c.id] = channel.id;
	
							c.perms.forEach(p => {
								var obj = {};
	
								utils.getPermissions(p.allow).toArray().forEach(p => obj[p] = true);
								utils.getPermissions(p.deny).toArray().forEach(p => obj[p] = false);
	
								channel.overwritePermissions(tempIdToNew[p.id], obj)
								.catch(e => {
									console.error('overwritePerms:', e);
									console.log(c.name + ' | ' + channel.id + ' - ' + p.type);
									console.log(p.id + ' - ' + tempIdToNew[p.id]);
								});
							});

							if (c.parent != null && tempIdToNew[c.parent] != null) {
								channel.setParent(tempIdToNew[c.parent], 'Restore');
							}
	
							//TODO: temp save channel name. (ignored channels)
							createChannels(c.children, () => {
								create(pos + 1);
							});
						})
						.catch(e => {
							console.error(e);
							create(pos + 1);
						})
					}
				}
			},
			// Overview
			function(next) {
				message.edit(Command.info([['Restore', 'Restoring Overview/Moderation...']]))
				.then(() => {
					if (isImporting('overview')) {
						var overview = items.overview;

						async.map([
							guild.setName(overview.server_name),
							guild.setRegion(overview.server_region),
							guild.setAFKTimeout(overview.afk_timeout),
							// overview.server_image ? guild.setIcon(overview.server_image) : null,
							// Possibility to be null if channels weren't included in backup.
							overview.afk_channel ? guild.setAFKChannel(overview.afk_channel) : null,
							overview.new_member_channel ? guild.setSystemChannel(overview.new_member_channel) : null
						], (promise, callback) => {
							if (promise != null) {
								promise.then(callback)
								.catch(callback);
							}
						}, (err, res) => {
							if (err != null) console.error(err);
							next();
						});

						// notification_settings: Discord.MessageNotifications;

						next();
					} else {
						next();
					}
				})
				.catch(e => console.error(e));
			},
			// Moderation
			function(next) {
				if (isImporting('moderation')) {
					async.map([
						guild.setVerificationLevel(items.moderation.verification),
						guild.setExcplicitContentFilter(items.moderation.content_filter)
					], (promise, callback) => {
						if (promise != null) {
							promise.then(callback)
							.catch(callback);
						}
					}, (err, res) => {
						if (err != null) console.error(err);
						next();
					});
				} else next();
			},
			// Emoji
			function(next) {
				if (isImporting('emojis')) {
					// nextEmoji(0);
					next();

					function nextEmoji(pos: number) {
						if (items.emojis.length == pos) return next();

						var emoji = items.emojis[pos];

						// emoji.
					}
				} else next();
			},
			// Bans
			function(next) {
				if (isImporting('bans')) {
					message.edit(Command.info([['Restore', 'Restoring Bans...']]))
					.then(() => nextBan(0))
					.catch(e => console.error(e));

					function nextBan(pos: number) {
						if (items.bans.length == pos) return next();

						var b = items.bans[pos];

						guild.ban(b)
						.then(b => nextBan(pos + 1))
						.catch(e => {
							console.error(e);
							nextBan(pos + 1);
						});
					}
				} else next();
			},
			// Phrases
			function(next) {
				if (isImporting('phrases')) {
					message.edit(Command.info([['Restore', 'Restoring Phrases...']]))
					.then(() => nextPhrase(0))
					.catch(e => console.error(e));
					
					function nextPhrase(pos: number) {
						if (items.phrases.length == pos) return next();

						var p = items.phrases[pos];

						server.createPhrase(message.member, p.phrases, phrase => {
							server.setPhraseIgnoreCase(phrase.pid, p.ignoreCase);
							server.setPhraseResponse(phrase.pid, p.responses);
								
							nextPhrase(pos + 1);
						});
					}
				} else next();
			},
			// Commands
			function(next) {
				if (isImporting('commands')) {
					message.edit(Command.info([['Restore', 'Restoring Commands...']]))
					.then(() => nextCommand(0))
					.catch(e => console.error(e));


					function nextCommand(pos: number) {
						if (items.commands.length == pos) return next();

						var c = items.commands[pos];

						server.createCommand(guild.owner, c.alias, c.params, () => nextCommand(pos + 1));
					}
				} else next();
			},
			// Everything else.
			function(next) {
				if (isImporting('alias')) {
					items.alias.forEach(a => server.createAlias(a.alias, a.command));
				}

				if (isImporting('blacklists')) {
					for(var cid in items.blacklists) {
						var items = items.blacklists[cid];
						items.forEach(b => server.blacklist(cid, b));
					}
				}

				if (isImporting('disabled_custom_comm')) {
					// items.disabled_custom_comm.forEach(c => server);
				}

				if (isImporting('disabled_default_comm')) {
					//items.disabled_default_comm.forEach(c => server);
				}

				if (isImporting('ignored_channels')) {
					items.ignored_channels.forEach(c => server.ignore('channel', c));
				}

				if (isImporting('ignored_users')) {
					items.ignored_users.forEach(c => server.ignore('member', c));
				}

				if (isImporting('perms')) {
					var perms = items.perms;
					// TODO: Add groups
	
					for(var id in perms.groups) {
						var group = perms.groups[id];
						var roleClazz = guild.roles.get(tempIdToNew[id]);
	
						if (roleClazz != null) {
							group.perms.forEach(p => server.addPermTo('groups', roleClazz.id, p));
						} else {
							// 
						}
	
						// group.groups.forEach(p => server.addGroupTo('groups', id, p));
					}
	
					for(var id in perms.roles) {
						var actualId = tempIdToNew[id];
						if (actualId != null) {
							var role = perms.roles[id];
							role.perms.forEach(p => server.addPermTo('roles', actualId, p));
							role.groups.forEach(p => server.addGroupTo('roles', actualId, p));
						}
					}
	
					for(var id in perms.users) {
						var user = perms.users[id];
						// Only add if member is in guild.
						if (guild.members.has(id)) {
							user.perms.forEach(p => server.addPermTo('users', id, p));
							user.groups.forEach(p => server.addGroupTo('users', id, p));
						}
					}
				}

				if (isImporting('intervals')) {
					items.intervals.forEach(i => {
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

				if (isImporting('prefix')) {
					server.commandPrefix = items.prefix;
				}

				if (isImporting('ranks')) {
					items.ranks.forEach(r => {
						var actualId = tempIdToNew[r];
						if (actualId != null) {
							server.addRank(actualId);
						}
					});
				}

				next();
			}
		], function() {
			server.save(() => {
				message.edit(Command.info([['Restore', 'Finished.\nTook: ' + ((Date.now() - startTime)/1000) + 's']]))
				.catch(e => console.error(e));
				console.log('Saved to server.');
			});
		});
	})
	.catch(e => console.error(e));
}

export = Restore;


function asdf(items: ((cb: () => any) => any)[], finish: () => any) {
	var pos = 0;

	next();

	function next() {
		if (pos >= items.length) return finish();
		items[pos++](() => next());
	}
}

interface CompiledChannel {
	id: string;
	name: string;
	type: 'category' | 'text' | 'voice';
	perms: {
		id: string;
		allow: number;
		deny: number;
		type: string;
	}[];
	position: number;

	parent?: string;
	children?: CompiledChannel[];
};

interface Compiled {
	roles?: {
		_id?: string;
		id: string;

		position: number;
		name: string;
		color: number;
		hoist: boolean;
		mentionable: boolean;
		permissions: number;
		editable: boolean;
	}[];

	channels?: CompiledChannel[];

	overview?: {
		server_image: string;
		server_name: string;
		server_region: string;
		afk_channel: string;
		afk_timeout: number;
		new_member_channel: string;
		notification_settings: Discord.MessageNotifications;
	};

	moderation?: {
		verification: number;
		content_filter: number;
	};

	bans?: string[];

	emojis?: {
		name: string;
		animated: boolean;
		requiresColons: boolean;
		image: string;
		roles: string[];
	}[];

	blacklists?: { [value: string]: string[] };
	disabled_custom_comm?: string[];
	disabled_default_comm?: string[];
	ignored_channels?: string[];
	ignored_users?: string[];
	perms?: DiscordBot.Permissions;
	prefix?: string;
	ranks?: string[];
	alias?: { command: string; alias: string[]; }[];


	commands?: { alias: string[]; params: DiscordBot.CommandParam[] }[];

	intervals?: {
		active: boolean;
		displayName: string;
		events: any;
		every: number;
		message: string;
		nextCall: number;
	}[]

	phrases?: {
		enabled: boolean;
		ignoreCase: boolean;
		phrases: string[];
		responses: DiscordBot.PhraseResponses[];
	}[];
}