import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import async = require('async');

import Command = require('../../command');

import discordClient = require('../../clients/discord');
import guildClient = require('../../guildClient');


import TempPunishments = require('../../models/temp_punishments');

//! Option to track manual bans (right click -> ban/kick)
//! Have different punishments for different things.
// Ex: Punishment 1. 1st: warn, 2nd: mute 1d, 3rd: mute 7d, 4th+: 3rd

// Ex: !punish @user <punishment #> <reason>
// Ex: !blacklist add crap <censor/punishment/remove>

//! Figure out how to store punishments in DB for different punishment reasons.


const PERMS = {
	MAIN: 'commands.punishment',
	LIST: 'list',
	ADD: 'add',
	REMOVE: 'remove',
	EDIT: 'edit'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Punishment extends Command {
	constructor() {
		super(['punishment', 'punishments']);

		this.description = 'Create punishments for warns/mutes/blacklisted words/etc..';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[
					'Punishments',
					[
						'list',
						'create',
						'remove <id>',
						'info <id>',
						'edit <id>'
					].join('\n')
				]
			]);
		}

		switch(params.shift().toLowerCase()) {
			case 'list': break;
			case 'info': break;
			case 'create': break;
			case 'remove': break;
			case 'edit': break;
		}
	}

	public onGuildRemove(guild: Discord.Guild, server?: DiscordServer) {
		TempPunishments.remove({ server_id: guild.id }).exec();
		return true;
	}

	public onGuildMemberRemove(member: Discord.GuildMember) {
		TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
		return true;
	}

	public onRoleDelete(role: Discord.Role, server: DiscordServer) {
		if (server.punishments != null && server.punishments.role_mute_id != null) {
			if (role.id == server.punishments.role_mute_id) {
				TempPunishments.remove({ server_id: role.guild.id }).exec();
				server.punishments.role_mute_id = null;
				server.save();
				return true;
			}
		}
		return false;
	}

	public onGuildMemberRoleRemove(member: Discord.GuildMember, roles: Discord.Role[], server: DiscordServer) {
		if (server.punishments != null && server.punishments.role_mute_id != null) {
			for (var i = 0 ; i < roles.length; i++) {
				if (roles[i].id == server.punishments.role_mute_id) {
					TempPunishments.remove({ server_id: member.guild.id, member_id: member.id }).exec();
					return true;
				}
			}
		}
		return false;
	}
}


setInterval(() => {
	TempPunishments.find({ expires: { $lte: Date.now() } })
	// .populate('punishment')
	.exec((err, items) => {
		if (err != null) return console.error(err);

		async.everyLimit(items, 5, (item, cb) => {
			const guild = discordClient.guilds.get(item['server_id']);
			if (guild == null) {
				return cb();
			}

			const member = guild.members.get(item['member_id']);
			if (member == null) {
				return cb();
			}

			guildClient.get(guild.id, client => {
				if (client == null) {
					return cb();
				}

				member.removeRole(client.punishments.role_mute_id, 'Expired')
				.catch(e => console.error(e));

				cb();
			});

			item.remove();
		}, () => {
			// console.log('Finsihed expired punishments (' + items.length + ' count)');
		});
	});
}, 1000 * 60 * 5);

export = Punishment;