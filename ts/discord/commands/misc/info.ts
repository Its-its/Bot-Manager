import Command = require('../../command');

class Info extends Command {
	constructor() {
		super('info', false, false);

		this.addParams(0, 0, (params) => {
			return { type: 'echo', message: 'Commands' };
		});
	}
}

export = Info;