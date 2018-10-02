import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import async = require('async');

import Command = require('../../command');

import discordClient = require('../../../client');
import guildClient = require('../../../guildClient');


import TempPunishments = require('../../../models/temp_punishments');
import Punishments = require('../../../models/punishments');

//! Option to track manual bans (right click -> ban/kick)
//! Have different punishments for different things.
// Ex: Punishment 1. 1st: warn, 2nd: mute 1d, 3rd: mute 7d, 4th+: 3rd

// Ex: !punish @user <punishment #> <reason>
// Ex: !blacklist add crap <censor/punishment/remove>

//! Figure out how to store punishments in DB for different punishment reasons.


const DEFAULT_OVERWRITE_PERMS: Discord.PermissionObject = {
	CREATE_INSTANT_INVITE: false,
	SEND_MESSAGES: false,
	SEND_TTS_MESSAGES: false,
	MANAGE_MESSAGES: false,
	CHANGE_NICKNAME: false,
	MANAGE_NICKNAMES: false,
	ATTACH_FILES: false,
	SPEAK: false,
};


const PERMS = {
	MAIN: 'commands.punishment',
	LIST: 'list',
	// CREATE: 'create',
	REMOVE: 'remove',
	CLEAR: 'clear',
	// INFO: 'info',
	// EDIT: 'edit',
	SETTINGS: 'settings'
};


const DOCUMENTATION: DiscordBot.CommandDoc = {
	title: 'Punishments',
	permission: 'punishment',
	description: 'Create punishments for warns/mutes/blacklisted words/etc..',
	categories: [ 'moderation', 'punish', 'chat' ],
	alias: [ 'punishment', 'punishments' ],
	items: [
		{
			name: 'List',
			permission: PERMS.LIST,
			description: 'List punishment stats in Guild or on User.',
			opts: [
				{
					description: 'List punishment stats for current Guild.'
				},
				{
					description: 'List punishments for User',
					items: [
						{
							name: '@User/id',
							description: 'Guild Member'
						}
					]
				}
			]
		},
		{
			name: 'Remove',
			permission: PERMS.REMOVE,
			description: 'Remove punishment from Guild Member.',
			opts: [
				{
					description: 'List punishments for User',
					items: [
						{
							name: '@User/id',
							description: 'Guild Member'
						},
						{
							name: 'id',
							description: 'Punishment ID'
						}
					]
				}
			]
		},
		{
			name: 'Clear',
			permission: PERMS.CLEAR,
			description: 'Clear all punishments from Guild Member.',
			opts: [
				{
					description: 'List punishments for User',
					items: [
						{
							name: '@User/id',
							description: 'Guild Member'
						}
					]
				}
			]
		}
	]
};



