import Command = require('../../command');


class Restore extends Command {
	constructor() {
		super('restore');

		this.description = 'Restore the backed up discord server to the new server.';
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					server.getPrefix() + 'backup'
				]
			]);
		}

		//
	}
}

export = Restore;