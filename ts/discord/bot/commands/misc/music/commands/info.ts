import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

import guildClient = require('@discord/guildClient');
import utils = require('@discord/utils');
import PERMS = require('../perms');

async function call(_params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.INFO)) return Command.noPermsMessage('Music');

	let items: [string, string][] = [];

	let music = await guildClient.getMusic(message.guild!.id);

	if (music.playing != null) {
		items.push([
			'Song',
			[
				'The Current song is:',
				'Title: ' + music.playing.title,
				'Link: ' + utils.videoIdToUrl(music.playing.type, music.playing.id)
			].join('\n')
		]);
	} else items.push([ 'Song', 'Not currently playing any music.' ]);

	items.push([
		'Options',
		[
			// 'Playing From: ' + music.playingFrom,
			'Repeat Queue: ' + (music.repeatQueue ? 'Yes' : 'No'),
			'Repeat song: ' + (music.repeatSong ? 'Yes' : 'No')
		].join('\n')
	]);

	return Command.info(items);
}

export {
	call
};