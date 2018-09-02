import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


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
		//
	}
}

export = Warn;