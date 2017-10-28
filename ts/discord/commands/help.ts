import Command = require('../command');

// !help
// !help register


class Help extends Command {
	constructor() {
		super('help', false, false);

		// !help
		this.addParams(0, 0, (params) => {
			return { type: 'echo', message: 'Commands' };
		});

		// !help ...args
		this.addParams(1, (params) => {
			return { type: 'echo', message: 'help args' };
		});
	}
}

export = Help;