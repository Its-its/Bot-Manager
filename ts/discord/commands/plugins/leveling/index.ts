import Discord = require('discord.js');
import DiscordServer = require('../../../discordserver');

import Command = require('../../../command');

import comm = require('./commands');


const PERMS = {
	MAIN: 'commands.rssfeed'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


// for(var name in comm) {
// 	var perms = comm[name].PERMS;
// }

class Leveling extends Command {
	constructor() {
		super(['leveling']);

		this.perms = Object.values(PERMS);
		this.description = 'Level up plugin.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('leveling')) return Command.error([['Error', 'Please enable the Leveling Plugin!']]);

		var callType = params.shift();

		switch(callType == null ? null : callType.toLowerCase()) {
			case 'rank': return comm.Rank.call(params, server, message);
			case 'leaderboard': return comm.Leaderboard.call(params, server, message);
			case 'config': return comm.Config.call(params, server, message);
			case 'set': return comm.Set.call(params, server, message);
			case 'add': return comm.Add.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			case 'help':
			default: return comm.Help.call(params, server, message);
		}
	}
}

export = Leveling;