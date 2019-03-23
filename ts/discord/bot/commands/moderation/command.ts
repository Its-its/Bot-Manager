import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');
import { Optional } from '../../../../../typings/manager';


const PERMS = {
	MAIN: 'commands.command',
	LIST: 'list',
	CREATE: 'create',
	REMOVE: 'remove'
};

for(var name in PERMS) {
	// @ts-ignore
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
					'command remove <pid>'
				].join('\n')
			]])
		}

		var cmdTypeCalled = params.shift()!;

		switch(cmdTypeCalled.toLowerCase()) {
			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Command');

				message.channel.send(Command.table([ 'PID', 'Alias' ], server.commands.map(c => [c.pid, c.alias.join(', ')])));

				return;
			case 'create':
				if (!this.hasPerms(message.member, server, PERMS.CREATE)) return Command.noPermsMessage('Command');

				var commandName = params.shift();

				if (commandName == null) return Command.error([['Command', 'Invalid Params.']]);

				if (!/^[a-z0-9_]+$/i.test(commandName)) return Command.info([['Command', 'Command name must only have A-Z 0-9 _ in it.']]);

				var onCalledMessage = params.join(' ');

				if (onCalledMessage.length == 0) return;

				server.createCommand(message.member, commandName, { type: 'echo', message: onCalledMessage }, (resp) => {
					if (resp) server.save(() => message.reply(`Successfully created command "${commandName}"`));
					else message.reply('Command with that name already exists!');
				});
				break;
			case 'remove':
				if (!this.hasPerms(message.member, server, PERMS.REMOVE)) return Command.noPermsMessage('Command');

				var commandName = params.shift();

				if (commandName == null) return Command.error([['Command', 'Invalid Params.']]);

				if (!/^[a-z0-9_]+$/i.test(commandName)) return Command.info([['Command', 'Command name must only have A-Z 0-9 _ in it.']]);

				var param = params.shift();

				if (param == null) return Command.error([['Command', 'Invalid Params.']]);

				var paramId: Optional<number> = parseInt(param);

				if (!Number.isInteger(paramId)) paramId = undefined;

				server.removeCommand(commandName, paramId);
				server.save(() => message.reply(`Successfully removed command "${commandName}"`));
				break;
		}
	}
}

export = Comm;