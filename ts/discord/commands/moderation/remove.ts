import Command = require('../../command');

class Remove extends Command {
	constructor() {
		super('remove', false);

		this.addParams(0, 0, (params) => {
			return {
				type: 'echo',
				message: 'Please use "!remove [name]"'
			};
		});

		this.addParams(2, (params, client, message) => {
			let command = params.shift();
			let paramId = parseInt(params.shift());

			if (!Number.isInteger(paramId)) paramId = null;

			client.removeCommand(command, paramId);
			client.save(() => message.reply(`Successfully removed command "${command}"`));
		});
	}
}

export = Remove;