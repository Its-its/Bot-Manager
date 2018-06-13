import Command = require('../../command');

class Create extends Command {
	constructor() {
		super('create', false);

		this.addParams(0, 0, (params) => {
			return {
				type: 'echo',
				message: 'Please use "!create [name] [message]" to create a command'
			};
		});

		this.addParams(2, (params, client, message) => {
			var command = params.shift();
			var onCalled = params.join(' ');

			if (onCalled.length == 0) return;

			client.createCommand(message.member, command, { type: 'echo', message: onCalled }, (resp) => {
				if (resp) client.save(() => message.reply(`Successfully created command "${command}"`));
				else message.reply('Command with that name already exists!');
			});
		});
	}
}

export = Create;