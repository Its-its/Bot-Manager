import Command = require('../../command');

class Create extends Command {
	constructor() {
		super('create', false);
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return {
				type: 'echo',
				message: 'Please use "!create [name] [message]" to create a command'
			};
		}

		var command = params.shift();
		var onCalled = params.join(' ');

		if (onCalled.length == 0) return;

		server.createCommand(message.member, command, { type: 'echo', message: onCalled }, (resp) => {
			if (resp) server.save(() => message.reply(`Successfully created command "${command}"`));
			else message.reply('Command with that name already exists!');
		});
	}
}

export = Create;