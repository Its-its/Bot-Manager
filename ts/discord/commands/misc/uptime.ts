import Command = require('../../command');

let started = Date.now();

class Uptime extends Command {
	constructor() {
		super('uptime', true, false);
		this.description = 'Gets the bot uptime.';
	}

	public call(params, server, message) {
		return Command.info([[
			'Uptime',
			Math.floor((Date.now() - started)/(1000 * 60 * 60 * 24)) + ' Hours.'
		]]);
	}
}

export = Uptime;