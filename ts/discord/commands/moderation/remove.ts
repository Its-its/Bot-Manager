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

class Remove extends Command {
	constructor() {
		super('remove', false);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return {
				type: 'echo',
				message: 'Please use "!remove [name]"'
			};
		}

		var command = params.shift();
		var paramId = parseInt(params.shift());

		if (!Number.isInteger(paramId)) paramId = null;

		server.removeCommand(command, paramId);
		server.save(() => message.reply(`Successfully removed command "${command}"`));
	}
}

export = Remove;