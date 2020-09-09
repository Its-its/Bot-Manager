import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import generate = require('nanoid/generate');

import Command = require('../../command');

import Punishments = require('../../../models/punishments');


const PERMS = {
	MAIN: 'commands.warn'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Warn extends Command {
	constructor() {
		super('warn');

		this.perms = Object.values(PERMS);

		this.description = 'Warn a player';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Warn',
					'@user <reason>'
				]
			]);
		}

		let userIdStr = params.shift()!;

		let userType = server.idType(userIdStr);

		if (userType != 'member') return Command.error([[ 'Mute', 'Invalid args. Please refer to warn help.' ]]);

		let userId = server.strpToId(userIdStr);

		if (userId == null) return Command.error([['Mute', 'Invalid User ID.']]);

		let reason = params.join(' ');

		let model = new Punishments({
			server_id: message.guild!.id,
			member_id: userId,
			creator_id: message.member!.id,

			pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 6),

			type: 'warn',

			reason: reason
		});

		await model.save();

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