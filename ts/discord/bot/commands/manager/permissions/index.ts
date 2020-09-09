/**
* The permissions system works like this:
* 	If you have "commands.perms.user" then you have access to "commands.perms.user.*"
*	If you have "commands" then you have access to "commands.*" except for "commands.bypasstoggle"
*	"commands.bypasstoggle" is used for
*/

import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('../../../command');
import GlobalCommands = require('../../index');

import PERMISSIONS = require('./perms');
import LocalCommands = require('./commands');

class Perms extends Command {
	constructor() {
		super(['perm', 'perms', 'permissions', 'permission']);

		this.description = 'The permissions system for the bot.';

		this.perms = Object.values(PERMISSIONS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return LocalCommands.help.call(this.description, params, server, message);
		}


		let comm = params.shift();

		switch (comm) {
			case 'list': return LocalCommands.list.call(params, server, message);
			case 'channels': return LocalCommands.channel.call(params, server, message);
			case 'user': return LocalCommands.user.call(params, server, message);
			case 'role': return LocalCommands.role.call(params, server, message);
			case 'group': return LocalCommands.group.call(params, server, message);
			default: return Command.error([['Permissions', 'Nope.']]);
		}
	}
}

export = Perms;