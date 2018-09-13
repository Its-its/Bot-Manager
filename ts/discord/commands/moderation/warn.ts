import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import generate = require('nanoid/generate');

import Command = require('../../command');

import Punishments = require('../../models/punishments');


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

		this.description = '';
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

		var user_str = params.shift();

		var type_user = server.idType(user_str);

		if (type_user != 'member') return Command.error([[ 'Mute', 'Invalid args. Please refer to warn help.' ]]);

		var user_id = server.strpToId(user_str);
		var reason = params.join(' ');

		new Punishments({
			server_id: message.guild.id,
			member_id: user_id,
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
					'**Warned:** <@' + user_id + '>',
					'**Reason:** ' + reason
				].join('\n')
			]
		]);
	}
}

export = Warn;