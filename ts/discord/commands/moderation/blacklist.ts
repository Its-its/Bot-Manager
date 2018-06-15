import Command = require('../../command');

class Blacklist extends Command {
	constructor() {
		super('blacklist');

		this.description = 'Blacklist certain words.';
	}

	public call(params, server, message) {
		var blacklisted = server.moderation.blacklisted;

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', ['list', 'clear', '<word/url>'].map(b => server.getPrefix() + 'blacklist ' + b).join('\n') ]
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
			server.moderation.blacklisted = [];
			server.save();

			return Command.info([
				[
					'Blacklist', 
					'Cleared ' + blacklisted.length + ' items from blacklist.'
				]
			]);
		}

		var word = params.join(' ').trim();

		var resp = 'Successfully blacklisted "' + word + '"';

		if (!server.blacklist(word)) {
			resp = 'Successfully removed "' + word + '" from blacklist.';
		}

		server.save();

		return Command.success([['Blacklist', resp]]);
	}
}

export = Blacklist;