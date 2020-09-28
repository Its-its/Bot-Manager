import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command, Parser, CompiledParam, CallFunction } from '@discord/bot/command';

// import client = require('@discord/client');

import recording = require('@discord/recording/utils');


async function call(this: Parser, params: CompiledParam[], userOptions: DiscordServer, message: Discord.Message) {
	let member = message.member!;

	let channelId = params.shift();

	console.log(channelId);

	let voiceChannel: Discord.VoiceChannel | null = null;

	if (channelId != null) {
		let channel = message.guild!.channels.resolve(<string>channelId.value);

		if (channel != null && channel.type == 'voice') {
			voiceChannel = <Discord.VoiceChannel>channel;
		}
	} else {
		voiceChannel = member.voice.channel;
	}

	if (voiceChannel == null) return message.channel.send("Channel does not exist or User not in channel!");

	recording.sendStart(voiceChannel.id, message.guild!.id, member.id);

	return Promise.resolve();
}


export {
	call
};