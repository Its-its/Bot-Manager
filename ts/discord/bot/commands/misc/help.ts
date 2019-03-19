import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

import Commands = require('../index');

class Help extends Command {
	constructor() {
		super('help', true, false);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var commandList = (<{[str: string]: Command[]}>Commands.list());
		var commandCategories: [string, string, number][] = Object.keys(commandList).map(c => [ c, c.toLowerCase(), commandList[c].length ]);

		var commandTotal = 0;

		commandCategories.forEach(c => commandTotal += c[2]);

		if (params.length == 0) {
			var lines = [
				'Total Commands: ',
				'_Excluding custom commands._',
				server.getPrefix() + 'help all'
			];

			for(var i = 0; i < commandCategories.length; i++) {
				var cat = commandCategories[i];
				if (cat[1] != 'owner') lines.push(server.getPrefix() + 'help ' + cat[1]);
			}

			lines[0] += commandTotal;

			return Command.info([
				[
					'Help',
					lines.join('\n')
				]
			]);
		}

		var paramHelpName = params.shift().toLowerCase();

		if (paramHelpName == 'all') {
			var each = [
				[
					'**All Commands**',
					commandTotal + ' commands.'
				].join('\n')
			];

			var length = each[0].length;

			for(var i = 0; i < commandCategories.length; i++) {
				var categoryInfo = commandCategories[i];

				if (categoryInfo[1] == 'owner') continue;

				var commandsInCategory = commandList[categoryInfo[0]];

				each.push([
					`**${categoryInfo[0]}**`,
					Command.table(['Name', 'Perms', 'Description'],
						commandsInCategory.map(c =>
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

		if (paramHelpName == 'owner') return;

		// List commands in a category
		for(var i = 0; i < commandCategories.length; i++) {
			var categoryInfo = commandCategories[i];

			if (categoryInfo[1] == paramHelpName) {
				var commandsInCategory = commandList[categoryInfo[0]];

				message.channel.send(`**${categoryInfo[0]}**\n` +
					Command.table(['Name', 'Perms', 'Description'],
						commandsInCategory.map(c =>
							[
								c.commandName[0],
								c.hasPermsCount(message.member, server, c.perms) + '/' + c.perms.length,
								c.description
							]
						)
					)
				);

				return;
			}
		}

		// TODO: Commands instead of categories
	}
}

export = Help;