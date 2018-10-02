import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

let started = Date.now();


const PERMS = {
	MAIN: 'commands.uptime'
};



class Uptime extends Command {
	constructor() {
		super('uptime', true, false);

		this.description = 'Gets the bot uptime.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		return Command.info([[
			'Uptime',
			Math.floor((Date.now() - started)/(1000 * 60 * 60 * 24)) + ' Hours.'
		]]);
	}
}

export = Uptime;