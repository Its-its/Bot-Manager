import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Backups = require('../../models/backup');

import Command = require('../../command');


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
					server.getPrefix() + 'restore'
				]
			]);
		}

		var pid = params.shift();

		message.channel.send(Command.info([['Restore', 'Searching for backups from imputted ID.']]))
		.then((resp: Discord.Message) => {
			Backups.find({ $or: [ { server_id: pid }, { pid: pid } ]}, (err, backups) => {
				if (err != null) return message.channel.send(Command.info([['Restore', 'An error occured. Please try again in a few moments.']]));
				if (backups.length == 0) return message.channel.send(Command.info([['Restore', 'No Backups found for server/pid.']]));
	
				if (backups.length == 1) {
					const selector = chatUtil.createPageSelector(message.author.id, <any>message.channel)
					.setEditing(resp);

					mainEditPage(backups[0].toJSON(), selector, server);
					return; 
				}

				const selector = chatUtil.createPageSelector(message.author.id, <any>message.channel)
				.setFormat([
					'We have detected that there are multiple backups.\nPlease pick one from the list below.\n',
					'{page_items}',
					'\n_Enter the number for the backup you\'d like to use/view._'
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
// 
function mainEditPage(backup: Backup, page: MessagePage, server: DiscordServer) {
	backup.ignore = [];

	page.setFormat([
		'From here you can toggle specifically what you want it to restore from the backup.',
		'{page_items}',
		'\n_Enter the type name from the backup you\'d like to toggle._'
	])
	.setCollectionFormat(s => s.input + ' -> ' + s.description);

	backup.items.forEach(type => {
		page.addSelection(type, 'Importing', () => {
			page.editSelection(type, { description: toggleIgnore(type) ? 'Not importing' : 'Importing' }).refresh();
		});
	});

	page.addSpacer();

	page.addSelection('Finish', 'Import items', () => {
		page.close('stop');
		startImport(backup, page.editingMessage, server);
	});

	page.addSpacer();

	page.display();

	function toggleIgnore(name) {
		var indexOf = backup.ignore.indexOf(name);

		if (indexOf == -1) backup.ignore.push(name);
		else backup.ignore.splice(indexOf, 1);

		return indexOf == -1;
	}
}

function startImport(backup: Backup, message: Discord.Message, server: DiscordServer) {
	backup.ignore.forEach(i => backup.items.splice(backup.items.indexOf(i), 1));

	var items: Compiled = JSON.parse(backup.json);

	var tempRoleIdToActual: { [str: string]: Discord.Role } = {};

	const guild = message.guild;


	asdf([
		// Roles
		function(next) {
			if (items.roles != null) {
				var created = 0;
				items.roles.forEach(r => {
					guild.createRole({
						name: r.name,
						color: r.color,
						hoist: r.hoist,
						position: r.position,
						permissions: null,//r.permissions,
						mentionable: r.mentionable
					})
					.then(r => {
						tempRoleIdToActual[r.id] =  r;
						created++;

						if (created == items.roles.length) next();
					})
					.catch(e => {
						console.error(e);
						created++;

						if (created == items.roles.length) next();
					})
				});
			} else next();
		},
		// Channels
		function(next) {
			if (items.channels != null) {
				createChannels(items.channels);
			} else next();

			function createChannels(channels: CompiledChannel[]) {
				var created = 0;

				channels.forEach(c => {
					guild.createChannel(c.name)
					.then(_ => {
						//TODO: temp save channel name. (ignored channels)
						createChannels(c.children);

						created++;
						if (created == items.channels.length && c.children != null) next();
					})
					.catch(e => {
						console.error(e);
						created++;
						if (created == items.channels.length && c.children != null) next();
					})
				});
			}
		},
		// Overview
		function(next) {
			var overview = items.overview;
			if (overview != null) {
				guild.setName(overview.server_name).catch(e => console.error(e));
				// guild.setIcon(overview.server_image);
				guild.setRegion(overview.server_region).catch(e => console.error(e));
				guild.setAFKChannel(overview.afk_channel).catch(e => console.error(e));
				guild.setAFKTimeout(overview.afk_timeout).catch(e => console.error(e));
				guild.setSystemChannel(overview.new_member_channel).catch(e => console.error(e));

				// notification_settings: Discord.MessageNotifications;
			}

			next();
		},
		// Moderation
		function(next) {
			if (items.moderation != null) {
				guild.setVerificationLevel(items.moderation.verification).catch(e => console.error(e));
				guild.setExcplicitContentFilter(items.moderation.content_filter).catch(e => console.error(e));
			}

			next();
		},
		// Emoji
		function(next) {
			if (items.emojis != null) {
				items.emojis.forEach(emoji => {
					// guild.createEmoji
				});
			}

			next();
		},
		// Bans
		function(next) {
			if (items.bans != null) {
				var count = 0;
				items.bans.forEach(b => {
					guild.ban(b)
					.then(b => {
						count++;
						if (items.bans.length == count) next();
					})
					.catch(e => {
						console.error(e);
						count++;
						if (items.bans.length == count) next();
					});
				});
			}
		},
		// Phrases
		function(next) {
			if (items.phrases != null) {
				var count = 0;

				items.phrases.forEach(p => {
					server.createPhrase(guild.owner, p.phrases, phrase => {
						server.setPhraseIgnoreCase(phrase.pid, p.ignoreCase);
						server.setPhraseResponse(phrase.pid, p.responses);
						
						count++;

						if (count == items.intervals.length) next();
					});
				});
			} else next();
		},
		// Commands
		function(next) {
			if (items.commands != null) {
				var count = 0;

				items.commands.forEach(c => {
					server.createCommand(guild.owner, c.alias, c.params, (added) => {
						count++;
						if (items.commands.length == count) next();
					});
				});
			} else next();
		},
		// Everything else.
		function(next) {
			if (items.alias != null) {
				items.alias.forEach(a => server.createAlias(a.alias, a.command));
			}

			if (items.blacklists != null) {
				items.blacklists.forEach(b => server.blacklist(b));
			}

			if (items.disabled_custom_comm != null) {
				// items.disabled_custom_comm.forEach(c => server);
			}

			if (items.disabled_default_comm != null) {
				//items.disabled_default_comm.forEach(c => server);
			}

			if (items.ignored_channels != null) {
				items.ignored_channels.forEach(c => server.ignore('channel', c));
			}

			if (items.ignored_users != null) {
				items.ignored_users.forEach(c => server.ignore('member', c));
			}

			if (items.perms != null) {
				var perms = items.perms;
				// TODO: Add groups

				for(var id in perms.groups) {
					var group = perms.groups[id];
					var roleClazz = tempRoleIdToActual[id];

					if (roleClazz != null) {
						group.perms.forEach(p => server.addPermTo('groups', roleClazz.id, p));
					} else {
						// 
					}

					// group.groups.forEach(p => server.addGroupTo('groups', id, p));
				}

				for(var id in perms.roles) {
					var role = perms.roles[id];
					role.perms.forEach(p => server.addPermTo('roles', id, p));
					role.groups.forEach(p => server.addGroupTo('roles', id, p));
				}

				for(var id in perms.users) {
					var user = perms.users[id];
					user.perms.forEach(p => server.addPermTo('users', id, p));
					user.groups.forEach(p => server.addGroupTo('users', id, p));
				}
			}

			if (items.intervals != null) {
				items.intervals.forEach(i => {
					server.createInterval({
						server_id: guild.id,
					
						displayName: i.displayName,
						message: i.message,
						active: false,
					
						every: i.every,
						nextCall: i.nextCall,
						events: i.events
					});
				});
			}

			if (items.prefix != null) {
				server.commandPrefix = items.prefix;
			}

			if (items.ranks != null) {
				items.ranks.forEach(r => server.addRank(r));
			}

			next();
		}
	], function() {
		server.save(() => {
			// 
		});
	});
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
	name: string;
	type: string;
	perms: object;
	position: number;

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

	blacklists?: string[];
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