for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Punishment extends Command {
	constructor() {
		super(DOCUMENTATION.alias);

		this.description = DOCUMENTATION.description;

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[
					'Punishments',
					[
						'list [@user/id]',
						'info <@user/id> <punishemnt id>',
						'remove <@user/id> <punishemnt id>',
						// 'edit <@user/id> <punishemnt id>',
						'clear <@user/id>',
						// 'create',
						'settings'
					].join('\n')
				]
			]);
		}

		switch(params.shift().toLowerCase()) {
			case 'list':
				if (!server.userHasPerm(message.member, PERMS.LIST)) return false;

				if (params.length == 0) {
					return Command.error([['Punishments', 'Please provide @user/id for now.']]);
				}

				var user_str = params.shift();

				var type_user = server.idType(user_str);

				if (type_user != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				var user_id = server.strpToId(user_str);

				if (!message.guild.members.has(user_id)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				message.channel.send('Grabbing that for you. Please wait...')
				.then((msg: Discord.Message) => {
					Punishments.find({ server_id: message.guild.id, member_id: user_id }, (err, items) => {
						if (err != null) return console.error(err);

						msg.edit(Command.table(
							[ 'ID', 'Type', 'Issued (YY/MM/DD)', 'Length', 'Punished By', 'Reason' ],
							items.map(i => [
								i['uid'],
								i['type'],
								toDateTime(i['created_at']),
								secondsToTime(i['length']),
								punisherToName(i['creator_id']),
								i['reason'].slice(0, 40)
							])
						));

						function punisherToName(name: string) {
							var user = discordClient.users.get(name);
							return user == null ? name : `${user.username}#${user.discriminator}`;
						}
					});
				})
				.catch(e => console.error(e));
				break;
			// case 'info':
			// 	break;
			// case 'create':
			// 	break;
			case 'remove':
				if (!server.userHasPerm(message.member, PERMS.REMOVE)) return false;

				var user_str = params.shift();

				var type_user = server.idType(user_str);

				if (type_user != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				var user_id = server.strpToId(user_str);

				if (!message.guild.members.has(user_id)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				var pun_id = params.shift();

				Punishments.remove({ server_id: message.guild.id, member_id: user_id, pid: pun_id }).exec();

				message.channel.send('Removed Punishment on user.')
				.catch(e => console.error(e));
				break;
			case 'clear':
				if (!server.userHasPerm(message.member, PERMS.CLEAR)) return false;

				var user_str = params.shift();

				var type_user = server.idType(user_str);

				if (type_user != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				var user_id = server.strpToId(user_str);

				if (!message.guild.members.has(user_id)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				Punishments.remove({ server_id: message.guild.id, member_id: user_id }).exec();

				message.channel.send('Cleared Punishments for user.')
				.catch(e => console.error(e));
				break;
			// case 'edit':
			// 	break;
			case 'settings':
				if (!server.userHasPerm(message.member, PERMS.SETTINGS)) return false;

				if (params.length == 0) {
					// Paged
					return Command.error([['Punishment', 'Paged settings goes here.']]);
				} else {
					var type = params.shift().toLowerCase();

					if (type == 'punished_role') {
						if (params.length == 0) {
							message.guild.createRole({
								name: 'Punished',
								color: '#b32626'
							})
							.then(role => {
								if (server.punishments.punished_role_id != null && server.punishments.punished_role_id != role.id) {
									// TODO
								}

								server.punishments.punished_role_id = role.id;
								server.save();

								message.guild.channels
								.forEach(channel => {
									channel.overwritePermissions(role, DEFAULT_OVERWRITE_PERMS)
									.catch(e => console.error(e));
								});

								message.channel.send(Command.success([['Punishment', 'Changed Punishment Role']]));
							})
							.catch(e => console.error(e));
						} else {
							return Command.error([['Punishment', 'Cannot manually set Punished Role as of yet.']]);
							// var str_id = params.shift();

							// var id_type = server.idType(str_id);
							// if (id_type != null && id_type != 'role') return Command.error([['Punishment', 'ID is not a role.']]);

							// var id = server.strpToId(str_id);
							// if (!message.guild.roles.has(id)) return Command.error([['Punishment', 'The Role does not exist in this guild']]);

							// if (server.punishments.punished_role_id != null && server.punishments.punished_role_id != id) {
							// 	// TODO
							// }

							// server.punishments.punished_role_id = id;
							// server.save();

							// return Command.success([['Punishment', 'Changed Punishment Role']]);
						}
					}
				}
				break;
		}
	}

	public onChannelCreate(channel: Discord.GuildChannel, server?: DiscordServer) {
		if (server.punishments.punished_role_id != null) {
			var role = channel.guild.roles.get(server.punishments.punished_role_id);
			channel.overwritePermissions(role, DEFAULT_OVERWRITE_PERMS)
			.catch(e => console.error(e));
			return true;
		}
		return false;
	}

	public onGuildRemove(guild: Discord.Guild) {
		TempPunishments.remove({ server_id: guild.id }).exec();
		return true;
	}

	public onGuildMemberRemove(member: Discord.GuildMember) {
		TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
		return true;
	}

	public onRoleDelete(role: Discord.Role, server: DiscordServer) {
		if (server.punishments != null && server.punishments.punished_role_id != null) {
			if (role.id == server.punishments.punished_role_id) {
				TempPunishments.remove({ server_id: role.guild.id }).exec();
				server.punishments.punished_role_id = null;
				server.save();
				return true;
			}
		}
		return false;
	}

	public onGuildMemberRoleRemove(member: Discord.GuildMember, roles: Discord.Role[], server: DiscordServer) {
		if (server.punishments != null && server.punishments.punished_role_id != null) {
			for (var i = 0 ; i < roles.length; i++) {
				if (roles[i].id == server.punishments.punished_role_id) {
					TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
					return true;
				}
			}
		}
		return false;
	}

	static documentation: DiscordBot.CommandDoc = DOCUMENTATION;
}


setInterval(() => {
	TempPunishments.find({ expires: { $lte: Date.now() } })
	// .populate('punishment')
	.exec((err, items) => {
		if (err != null) return console.error(err);

		async.everyLimit(items, 5, (item, cb) => {
			const guild = discordClient.guilds.get(item['server_id']);
			if (guild == null) {
				console.log('No guild exists: ' + item['server_id']);
				return cb();
			}

			const member = guild.members.get(item['member_id']);
			if (member == null) {
				console.log('No member exists: ' + item['member_id']);
				return cb();
			}

			item.remove(() => {
				guildClient.get(guild.id, client => {
					if (client == null) {
						console.log('No Redis Client exists');
						return cb();
					}

					member.removeRole(client.punishments.punished_role_id, 'Expired')
					.catch(e => console.error(e));

					cb();
				});
			});


		}, () => {
			if (items.length != 0) console.log('Finished expired punishments (' + items.length + ' count)');
		});
	});
}, 1000 * 60 * 2);

function toDateTime(date: Date): string {
	// 2018/09/07 00:00 GMT-0000
	var month = date.getUTCMonth() < 10 ? '0' + date.getUTCMonth() : date.getUTCMonth();
	var day = date.getUTCDate() < 10 ? '0' + date.getUTCDate() : date.getUTCDate();
	var hours = date.getUTCHours() < 10 ? '0' + date.getUTCHours() : date.getUTCHours();
	var minutes = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();

	return `${date.getUTCFullYear()}/${month}/${day} ${hours}:${minutes} UTC`;
}

function secondsToTime(seconds: number): string {
	var items = [];

	var sec = (seconds % 60);
	if (sec != 0) items.push(sec + 's');

	var min = Math.floor(seconds/60 % 60);
	if (min != 0) items.push(min + 'm');

	var hour = Math.floor(seconds/60/60);
	if (hour != 0) items.push(hour + 'h');

	return items.reverse().join(' ');
}

export = Punishment;