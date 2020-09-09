import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('@discord/bot/command');

import { sendReq } from '@discord/music/plugins/music';
import PERMS = require('../perms');

async function call(_params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.STOP)) return Command.noPermsMessage('Music');

	sendReq('stop', {
		_guild: message.guild!.id,
		_channel: message.channel.id,
		_sender: message.member!.id,
	});

	return Promise.resolve();
}

export {
	call
};