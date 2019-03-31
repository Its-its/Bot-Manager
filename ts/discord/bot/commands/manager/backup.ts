import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Backups = require('../../../models/backup');

import Command = require('../../command');
import { DiscordBot, Omit } from '@type-manager';

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

class Backup extends Command {
	constructor() {
		super('backup');

		this.description = 'Save the discord server so you can restore it to an empty one.';

		this.perms = Object.values(PERMISSIONS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			Backups.find({ server_id: server.serverId }, (err, backups: any[]) => {
				message.channel.send(Command.info([
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
			});

			return;
		}

		if (params[0] == 'remove') {
			if (params[1] == null) return Command.error([['Backup', 'Invalid usage.']]);

			Backups.findOneAndRemove({ server_id: server.serverId, pid: params[1] }, (err, item: any) => {
				message.channel.send(Command.info([
					[
						'Backup',
						item == null ? 'Item with said ID does not exist.' : 'Successfully removed item.'
					]
				]));
			});
			return;
		}

		if (params[0] == 'list') {
			if (params[1] == null) params[1] = server.serverId;

			Backups.find({ server_id: params[1] }, (err, backups: any[]) => {
				message.channel.send(Command.info([
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
			});

			return;
		}


		Backups.count({ server_id: server.serverId }, (err, count) => {
			if (err != null) return console.error(err);

			if (count >= 5) {
				return message.channel.send(Command.info([['Backup', 'Max Backups created. If you would like to make a new one, delete an existing one.']]));
			}

			// TODO: Page: Show what will not be backed up. Confirm/Exit.

			createNewBackup();
		});

		function isBackingUp(item: ITEMS) {
			return params.indexOf(item) != -1;
		}

		function createNewBackup() {
			var hasAll = isBackingUp('all');

			if (hasAll || params[0][0] == '-') {
				if (hasAll) params.splice(params.indexOf('all'), 1);

				var removeList = params;
				params = items;

				for(var i = 0; i < removeList.length; i++) {
					var remove = removeList[i];

					if (remove[0] == '-') {
						var index = params.indexOf(remove.slice(1));
						if (index != -1) params.splice(index, 1);
						else return message.channel.send(Command.error([['Backup', 'Invalid item to remove "' + remove.slice(1) + '"']]));
					} else return message.channel.send(Command.error([['Backup', 'Invalid backup usage.']]));
				}
			}


			var compiled: Compiled = {};

			const guild = message.guild;


			if (!isBackingUp('roles')) {
				var sending = [];

				if (isBackingUp('perms')) sending.push('Cannot save role perms if roles aren\'t saved. (FOR NOW)');
				if (isBackingUp('ranks')) {
					params.splice(params.indexOf('ranks'), 1);
					sending.push('Cannot save ranks if roles aren\'t saved. (FOR NOW)');
				}

				if (sending.length != 0) {
					message.channel.send(Command.info([[ 'Backup', sending.join('\n') ]]))
					.then(msg => run(Array.isArray(msg) ? msg[0] : msg))
					.catch(e => console.error(e));

					return;
				}
			}


			run();

			function run(lastMessage?: Discord.Message) {
				asdf([
					// Guild
					function(next) {
						// Required for: perms.roles, ranks
						if (isBackingUp('roles')) {
							compiled['roles'] = guild.roles.filter(r => !r.managed).map(r => {

								return {
									id: r.id,

									position: r.position,
									name: r.name,
									color: r.color,
									hoist: r.hoist,
									mentionable: r.mentionable,
									permissions: r.permissions,
									editable: r.editable
								};
							});
						}

						// Required for: overview.afk_channel, overview.new_member_channel
						// TODO: Proper order.
						if (isBackingUp('channels')) {
							compiled['channels'] = guild.channels.filter(c => c.parent == null).map(c => parseChannel(c));

							function parseChannel(channel: Discord.GuildChannel): DiscordBot.BackupChannel {

								var opt: DiscordBot.BackupChannel = {
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
								server_image: guild.icon,
								server_name: guild.name,
								server_region: guild.region,
								afk_channel: guild.afkChannelID == null ? undefined : guild.afkChannelID,
								afk_timeout: guild.afkTimeout,
								new_member_channel: guild.systemChannelID == null ? undefined : guild.systemChannelID,
								notification_settings: guild.messageNotifications
							};
						}

						if (isBackingUp('moderation')) {
							compiled['moderation'] = {
								verification: guild.verificationLevel,
								content_filter: guild.explicitContentFilter
							};
						}

						if (isBackingUp('emojis')) {
							compiled['emojis'] = guild.emojis.filter(r => !r.managed).map(e => {
								return {
									name: e.name,
									animated: e.animated,
									requiresColons: e.requiresColons,
									image: e.url,
									roles: e.roles.map(r => r.id)
								};
							});
						}

						if (isBackingUp('bans')) {
							guild.fetchBans()
							.then(bans => {
								compiled['bans'] = bans.keyArray();
								next();
							});
						} else next();
					},
					// Custom
					function(next) {
						if (isBackingUp('commands')) {
							compiled['commands'] = server.commands.map(c => { return { alias: c.alias, params: c.params }; });
						}

						if (isBackingUp('intervals')) {
							compiled['intervals'] = server.intervals.map(i => {
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
							compiled['phrases'] = server.phrases.map(p => {
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
							var perms = compiled['perms'] = server.permissions;

							if (!isBackingUp('roles')) delete perms['roles'];
						}

						if (isBackingUp('prefix')) compiled['prefix'] = server.commandPrefix;

						if (isBackingUp('ranks') && isBackingUp('roles')) {
							compiled['ranks'] = server.ranks;
						}

						if (isBackingUp('alias')) compiled['alias'] = server.alias.map(a => { return { command: a.command, alias: a.alias }; });

						next();
					},
				],
				// Finish
				function() {
					new Backups({
						version: 1,
						server_id: server.serverId,
						pid: uniqueID(8),
						items: params,
						json: JSON.stringify(compiled),
						created_at: Date.now()
					}).save();

					var toSend = Command.success([
						[
							'Backup',
							'Completed.'
						]
					]);

					if (lastMessage != null) {
						lastMessage.edit(toSend)
						.catch(e => console.error(e));
					} else {
						message.channel.send(toSend)
						.catch(e => console.error(e));
					}

					console.log(JSON.stringify(compiled, null, 2));
				});
			}
		}
	}
}


function asdf(items: ((cb: () => any) => any)[], finish: () => any) {
	var pos = 0;

	next();

	function next() {
		if (pos >= items.length) return finish();
		items[pos++](() => next());
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
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

export = Backup;