import Command = require('../../command');

import Discord = require('discord.js');

class Logs extends Command {
	constructor() {
		super('logs');

		this.perms = [
			'commands.logs'
		].concat([
			'channel',
			'filter',
			'filter.list',
			'filter.add',
			'filter.remove'
		].map(i => 'commands.logs.' + i));
	}

	public call(params, server, message) {
		if (!server.isPluginEnabled('logs')) {
			return Command.error([['Error', 'Please enable Logs!']]);
		}

		if (params.length == 0) {
			return Command.info([
				[
					'Command Usage',
					[
						'channel [id/@channel]',
						'filter list',
						'filter add',
						'filter remove'
					].map(b => server.getPrefix() + 'logs ' + b).join('\n')
				]
			]);
		}

		switch(params.shift()) {
			case 'channel':
				var id = params.shift();

				if (id == null) id = message.channel.id;
				else id = server.strpToId(id);

				server.plugins.logs.textChannelId = id;

				if (id == message.channel.id) {
					message.channel.send(Command.info([
						[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
					]));
				} else {
					var channel = <Discord.TextChannel>message.guild.channels.get(id);
					if (channel == null) return Command.error([[ 'Logs', 'Channel with that ID does not exist!' ]]);
					if (channel.type != 'text')  return Command.error([[ 'Logs', 'Channel is not a text channel!' ]]);
					channel.send(Command.info([
						[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
					]));
				}

				server.save();
				break;
			case 'filter': break;
		}
	}
}

export = Logs;