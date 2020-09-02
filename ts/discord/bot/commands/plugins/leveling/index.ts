import Discord = require('discord.js');
import DiscordServer = require('../../../GuildServer');

import Command = require('../../../command');

import comm = require('./commands');


const PERMS = {
	MAIN: 'commands.leveling',
	RANK: 'rank',
	LEADERBOARD: 'leaderboard',
	CONFIG: 'config',
	SET: 'set',
	ADD: 'add',
	REMOVE: 'remove',
	HELP: 'help'
};

for(var name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

class Leveling extends Command {
	constructor() {
		super(['leveling']);

		this.perms = Object.values(PERMS);
		this.description = 'Level up plugin.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('leveling')) return Command.error([['Error', 'Please enable the Leveling Plugin!']]);

		let callType = params.shift();

		// @ts-ignore
		if (callType != null && PERMS[callType.toUpperCase()] != null) {
			// @ts-ignore
			if (!this.hasPerms(message.member!, server, PERMS[callType.toUpperCase()])) return Command.noPermsMessage('Leveling');
		}

		switch(callType == null ? null : callType.toLowerCase()) {
			// case 'rank': return comm.Rank.call(params, server, message);
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