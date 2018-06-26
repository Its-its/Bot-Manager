import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.blacklist',
	LIST: 'list',
	CLEAR: 'clear',
	ADD: 'add'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


// TODO: Blacklist per channel
// TODO: Ensure admins aren't blacklisted also.

class Blacklist extends Command {
	constructor() {
		super('blacklist');

		this.description = 'Blacklist certain words.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var blacklisted = server.moderation.blacklisted;

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', ['list', 'clear', '<word/url>'].map(b => server.getPrefix() + 'blacklist ' + b).join('\n') ]
			]);
		}

		if (params[0] == 'list') {
			if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Blacklist');

			return Command.info([
				[
					'Blacklisted items:', 
					blacklisted.length == 0 ? 'None' : blacklisted.map(b => ' - ' + b).join('\n')
				]
			]);
		} else if (params[0] == 'clear') {
			if (!this.hasPerms(message.member, server, PERMS.CLEAR)) return Command.noPermsMessage('Blacklist');

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

		if (!this.hasPerms(message.member, server, PERMS.ADD)) return Command.noPermsMessage('Blacklist');

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