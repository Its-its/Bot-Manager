import Command = require('../command');

class Remove extends Command {
	constructor() {
		super('remove', false);

		this.addParams(0, 0, (params) => {
			return {
				type: 'echo',
				message: 'Please use "!remove [Command Name] (param ID)"'
			};
		});

		this.addParams(2, (params) => {
			params.shift();

			let commandName = params.shift();
			let paramId = parseInt(params.shift());

			if (!Number.isInteger(paramId)) paramId = null;

			return {
				type: 'remove',
				commandName: commandName,
				paramId: paramId
			};
		});
	}
}

export = Remove;