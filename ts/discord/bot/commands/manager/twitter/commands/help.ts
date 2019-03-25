import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	return Command.info([[
		'Twitter Feeds',
		[
			'add <URL/name>',
			'list'
		].join('\n')
	]]);
}

export {
	call
};