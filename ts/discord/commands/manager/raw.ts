import Command = require('../../command');

class Raw extends Command {
	constructor() {
		super(['raw']);

		this.description = 'For testing.';

		this.perms = [
			'commands.raw'
		];

		this.addParams(0, (params, server, message) => {
			if (params.length == 0) return Command.info([[ 'Command Usage', '!raw <message>' ]]);

			return Command.info([[
				'Raw Message',
				params.map(p => p.replace('<', '\\<').replace('>', '\\>')).join(' ')
			]])
		});
	}
}

export = Raw;