import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import { sendReq } from '@discord/music/plugins/music';
import PERMS = require('../perms');

async function call(_params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.SKIP)) return Command.noPermsMessage('Music');

	sendReq('next', {
		_guild: message.guild!.id,
		_channel: message.channel.id,
		_sender: message.member!.id,

		// TODO: wtf is  this here for voice_channel: voiceChannel
	});

	return Promise.resolve();
}

export {
	call
};