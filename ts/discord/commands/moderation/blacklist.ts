import Command = require('../../command');

class Blacklist extends Command {
	constructor() {
		super('blacklist');

		this.addParams(0, (params, userOptions) => {
			var blacklisted = userOptions.moderation.blacklisted;

			if (params.length == 0) {
				return Command.info([
					[ 'Command Usage', ['list', 'clear', '<word/url>'].map(b => '!blacklist ' + b).join('\n') ]
				]);
			}

			if (params[0] == 'list') {
				return Command.info([
					[
						'Blacklisted items:', 
						blacklisted.length == 0 ? 'None' : blacklisted.map(b => ' - ' + b).join('\n')
					]
				]);
			} else if (params[0] == 'clear') {
				if (blacklisted.length == 0) {
					return Command.info([
						[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
					]);
				}
				userOptions.moderation.blacklisted = [];
				userOptions.save();

				return Command.info([
					[
						'Blacklist', 
						'Cleared ' + blacklisted.length + ' items from blacklist.'
					]
				]);
			}

			var word = params.join(' ').trim();

			var resp = 'Successfully blacklisted "' + word + '"';

			if (!userOptions.blacklist(word)) {
				resp = 'Successfully removed "' + word + '" from blacklist.';
			}

			userOptions.save();

			return Command.success([['Blacklist', resp]]);
		});
	}
}

export = Blacklist;