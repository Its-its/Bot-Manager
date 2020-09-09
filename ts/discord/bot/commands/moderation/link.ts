import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('../../command');

const PERMISSIONS = {
	MAIN: 'commands.link'
};

const USAGE = Command.table(
	[ 'Opt', 'Description' ],
	[
		[ '_none_', 'If you\'re **the owner of the GUILD**' ],
		[ '', 'You will get a DM with the auth link.' ]
	]
);


// Link bot to website if it wasn't invited from my website.
class Link extends Command {
	constructor() {
		super('link');

		this.perms = Object.values(PERMISSIONS);

		this.description = 'Used to link the bot to the website.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', USAGE ]
			]);
		}

		return Command.info([['Options', 'Currently not implemented.']]);

		// TODO: Pages
	}
}

export = Link;