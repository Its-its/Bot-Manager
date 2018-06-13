import Command = require('../../command');

class PrefixCommand extends Command {
	constructor() {
		super('prefix');

		this.addParams(0, (params, server, message) => {
			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage',
						'prefix <type>'
					]
				]);
			}

			var prefix = params.shift();

			if (prefix != null && new RegExp('[~/\\!@#$%^&\*\(\)\-=+:;<>,.?]{1,5}', 'i').test(prefix)) {
				server.commandPrefix = prefix;
			} else {
				return Command.error([[
					'Prefix',
					[
						'Invalid prefix.',
						'Prefix has to be 1-5 characters long.',
						'Only using: ~/\\!@#$%^&*()-=+:;<>,.?'
					].join('\n')
				]]);
			}
		});
	}
}

export = PrefixCommand;