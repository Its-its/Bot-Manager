import Command = require('../../command');

class Remove extends Command {
	constructor() {
		super('remove', false);
	}

	public call(params, server, message) {
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