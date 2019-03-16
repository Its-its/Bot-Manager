import Discord = require('discord.js');
import DiscordServer = require('../../../GuildServer');

import Command = require('../../../command');

import comm = require('./commands');

const PERMS = {
	MAIN: 'commands.twitter'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// TODO: Temporary. For a friend.

class Twitter extends Command {
	constructor() {
		super(['twitter']);

		this.perms = Object.values(PERMS);
		this.description = 'Twitter Feeds.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var callType = params.shift();

		if (callType == null || callType.toLowerCase() == 'help') return Command.info([[
			'Twitter',
			'Stuff'
		]]);

		switch(callType.toLowerCase()) {
			case 'add': return comm.Add.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			case 'list': return comm.List.call(params, server, message);
			// case 'cookies': return comm.Cookies.call(params, server, message);
			// case 'edit': return comm.Edit.call(params, server, message);
			// case 'filters': return comm.Filters.call(params, server, message);
			// case 'refresh': return comm.Refresh.call(params, server, message);
			// case 'test': return comm.Test.call(params, server, message);
		}
	}
}

export = Twitter;