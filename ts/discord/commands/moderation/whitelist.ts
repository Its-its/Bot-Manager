import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');

// Don't know what this is for.

class Whitelist extends Command {
	constructor() {
		super('whitelist');
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		return {
			type: 'echo',
			embed: {
				color: Command.SuccessColor,
				fields: [
					{
						name: 'Whitelist',
						value: 'Nothing Yet :/'
					}
				]
			}
		};
	}
}

export = Whitelist;