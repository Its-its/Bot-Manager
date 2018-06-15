import Command = require('../../command');

class Backup extends Command {
	constructor() {
		super('backup');

		this.description = 'Save the discord server so you can restore it to an empty one.';
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						server.getPrefix() + 'backup <items>',
						'',
						'Items:',
						' - all',
						'_Individual items:_',
						' - channels, moderations, roles, bans',
						' - commands, intervals, phrases, blacklists, perms, prefix, ranks, roles, alias, warnings'
					].join('\n')
				],
				[
					'Examples',
					[
						'backup all\n_Backup all the data_\n',
						'backup all channels commands\n_Backup channels and commands._\n',
						'backup all -bans\n_Backup all the data except for the server bans._'
					].map(t => server.getPrefix() + t).join('\n')
				]
			]);
		}

		//
	}
}

export = Backup;