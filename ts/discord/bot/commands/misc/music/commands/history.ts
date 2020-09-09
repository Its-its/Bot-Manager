import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('@discord/bot/command');

import utils = require('@discord/utils');
import PERMS = require('../perms');

import musicPlugin = require('@discord/music/plugins/music');
import MusicHistory = require('@base/music/models/history');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let paramToDo = params.shift();

	if (paramToDo == 'clear') {
		if (!server.userHasPerm(message.member!, PERMS.HISTORY_CLEAR)) return Command.noPermsMessage('Music');

		await MusicHistory.updateOne({ server_id: message.guild!.id }, { $set: { songs: [], song_count: 0 } }).exec();

		await message.channel.send(Command.info([['Music!', 'Cleared history.']]));
	} else {
		if (!server.userHasPerm(message.member!, PERMS.HISTORY_LIST)) return Command.noPermsMessage('Music');

		let page = 1;
		let maxItems = 5;

		if (paramToDo != null) {
			let parsed = parseInt(paramToDo);
			if (Number.isInteger(parsed)) page = parsed;
		}

		if (page < 1) page = 1;

		let item = await MusicHistory.findOne({ server_id: message.guild!.id }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } });

		if (item == null || item.song_count == 0) {
			await message.channel.send(Command.info([['Music', 'Nothing in History!']]));
			return Promise.resolve();
		}

		let maxPages = Math.ceil(item.song_count/maxItems);

		if (page > maxPages) {
			await message.channel.send(Command.info([['Music', 'Exceeded max history pages. (' + page + '/' + maxPages + ')']]));
			return Promise.resolve();
		}

		let fields = [
			[
				'Music',
				'Items In History: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
			]
		];

		let songIds = item.songs.map(s => s.song_id);

		let songs = await musicPlugin.getSong(songIds.filter((item, pos) => songIds.indexOf(item) == pos));

		if (songs == null || songs.length == 0) {
			await message.channel.send(Command.error([['Music', 'Unable to find songs']]));
			return Promise.resolve();
		}

		fields = fields.concat(songIds.map((id, pos) => {
			for(let i = 0; i < songs.length; i++) {
				let song = songs[i];

				if (song.id == id) {
					return [
						'ID: ' + pos,
						song.title + '\nhttps://youtu.be/' + song.id + '\nListened to: ' + utils.timeSince(item!.songs[pos].played_at) + ' ago'
					];
				}
			}

			return [ 'ID: ' + pos, 'Unknown.' ];
		}));

		await message.channel.send(Command.info(fields));
	}

	return Promise.resolve();
}

export {
	call
};