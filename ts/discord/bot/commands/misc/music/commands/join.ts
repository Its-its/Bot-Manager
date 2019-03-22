import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import { sendReq } from '../../../../../music/plugins/music';
import PERMS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member, PERMS.JOIN)) return Command.noPermsMessage('Music');

	var voiceChannel: string = params.shift();

	if (voiceChannel == null && message.member.voiceChannel != null) {
		voiceChannel = message.member.voiceChannel.id;
	}

	if (voiceChannel == null) return Command.error([['Music', 'Unable to find voice channel.']]);

	sendReq('join', {
		_guild: message.guild.id,
		_channel: message.channel.id,
		_sender: message.member.id,

		voice_channel: voiceChannel
	});
}

export {
	call
};