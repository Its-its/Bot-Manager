import Discord = require('discord.js');
import DiscordServer = require('../../../../discordserver');

import Command = require('../../../../command');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	// 
	return Command.info([['RSS Feed', 'Help.']]);
}

export {
	call
};