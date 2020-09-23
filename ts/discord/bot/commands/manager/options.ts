import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

const PERMISSIONS = {
	MAIN: 'commands.options'
};

const DEFAULTS = {
	//
};


class Options extends Command {
	constructor() {
		super('options');

		this.perms = Object.values(PERMISSIONS);

		this.description = 'Change/View some of the bots core options.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', 'view' ]
			]);
		}

		return Command.info([['Options', 'Currently not implemented.']]);

		// TODO: Pages
	}
}

export = Options;