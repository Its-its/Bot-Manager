import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

function call(_params: string[], _server: DiscordServer, _message: Discord.Message) {
	return Command.info([
		[
			'RSS Feed',
			[
				'add <URL>',
				'list'
			].join('\n')
		]
	]);
}

export {
	call
};