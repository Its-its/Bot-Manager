import Command = require('../../command');

class Create extends Command {
	constructor() {
		super(['command', 'cmd'], false);
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([[
				'Command',
				[
					'command list',
					'command create <name> <message>',
					'command remove <name> <message>'
				].join('\n')
			]])
		}

		var type = params.shift();
		var commandName = params.shift();

		if (/[a-z0-9_]/i.test(commandName)) return Command.info([['Command', 'Command name must only have A-Z 0-9 _ in it.']]);

		switch(type.toLowerCase()) {
			case 'list': break;
			case 'create':
				var onCalled = params.join(' ');
	
				if (onCalled.length == 0) return;
	
				server.createCommand(message.member, commandName, { type: 'echo', message: onCalled }, (resp) => {
					if (resp) server.save(() => message.reply(`Successfully created command "${commandName}"`));
					else message.reply('Command with that name already exists!');
				});
				break;
			case 'remove':
				var paramId = parseInt(params.shift());

				if (!Number.isInteger(paramId)) paramId = null;

				server.removeCommand(commandName, paramId);
				server.save(() => message.reply(`Successfully removed command "${commandName}"`));
				break;
		}
	}
}

export = Create;