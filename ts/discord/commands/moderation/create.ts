import Command = require('../../command');

class Create extends Command {
	constructor() {
		super('create', false);

		this.addParams(0, 0, (params) => {
			return {
				type: 'echo',
				message: 'Please use "!create [Command Name] [Message]"'
			};
		});

		this.addParams(2, (params, client, message) => {
			params.shift();

			var command = params.shift();
			var onCalled = params.join(' ');

			client.createCommand(command, 'ECHO ' + onCalled);
			client.save(() => message.reply(`Successfully created command "${command}"`));
		});
	}
}

export = Create;