import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

import Commands = require('../index');

class Help extends Command {
	constructor() {
		super('help', true, false);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		let commandList = (<{[str: string]: Command[]}>Commands.list());
		let commandCategories: [string, string, number][] = Object.keys(commandList).map(c => [ c, c.toLowerCase(), commandList[c].length ]);

		let commandTotal = 0;

		commandCategories.forEach(c => commandTotal += c[2]);

		if (params.length == 0) {
			let lines = [
				'Total Commands: ',
				'_Excluding custom commands._',
				server.getPrefix() + 'help all'
			];

			for(let i = 0; i < commandCategories.length; i++) {
				let cat = commandCategories[i];
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

		let paramHelpName = params.shift()!.toLowerCase();

		if (paramHelpName == 'all') {
			let each = [
				[
					'**All Commands**',
					commandTotal + ' commands.'
				].join('\n')
			];

			let length = each[0].length;

			for(let i = 0; i < commandCategories.length; i++) {
				let categoryInfo = commandCategories[i];

				if (categoryInfo[1] == 'owner') continue;

				let commandsInCategory = commandList[categoryInfo[0]];

				each.push([
					`**${categoryInfo[0]}**`,
					Command.table(['Name', 'Perms', 'Description'],
						commandsInCategory.map(c =>
							[
								c.commandName[0],
								c.hasPermsCount(message.member!, server, c.perms) + '/' + c.perms.length,
								c.description
							]
						)
					)
				].join('\n'));

				length += each[each.length - 1].length;

				if (length >= 1950) {
					await message.channel.send(each.splice(0, each.length - 1).join('\n'));
					length = each[0].length;
				}
			}

			await message.channel.send(each.join('\n'));

			return Promise.resolve();
		}

		if (paramHelpName == 'owner') return Promise.resolve();

		// List commands in a category
		for(let i = 0; i < commandCategories.length; i++) {
			let categoryInfo = commandCategories[i];

			if (categoryInfo[1] == paramHelpName) {
				let commandsInCategory = commandList[categoryInfo[0]];

				await message.channel.send(`**${categoryInfo[0]}**\n` +
					Command.table(['Name', 'Perms', 'Description'],
						commandsInCategory.map(c =>
							[
								c.commandName[0],
								c.hasPermsCount(message.member!, server, c.perms) + '/' + c.perms.length,
								c.description
							]
						)
					)
				);

				return Promise.resolve();
			}
		}

		// TODO: Commands instead of categories
		return Promise.resolve();
	}
}

export = Help;