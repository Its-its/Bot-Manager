import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.logs',
	CHANNEL: 'channel',
	FILTER: 'filter',
	FILTER_LIST: 'filter.list',
	FILTER_ADD: 'filter.add',
	FILTER_REMOVE: 'filter.remove'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Logs extends Command {
	constructor() {
		super('logs');

		this.perms = Object.values(PERMS);
		this.description = 'Logs filtered items to specified channel.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('logs')) return Command.error([['Error', 'Please enable Logs Plugin!']]);

		if (params.length == 0) {
			return Command.info([
				[
					'Command Usage',
					[
						'output [id/@channel]',
						'filter list',
						'filter add',
						'filter remove'
					].map(b => server.getPrefix() + 'logs ' + b).join('\n')
				]
			]);
		}

		switch(params.shift()) {
			case 'output':
				if (!this.hasPerms(message.member, server, PERMS.CHANNEL)) return Command.noPermsMessage('Logs');

				var channelId = params.shift();

				if (channelId == null) channelId = message.channel.id;
				else channelId = server.strpToId(channelId);

				if (!message.guild.channels.has(channelId)) return Command.error([['Logs', 'ID is not a channel.']]);

				server.plugins.logs.textChannelId = channelId;

				if (channelId == message.channel.id) {
					message.channel.send(Command.info([
						[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
					]));
				} else {
					var channel = <Discord.TextChannel>message.guild.channels.get(channelId);

					if (channel == null) return Command.error([[ 'Logs', 'Channel with that ID does not exist!' ]]);
					if (channel.type != 'text')  return Command.error([[ 'Logs', 'Channel is not a text channel!' ]]);

					channel.send(Command.info([
						[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
					]));
				}

				server.save();
				break;
			case 'filter':
				return Command.error([['Logs', 'Not implemented yet. :/']]);
				// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('Logs');
				// break;
		}
	}
}

export = Logs;