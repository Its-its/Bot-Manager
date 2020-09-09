import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('../../command');

import utils = require('../../../utils');

const PERMS = {
	MAIN: 'commands.info',
	MEMBER: 'member'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Info extends Command {
	constructor() {
		super('info', false, false);

		this.perms = Object.values(PERMS);
		this.description = 'Shows information about a guild member.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[
					'Info',
					'info <@user>'
				]
			]);
		}

		let discordId = params.shift();
		if (discordId == null) return Command.error([['Info', 'Invalid Params']]);

		let idType = utils.getIdType(discordId);
		if (idType == null) return Command.error([[ 'Info', 'Unknown type. Please @ or # the user, group, or channel.' ]]);

		let strippedDiscordId = utils.strpToId(discordId);
		if (strippedDiscordId == null) return Command.error([['Info', 'Invalid Params']]);


		switch(idType) {
			case 'member':
				if (!this.hasPerms(message.member!, server, PERMS.MEMBER)) return Command.noPermsMessage('Info');

				let guildMember = message.guild!.members.cache.get(strippedDiscordId);
				if (guildMember == null) return Command.error([[ 'Info', 'Member not in Guild!' ]]);

				let roles = guildMember.roles.cache.array()
				.filter(r => r.name != '@everyone')
				.map(r => r.name)
				.join(', ');

				if (roles.length == 0) roles = 'None';

				return <any>{
					type: 'echo',
					embed: {
						color: Command.InfoColor,
						author: {
							name: guildMember.user.tag,
							icon_url: guildMember.user.displayAvatarURL()
						},
						thumbnail: {
							url: guildMember.user.displayAvatarURL()
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
								name: 'Activities',
								value: guildMember.presence.activities.map(a => a.name).join('\n'),
								inline: true
							},
							{
								name: 'Joined',
								value: guildMember.joinedAt!.toDateString(),
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

		return Promise.resolve();
	}
}

export = Info;