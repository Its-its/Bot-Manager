import Discord = require('discord.js');
import DiscordServer = require('../../../GuildServer');

import Command = require('../../../command');

import comm = require('./commands');

import PERMS = require('./perms');


class Events extends Command {
	constructor() {
		super('events');

		this.perms = Object.values(PERMS);
		this.description = 'Events from Player joins to Player reacts.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('events')) return Command.error([['Error', 'Please enable the Events Plugin!']]);

		let callType = params.shift();

		switch(callType == null ? null : callType.toLowerCase()) {
			case 'list': return comm.List.call(params, server, message);
			case 'add': return comm.Add.call(params, server, message);
			case 'edit': return comm.Edit.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			// case 'help':
			default: return comm.Help.call(params, server, message);
		}
	}
}

export = Events;