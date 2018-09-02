import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

// Have different punishments for different things.
// Ex: Punishment 1. 1st: warn, 2nd: mute 1d, 3rd: mute 7d, 4th+: 3rd

// Ex: !punish @user <punishment #> <reason>
// Ex: !blacklist add crap <censor/punishment/remove>

// Figure out how to store punishments in DB for different punishment reasons.


const PERMS = {
	MAIN: 'commands.punishment',
	LIST: 'list',
	ADD: 'add',
	REMOVE: 'remove',
	EDIT: 'edit'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Punishment extends Command {
	constructor() {
		super(['punishment', 'punishments']);

		this.description = 'Create punishments for warns/mutes/blacklisted words/etc..';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return;
		}

		switch(params.shift().toLowerCase()) {
			case 'list': break;
			case 'add': break;
			case 'remove': break;
			case 'edit': break;
		}
	}
}

export = Punishment;