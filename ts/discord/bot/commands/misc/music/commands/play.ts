import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

import { sendPlay } from '@discord/music/plugins/music';
import PERMS = require('../perms');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.PLAY)) return Command.noPermsMessage('Music');

	let joined = params.join(' ').trim();

	sendPlay(message.channel.id, message.guild!.id, message.member!.id, joined.length == 0 ? undefined : joined);

	return Promise.resolve();
}

export {
	call
};