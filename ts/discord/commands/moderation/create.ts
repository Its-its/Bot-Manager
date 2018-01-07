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

		this.addParams(2, (params) => {
			params.shift();

			let commandName = params.shift();
			let message = params.join(' ');

			return {
				type: 'create',
				commandName: 'ECHO ' + commandName,
				message: message
			};
		});
	}
}

export = Create;