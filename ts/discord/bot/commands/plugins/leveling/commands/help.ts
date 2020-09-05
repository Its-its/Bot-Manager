import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import util = require('@discord/utils');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	await message.channel.send(util.infoMsg([
		[
			'Leveling - Help',
			[
				'help',
				'config',
				'leaderboard',
				'rank [@user/id]',
				'add <user> <amount> <xp/lvl>',
				'remove <user> <amount> <xp/lvl>',
				'set <user> <amount> <xp/lvl>'
			].join('\n')
		]
	]));

	return Promise.resolve();
}

export {
	call
};