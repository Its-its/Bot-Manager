import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.command',
	LIST: 'list',
	CREATE: 'create',
	REMOVE: 'remove'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

class Comm extends Command {
	constructor() {
		super(['command', 'cmd'], false);

		this.description = 'Create commands that respond with something.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([[
				'Command',
				[
					'_NOT FINISHED_',
					'command list',
					'command create <name> <message>',
					'command remove <pid> <message>'
				].join('\n')
			]])
		}

		var type = params.shift();

		switch(type.toLowerCase()) {
			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Command');

				return Command.success([
					[
						'Command',
						server.commands.map(c => `PID: ${c.pid} - ALIAS: ${c.alias.join(', ')}`).join('\n')
					]
				]);
			case 'create':
				if (!this.hasPerms(message.member, server, PERMS.CREATE)) return Command.noPermsMessage('Command');

				var commandName = params.shift();
				if (!/^[a-z0-9_]+$/i.test(commandName)) return Command.info([['Command', 'Command name must only have A-Z 0-9 _ in it.']]);

				var onCalled = params.join(' ');

				if (onCalled.length == 0) return;

				server.createCommand(message.member, commandName, { type: 'echo', message: onCalled }, (resp) => {
					if (resp) server.save(() => message.reply(`Successfully created command "${commandName}"`));
					else message.reply('Command with that name already exists!');
				});
				break;
			case 'remove':
				if (!this.hasPerms(message.member, server, PERMS.REMOVE)) return Command.noPermsMessage('Command');

				var commandName = params.shift();
				if (!/^[a-z0-9_]+$/i.test(commandName)) return Command.info([['Command', 'Command name must only have A-Z 0-9 _ in it.']]);

				var paramId = parseInt(params.shift());

				if (!Number.isInteger(paramId)) paramId = null;

				server.removeCommand(commandName, paramId);
				server.save(() => message.reply(`Successfully removed command "${commandName}"`));
				break;
		}
	}
}

export = Comm;