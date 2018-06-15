import Command = require('../../command');

class Whitelist extends Command {
	constructor() {
		super('whitelist');
	}

	public call(params, server, message) {
		return {
			type: 'echo',
			embed: {
				color: Command.SuccessColor,
				fields: [
					{
						name: 'Whitelist',
						value: 'Nothing Yet :/'
					}
				]
			}
		};
	}
}

export = Whitelist;