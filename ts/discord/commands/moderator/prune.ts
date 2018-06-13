import Command = require('../../command');

import Commands = require('../index');

import Discord = require('discord.js');

class Prune extends Command {
	constructor() {
		super('prune', true, false);

		this.perms = [
			'commands.prune'
		].concat([
			'user',
			'channel'
		].map(i => 'commands.prune.' + i));

		this.addParams(0, (params, server, message) => {
			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage',
						[
							'user <id/@> [amount=100]',
							'channel [id/@] [amount=100]'
						].map(b => '!prune ' + b).join('\n')
					]
				]);
			}

			// TODO: DiscordAPIError: You can only bulk delete messages that are under 14 days old.

			switch(params.shift()) {
				case 'user': break;
				case 'channel':
					var id = server.strpToId(params.shift());
					var limit = 100;

					if (id == null) {
						id = message.channel.id;
					} else {
						limit = parseInt(params.shift());
						if (Number.isNaN(limit)) limit = 100;
						if (limit > 100) limit = 100;
					}

					var channel = <Discord.TextChannel>message.guild.channels.get(id);

					if (channel == null) return Command.error([[ 'Prune', 'Channel does not exist!' ]]);
					if (channel.type != 'text') return Command.error([[ 'Prune', 'Channel must be text only!' ]]);

					channel.fetchMessages({ limit: limit })
					.then((messages) => {
						channel.bulkDelete(messages);
						var deleted = messages.array().length;

						message.channel.send(Command.success([[ 'Prune', 'Deleted a total of ' + deleted + ' Messages from <#' + id + '>' ]]));
					}, (e) => {
						console.error(e);
						message.channel.send(Command.error([[ 'Prune', 'An error occured! Make sure you gave the bot the proper perms!' ]]));
					})
					.catch(e => {
						console.error(e);
						message.channel.send(Command.error([[ 'Prune', 'An error occured! Make sure you gave the bot the proper perms!' ]]));
					});
				break;
			}
		});
	}
}

export = Prune;