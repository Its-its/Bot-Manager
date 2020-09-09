import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import util = require('@discord/utils');


async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	await message.channel.send(util.infoMsg([
		[
			'Events - Help',
			[
				'help',
				'list [id]',
				'create <title>',
				'edit <id>',
				'remove <id>'
			].join('\n')
		]
	]));

	return Promise.resolve();
}

export {
	call
};