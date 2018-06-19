import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.raw'
};

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');

class Raw extends Command {
	constructor() {
		super(['raw']);

		this.description = 'For testing. Displaying the message unformatted.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) return Command.info([[ 'Description', this.description ], [ 'Command Usage', 'raw <message>' ]]);

		return Command.info([[
			'Raw Message',
			params.map(p => p.replace(/\</g, '\\<').replace(/\>/g, '\\>')).join(' ')
		]])
	}
}

export = Raw;