import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

import Commands = require('../index');

class Help extends Command {
	constructor() {
		super('help', true, false);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var commands = (<{[str: string]: Command[]}>Commands.list());
		var categoryNames: any[] = Object.keys(commands).map(c => [ c, c.toLowerCase(), commands[c].length ]);

		var commandTotal = 0;

		categoryNames.forEach(c => commandTotal += c[2]);
	
		if (params.length == 0) {
			var lines = [
				'Total Commands: ',
				'_Excluding custom commands._',
				server.getPrefix() + 'help all'
			];

			for(var i = 0; i < categoryNames.length; i++) {
				var cat = categoryNames[i];
				lines.push(server.getPrefix() + 'help ' + cat[1]);
			}

			lines[0] += commandTotal;

			return Command.info([
				[
					'Help',
					lines.join('\n')
				]
			]);
		}

		var name = params.shift().toLowerCase();

		if (name == 'all') {
			var each = [
				[
					'**All Commands**',
					commandTotal + ' commands.'
				].join('\n')
			];

			var length = each[0].length;

			for(var i = 0; i < categoryNames.length; i++) {
				var categoryName = categoryNames[i];

				var categoryCommands = commands[categoryName[0]];

				each.push([
					`**${categoryName[0]}**`,
					Command.table(['Name', 'Perms', 'Description'], 
						categoryCommands.map(c => 
							[
								c.commandName[0],
								c.hasPermsCount(message.member, server, c.perms) + '/' + c.perms.length,
								c.description
							]
						)
					)
				].join('\n'));

				length += each[each.length - 1].length;

				if (length >= 1950) {
					message.channel.send(each.splice(0, each.length - 1).join('\n'));
					length = each[0].length;
				}
			}

			message.channel.send(each.join('\n'));

			return;
		}

		// List commands in a category
		for(var i = 0; i < categoryNames.length; i++) {
			var categoryName = categoryNames[i];

			if (categoryName[1] == name) {
				var categoryCommands = commands[categoryName[0]];
				return Command.info([[
					'Commands in Category ' + categoryName[0],
					'_Temporary design_\n' + categoryCommands.map(c => server.getPrefix() + c.commandName[0] + ' | ' + (c.description || 'No Description Available.')).join('\n')
				]]);
			}
		}

		// TODO: Commands instead of categories
	}
}

export = Help;