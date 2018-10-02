import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import util = require('../../../../../utils');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	message.channel.send(util.infoMsg([
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
}

export {
	call
};