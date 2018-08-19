import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.options'
};

const DEFAULTS = {
	// 
};

const notimplemented = true;

class Options extends Command {
	constructor() {
		super('options');

		this.perms = Object.values(PERMISSIONS);

		this.description = 'Change/View some of the bots core options.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', 'view' ]
			]);
		}

		if (notimplemented) Command.info([['Options', 'Currently not implemented.']]);

		// TODO: Pages
	}
}

export = Options;