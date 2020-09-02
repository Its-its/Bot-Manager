import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import guildClient = require('@discord/guildClient');
import utils = require('@discord/utils');
import PERMS = require('../perms');

function call(_params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.INFO)) return Command.noPermsMessage('Music');

	let items: [string, string][] = [];

	guildClient.getMusic(message.guild!.id, (music) => {
		if (music == null) return message.channel.send(Command.error([['Music', 'Unable to find Music.']]));

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
	});
}

export {
	call
};