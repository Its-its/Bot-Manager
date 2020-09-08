import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import async = require('async');

import Command = require('../../command');

import discordClient = require('../../../client');
import guildClient = require('../../../guildClient');


import TempPunishments = require('../../../models/temp_punishments');
import Punishments = require('../../../models/punishments');
import { DiscordBot } from '@type-manager';
import utils = require('@discord/utils');

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
	KICK_MEMBERS: false,
	BAN_MEMBERS: false,
	ADMINISTRATOR: false,
	MANAGE_CHANNELS: false,
	MANAGE_GUILD: false,
	ADD_REACTIONS: false,
	VIEW_AUDIT_LOG: false,
	PRIORITY_SPEAKER: false,
	STREAM: false,
	VIEW_CHANNEL: false,
	EMBED_LINKS: false,
	READ_MESSAGE_HISTORY: false,
	MENTION_EVERYONE: false,
	USE_EXTERNAL_EMOJIS: false,
	VIEW_GUILD_INSIGHTS: false,
	CONNECT: false,
	MUTE_MEMBERS: false,
	DEAFEN_MEMBERS: false,
	MOVE_MEMBERS: false,
	USE_VAD: false,
	MANAGE_ROLES: false,
	MANAGE_WEBHOOKS: false,
	MANAGE_EMOJIS: false
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



