import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.mute'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Mute extends Command {
	constructor() {
		super('mute');

		this.perms = Object.values(PERMS);

		this.description = '';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		//
	}
}

export = Mute;