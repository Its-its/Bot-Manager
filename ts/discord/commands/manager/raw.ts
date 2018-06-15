import Command = require('../../command');

class Raw extends Command {
	constructor() {
		super(['raw']);

		this.description = 'For testing. Displaying the message unformatted.';

		this.perms = [
			'commands.raw'
		];
	}

	public call(params, server, message) {
		if (params.length == 0) return Command.info([[ 'Description', this.description ], [ 'Command Usage', 'raw <message>' ]]);

		return Command.info([[
			'Raw Message',
			params.map(p => p.replace('<', '\\<').replace('>', '\\>')).join(' ')
		]])
	}
}

export = Raw;