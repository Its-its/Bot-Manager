import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.number'
};

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');


class RandNumber extends Command {
	constructor() {
		super(['number', 'randomnumber'], true, false);

		this.description = 'Generates a random number.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 1) {
			params[1] = params[0];
			params[0] = null;
		}

		var min = strToNumber(params[0], 0);
		var max = strToNumber(params[1], 100);

		if (min >= max) {
			return Command.error([
				['Invalid Params!', 'Minimum number is larger than Maximum number'],
				['Values', 'Min: ' + min + ', Max: ' + max]
			]);
		}

		return Command.success([
			[ 'Number Picked!', 'Picked ' + (Math.floor(Math.random() * (max - min + 1)) + min) ],
			[ 'Picked From', 'Min: ' + min + ', Max: ' + max ]
		]);
	}
}

function strToNumber(str: string, def: number): number {
	if (str == null) return def;
	var value = parseInt(str);
	return isNaN(value) ? def : value;
}

export = RandNumber;