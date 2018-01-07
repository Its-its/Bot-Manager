import Command = require('../../command');

class Interval extends Command {
	constructor() {
		super(['interval', 'every']);

		this.addParams(0, (params, userOptions) => {
			var blacklisted = userOptions.moderation.blacklisted;

			if (params.length == 0) {
				return Command.info([
					[ 'Command Usage', ['list', 'join', 'leave'].map(b => '!blacklist ' + b).join('\n') ]
				]);
			}

			if (params[0] == 'list') {
				return Command.info([
					[
						'Blacklisted items:', 
						blacklisted.length == 0 ? 'None' : blacklisted.map(b => ' - ' + b).join('\n')
					]
				]);
			}

			// return Command.success([['Blacklist', resp]]);
		});
	}
}

export = Interval;