for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Punishment extends Command {
	constructor() {
		super(DOCUMENTATION.alias);

		this.description = DOCUMENTATION.description;

		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
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
						'settings',
						'settings punished_role <auto/@role/role id>'
					].join('\n')
				]
			]);
		}

		switch(params.shift()!.toLowerCase()) {
			case 'list': {
				if (!server.userHasPerm(message.member!, PERMS.LIST)) return Command.noPermsMessage('Punishments');

				if (params.length == 0) {
					return Command.error([['Punishments', 'Please provide @user/id for now.']]);
				}

				let userIdStr = params.shift();
				if (userIdStr == null) return Command.error([['Punishments', 'Invalid Params']]);

				let idType = server.idType(userIdStr);
				if (idType != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				let userId = server.strpToId(userIdStr);
				if (userId == null) return Command.error([['Punishments', 'Invalid User ID']]);

				if (!message.guild!.members.cache.has(userId)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				let singleMsg = await message.channel.send('Grabbing that for you. Please wait...');

				let items = await Punishments.find({ server_id: message.guild!.id, member_id: userId! });

				await singleMsg.edit(Command.table(
					[ 'ID', 'Type', 'Issued (YY/MM/DD)', 'Length', 'Punished By', 'Reason' ],
					items.map(i => [
						i.pid,
						i.type,
						toDateTime(i.created_at),
						secondsToTime(i.length),
						punisherToName(i.creator_id),
						i.reason.slice(0, 40)
					])
				));

				break;
			}

			// case 'info':
			// 	break;
			// case 'create':
			// 	break;
			case 'remove': {
				if (!server.userHasPerm(message.member!, PERMS.REMOVE)) return Command.noPermsMessage('Punishments');

				let userIdStr = params.shift();
				if (userIdStr == null) return Command.error([['Punishments', 'Invalid Perms']]);

				let idType = server.idType(userIdStr);
				if (idType != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				let userId = server.strpToId(userIdStr);
				if (userId == null) return Command.error([['Punishments', 'Invalid User ID']]);

				if (!message.guild!.members.cache.has(userId)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				let punishmentId = params.shift();

				await Punishments.remove({ server_id: message.guild!.id, member_id: userId, pid: punishmentId }).exec();

				await message.channel.send('Removed Punishment on user.');

				break;
			}

			case 'clear': {
				if (!server.userHasPerm(message.member!, PERMS.CLEAR)) return Command.noPermsMessage('Punishments');

				let userIdStr = params.shift();
				if (userIdStr == null) return Command.error([['Punishments', 'Invalid Perms']]);

				let idType = server.idType(userIdStr);
				if (idType != 'member') return Command.error([[ 'Punishments', 'Invalid args. Please refer to mute help.' ]]);

				let userId = server.strpToId(userIdStr);
				if (userId == null) return Command.error([['Punishments', 'Invalid User ID']]);

				if (!message.guild!.members.cache.has(userId)) return Command.error([[ 'Punishments', 'Member does not exist in Guild.' ]]);

				await Punishments.remove({ server_id: message.guild!.id, member_id: userId }).exec();

				await message.channel.send('Cleared Punishments for user.');

				break;
			}

			// case 'edit':
			// 	break;
			case 'settings': {
				if (!server.userHasPerm(message.member!, PERMS.SETTINGS)) return Command.noPermsMessage('Punishments');

				if (params.length == 0) {
					// Paged
					return Command.error([['Punishment', 'Paged settings goes here.']]);
				} else {
					if (params.length == 0) return Command.error([['Punishment', 'Invalid Params']]);

					let type = params.shift()!.toLowerCase();

					if (type == 'punished_role') {
						if (params.length == 0) {
							return Command.info([['Punishment', `Role ID: ${server.punishments.punished_role_id == null ? 'None' : '<@' + server.punishments.punished_role_id + '>'}`]]);
						}

						let punishDoType = params.shift();

						if (punishDoType == null) return Command.error([['Punishment', 'Invalid Params']]);

						if (punishDoType == 'auto') {
							let role = await message.guild!.roles.create({
								data: {
									name: 'Punished',
									color: '#b32626'
								},
								reason: 'Creating Punishment Role'
							});

							server.punishments.punished_role_id = role.id;

							await server.save();

							let channels = message.guild!.channels.cache.array();

							for (let i = 0; i < channels.length; i++) {
								let channel = channels[i];

								await channel.createOverwrite(role, DEFAULT_OVERWRITE_PERMS);
								await utils.asyncTimeout(200);
							}

							await message.channel.send(Command.success([['Punishment', 'Changed Punishment Role']]));
						} else {
							let roleIdType = server.idType(punishDoType);
							if (roleIdType != null && roleIdType != 'role') return Command.error([['Punishment', 'ID is not a role.']]);

							let roleId = server.strpToId(punishDoType);
							if (roleId == null) return Command.error([['Punishment', 'Invalid ID']]);

							if (!message.guild!.roles.cache.has(roleId)) return Command.error([['Punishment', 'The Role does not exist in this guild']]);

							if (server.punishments.punished_role_id != null && server.punishments.punished_role_id == roleId) {
								return Command.error([['Punishment', 'Punishment role ID already set as that ID.']]);
							}

							server.punishments.punished_role_id = roleId;

							await server.save();

							return Command.success([['Punishment', 'Changed Punishment Role']]);
						}
					}
				}

				break;
			}
		}

		return Promise.resolve();
	}

	public async onChannelCreate(channel: Discord.GuildChannel, server: DiscordServer) {
		if (server.punishments.punished_role_id != null) {
			let role = channel.guild.roles.cache.get(server.punishments.punished_role_id);
			if (role == null) return false;

			await channel.createOverwrite(role, DEFAULT_OVERWRITE_PERMS);

			return true;
		}

		return false;
	}

	public async onGuildRemove(guild: Discord.Guild) {
		await TempPunishments.remove({ server_id: guild.id }).exec();
		return true;
	}

	public async onGuildMemberRemove(member: Discord.GuildMember) {
		await TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
		return true;
	}

	public async onGuildMemberAdd(member: Discord.GuildMember, server: DiscordServer) {
		let punishment = await TempPunishments.findOne({ server_id: member.guild.id, member_id: member.id });

		if (punishment != null && server.punishments.punished_role_id != null) {
			await member.roles.add(server.punishments.punished_role_id, 'Re-added punishment role.');
		}

		return true;
	}

	public async onRoleDelete(role: Discord.Role, server: DiscordServer) {
		if (server.punishments != null && server.punishments.punished_role_id != null) {
			if (role.id == server.punishments.punished_role_id) {
				await TempPunishments.remove({ server_id: role.guild.id }).exec();

				server.punishments.punished_role_id = undefined;
				await server.save();

				return true;
			}
		}
		return false;
	}

	public async onGuildMemberRoleRemove(member: Discord.GuildMember, roles: Discord.Role[], server: DiscordServer) {
		if (server.punishments != null && server.punishments.punished_role_id != null) {
			for (let i = 0 ; i < roles.length; i++) {
				if (roles[i].id == server.punishments.punished_role_id) {
					await TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
					return true;
				}
			}
		}
		return false;
	}

	static documentation: DiscordBot.CommandDoc = DOCUMENTATION;
}


setInterval(utils.asyncFnWrapper(async () => {
	let items = await TempPunishments.find({ expires: { $lte: new Date() } })
		// .populate('punishment')
		.exec();

	async.everyLimit(items, 5, utils.asyncFnWrapper(async (item, cb) => {
		let guild = discordClient.guilds.cache.get(item.server_id);

		if (guild == null) {
			console.log('No guild exists: ' + item.server_id);
			return cb();
		}


		let member = guild.members.cache.get(item.member_id);

		if (member == null) {
			console.log('No member exists: ' + item.member_id);
			return cb();
		}


		await item.remove();

		let client = await guildClient.get(guild.id);

		if (client == null) {
			console.log('No Redis Client exists');
			return cb();
		}


		if (client.punishments.punished_role_id == null) return cb();


		await member.roles.remove(client.punishments.punished_role_id, 'Expired');

		return cb();
	}, async (async_err, _, cb) => {
		console.error(async_err);
		return cb();
	}), () => {
		if (items.length != 0) console.log('Finished expired punishments (' + items.length + ' count)');
	});
}), 1000 * 60 * 2);


function punisherToName(name: string) {
	let user = discordClient.users.cache.get(name);
	return user == null ? name : `${user.username}#${user.discriminator}`;
}

function toDateTime(date: Date): string {
	// 2018/09/07 00:00 GMT-0000
	let month = date.getUTCMonth() < 10 ? '0' + date.getUTCMonth() : date.getUTCMonth();
	let day = date.getUTCDate() < 10 ? '0' + date.getUTCDate() : date.getUTCDate();
	let hours = date.getUTCHours() < 10 ? '0' + date.getUTCHours() : date.getUTCHours();
	let minutes = date.getUTCMinutes() < 10 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();

	return `${date.getUTCFullYear()}/${month}/${day} ${hours}:${minutes} UTC`;
}

function secondsToTime(seconds: number): string {
	let items = [];

	let sec = (seconds % 60);
	if (sec != 0) items.push(sec + 's');

	let min = Math.floor(seconds/60 % 60);
	if (min != 0) items.push(min + 'm');

	let hour = Math.floor(seconds/60/60);
	if (hour != 0) items.push(hour + 'h');

	return items.reverse().join(' ');
}

export = Punishment;