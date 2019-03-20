import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import generate = require('nanoid/generate');

import Command = require('../../command');

import Punishments = require('../../../models/punishments');


const PERMS = {
	MAIN: 'commands.warn'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Warn extends Command {
	constructor() {
		super('warn');

		this.perms = Object.values(PERMS);

		this.description = 'Warn a player';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Warn',
					'@user <reason>'
				]
			]);
		}

		var userIdStr = params.shift();

		var userType = server.idType(userIdStr);

		if (userType != 'member') return Command.error([[ 'Mute', 'Invalid args. Please refer to warn help.' ]]);

		var userId = server.strpToId(userIdStr);
		var reason = params.join(' ');

		new Punishments({
			server_id: message.guild.id,
			member_id: userId,
			creator_id: message.member.id,

			pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 6),

			type: 'warn',

			reason: reason
		}).save();

		// TODO: Return punishment count, and improve stuffs.
		return Command.success([
			[
				'Mute',
				[
					'**Warned:** <@' + userId + '>',
					'**Reason:** ' + reason
				].join('\n')
			]
		]);
	}
}

export = Warn;