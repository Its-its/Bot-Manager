import Discord = require('discord.js');
import DiscordServer = require('../../../GuildServer');

import Command = require('../../../command');

import comm = require('./commands');


const PERMS = {
	MAIN: 'commands.events'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


// for(var name in comm) {
// 	var perms = comm[name].PERMS;
// }

class Events extends Command {
	constructor() {
		super('events');

		this.perms = Object.values(PERMS);
		this.description = 'Events from Player joins to Player reacts.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		// if (!server.isPluginEnabled('events')) return Command.error([['Error', 'Please enable the Events Plugin!']]);

		var callType = params.shift();

		switch(callType == null ? null : callType.toLowerCase()) {
			case 'list': return comm.List.call(params, server, message);
			case 'add': return comm.Add.call(params, server, message);
			case 'edit': return comm.Edit.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			case 'help':
			default: return comm.Help.call(params, server, message);
		}
	}
}

export = Events;