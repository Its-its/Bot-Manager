import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('@discord/bot/command');

import { sendReq } from '@discord/music/plugins/music';
import PERMS = require('../perms');
import { Optional } from '@type-manager';

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.JOIN)) return Command.noPermsMessage('Music');

	let voiceChannel: Optional<string> = params.shift();

	if (voiceChannel == null && message.member!.voice.channel != null) {
		voiceChannel = message.member!.voice.channel.id;
	}

	if (voiceChannel == null) return Command.error([['Music', 'Unable to find voice channel.']]);

	sendReq('join', {
		_guild: message.guild!.id,
		_channel: message.channel.id,
		_sender: message.member!.id,

		voice_channel: voiceChannel
	});

	return Promise.resolve();
}

export {
	call
};