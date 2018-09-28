import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

import utils = require('../../../utils');

const PERMS = {
	MAIN: 'commands.info'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');

class Info extends Command {
	constructor() {
		super('info', false, false);

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[
					'Info',
					'info'
				]
			]);
		}

		// TODO: Finish

		var id = params.shift();
		var type = utils.getIdType(id);
		id = utils.strpToId(id);

		if (type == null) return Command.error([[ 'Info', 'Unknown type' ]]);

		switch(type) {
			case 'member':
				var member = message.guild.members.get(id);
				if (member == null) return Command.error([[ 'Info', 'Member not in Guild!' ]]);

				var roles = member.roles.array()
				.filter(r => r.name != '@everyone')
				.map(r => r.name)
				.join(', ');

				if (roles.length == 0) roles = 'None';

				return {
					type: 'echo',
					embed: {
						color: Command.InfoColor,
						author: {
							name: member.user.tag,
							icon_url: member.user.displayAvatarURL
						},
						thumbnail: {
							url: member.user.displayAvatarURL
						},
						fields: [
							{
								name: 'ID',
								value: member.user.id,
								inline: true
							},
							{
								name: 'Status',
								value: member.presence.status,
								inline: true
							},
							{
								name: 'Nickname',
								value: member.nickname || 'None',
								inline: true
							},
							{
								name: 'Game',
								value: member.presence.game == null ? 'None' : member.presence.game.name,
								inline: true
							},
							{
								name: 'Joined',
								value: member.joinedAt.toDateString(),
								inline: true
							},
							{
								name: 'Registered',
								value: member.user.createdAt.toDateString(),
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