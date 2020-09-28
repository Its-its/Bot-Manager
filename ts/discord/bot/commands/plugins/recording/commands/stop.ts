import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Parser, CompiledParam } from '@discord/bot/command';

import recording = require('@discord/recording/utils');


async function call(this: Parser, params: CompiledParam[], userOptions: DiscordServer, message: Discord.Message) {
	let member = message.member!;

	let voiceChannel = message.guild!.voice?.channel;

	if (voiceChannel == null) return message.channel.send("User is not in a voice channel!");

	recording.sendStop(message.channel.id, message.guild!.id, member.id);

	return Promise.resolve();
}


export {
	call
};