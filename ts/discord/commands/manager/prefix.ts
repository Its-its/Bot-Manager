import Command = require('../../command');

class PrefixCommand extends Command {
	constructor() {
		super('prefix');

		this.description = 'Sets the command prefix.';
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					'prefix <type>'
				]
			]);
		}

		var prefix = params.shift();

		if (prefix != null && new RegExp('[~\/\\!@#$%^&\*\(\)\-=+:;<>,.?]{1,4}', 'i').test(prefix)) {
			server.commandPrefix = prefix;
			return Command.success([[
				'Prefix',
				'Bot prefix now set to "' + prefix + '"'
			]]);
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
	}
}

export = PrefixCommand;