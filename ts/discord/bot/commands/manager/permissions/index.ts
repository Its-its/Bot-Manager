/**
* The permissions system works like this:
* 	If you have "commands.perms.user" then you have access to "commands.perms.user.*"
*	If you have "commands" then you have access to "commands.*" except for "commands.bypasstoggle"
*	"commands.bypasstoggle" is used for
*/

import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command, Parser, Param } from '@discord/bot/command';

import PERMISSIONS = require('./perms');
import LocalCommands = require('./commands');


const PARSER = new Parser(
	['perms', 'perm', 'permissions', 'permission'],
	[
		{
			name: 'help',
			defaultParameter: true,
			guildPermsRequired: ['SEND_MESSAGES'],
			callFunction: (_0, _1, message) => message.channel.send('help!')
		},
		{
			name: 'list',
			guildPermsRequired: ['SEND_MESSAGES'],
			callFunction: LocalCommands.list.newCall,
			params: [
				{
					name: 'command/group/@channel/@role',
					transformValue: v => (v == 'command' || v == 'group') ? v : parseInt(v),
					canPassValue: v => v == 'command' || v == 'group' || !isNaN(<number>v),
					errorMsgPassValue: 'Argument isn\'t "command", "group" or number'
				},
				{
					defaultValue: null,
					name: 'command name/group id',
					canPassValue: v => true
				}
			]
		}
	]
);

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