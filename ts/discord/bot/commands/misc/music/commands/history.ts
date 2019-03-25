import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import utils = require('@discord/utils');
import PERMS = require('../perms');

import musicPlugin = require('@discord/music/plugins/music');
import MusicHistory = require('@base/music/models/history');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var paramToDo = params.shift();

	if (paramToDo == 'clear') {
		if (!server.userHasPerm(message.member, PERMS.HISTORY_CLEAR)) return Command.noPermsMessage('Music');

		MusicHistory.updateOne({ server_id: message.guild.id }, { $set: { songs: [], song_count: 0 } }).exec(() => {
			message.channel.send(Command.info([['Music!', 'Cleared history.']]));
		});
	} else {
		if (!server.userHasPerm(message.member, PERMS.HISTORY_LIST)) return Command.noPermsMessage('Music');

		var page = 1;
		var maxItems = 5;

		if (paramToDo != null) {
			var parsed = parseInt(paramToDo);
			if (Number.isInteger(parsed)) page = parsed;
		}

		if (page < 1) page = 1;

		MusicHistory.findOne({ server_id: message.guild.id }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } }, (err, item) => {
			if (err != null) {
				console.error(err);
				message.channel.send(Command.error([['Music', 'Nothing in History!']]));
				return;
			}

			if (item == null || item.song_count == 0) return message.channel.send(Command.info([['Music', 'Nothing in History!']]));

			var maxPages = Math.ceil(item.song_count/maxItems);

			if (page > maxPages) return message.channel.send(Command.info([['Music', 'Exceeded max history pages. (' + page + '/' + maxPages + ')']]));

			var fields = [
				[
					'Music',
					'Items In History: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
				]
			];

			var songIds = item.songs.map(s => s.song_id);

			musicPlugin.getSong(songIds.filter((item, pos) => songIds.indexOf(item) == pos), (err, songs) => {
				if (err != null) return message.channel.send(Command.error([['Music', err]]));
				if (songs == null || songs.length == 0) return message.channel.send(Command.error([['Music', 'Unable to find songs']]));

				fields = fields.concat(songIds.map((id, pos) => {
					for(var i = 0; i < songs.length; i++) {
						var song = songs[i];

						if (song.id == id) {
							return [
								'ID: ' + pos,
								song.title + '\nhttps://youtu.be/' + song.id + '\nListened to: ' + utils.timeSince(item.songs[pos].played_at) + ' ago'
							];
						}
					}

					return [ 'ID: ' + i, 'Unknown.' ];
				}));

				message.channel.send(Command.info(fields));
			});
		});
	}
}

export {
	call
};