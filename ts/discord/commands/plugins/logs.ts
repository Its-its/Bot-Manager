import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

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
				if (!this.hasPerms(message.member, server, PERMS.CHANNEL)) return Command.noPermsMessage('Logs');

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
			case 'filter':
				return Command.error([['Logs', 'Not implemented yet. :/']]);
				// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('Logs');	
				// break;
		}
	}
}

export = Logs;