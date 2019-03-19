import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

import utils = require('../../../utils');

const PERMS = {
	MAIN: 'commands.info',
	MEMBER: 'member'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Info extends Command {
	constructor() {
		super('info', false, false);

		this.perms = Object.values(PERMS);
		this.description = 'Shows information about a guild member.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[
					'Info',
					'info <@user>'
				]
			]);
		}

		var discordId = params.shift();
		var idType = utils.getIdType(discordId);

		discordId = utils.strpToId(discordId);

		if (idType == null) return Command.error([[ 'Info', 'Unknown type' ]]);

		switch(idType) {
			case 'member':
				if (!this.hasPerms(message.member, server, PERMS.MEMBER)) return Command.noPermsMessage('Info');

				var guildMember = message.guild.members.get(discordId);
				if (guildMember == null) return Command.error([[ 'Info', 'Member not in Guild!' ]]);

				var roles = guildMember.roles.array()
				.filter(r => r.name != '@everyone')
				.map(r => r.name)
				.join(', ');

				if (roles.length == 0) roles = 'None';

				return {
					type: 'echo',
					embed: {
						color: Command.InfoColor,
						author: {
							name: guildMember.user.tag,
							icon_url: guildMember.user.displayAvatarURL
						},
						thumbnail: {
							url: guildMember.user.displayAvatarURL
						},
						fields: [
							{
								name: 'ID',
								value: guildMember.user.id,
								inline: true
							},
							{
								name: 'Status',
								value: guildMember.presence.status,
								inline: true
							},
							{
								name: 'Nickname',
								value: guildMember.nickname || 'None',
								inline: true
							},
							{
								name: 'Game',
								value: guildMember.presence.game == null ? 'None' : guildMember.presence.game.name,
								inline: true
							},
							{
								name: 'Joined',
								value: guildMember.joinedAt.toDateString(),
								inline: true
							},
							{
								name: 'Registered',
								value: guildMember.user.createdAt.toDateString(),
								inline: true
							},
							{
								name: 'Roles',
								value: roles
							},
							// {
							// 	name: 'Permissions',
							// 	value: member.permissions
							// }
						]
					}
				};

			case 'role': break;
			case 'channel': break;
		}
	}
}

export = Info;