import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import guildClient = require('../../../../../guildClient');
import utils = require('../../../../../utils');
import PERMS = require('../perms');

import Playlists = require('../../../../../../music/models/playlists');
import musicPlugin = require('../../../../../music/plugins/music');
import musicPermissions = require('../../../../../../music/permissions');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var playlistId = params.shift();

	if (playlistId == 'create') {
		if (!server.userHasPerm(message.member, PERMS.PLAYLIST_CREATE)) return Command.noPermsMessage('Music');

		Playlists.count({ creator_id: message.member.id }, (err, count) => {
			if (count >= 10) return message.channel.send(Command.error([['Playlist', 'Max Playlists reached.']]));

			Playlists.create({
				creator_id: message.member.id,

				type: 1,
				visibility: 2,

				permissions: Object.values(musicPermissions.PLAYLIST_FLAGS).reduce((all, p) => all | p, 0),

				public_id: uniqueID(9),

				title: 'New Playlist',
				description: 'New Playlist',
			})
			.then(playlist => {
				message.channel.send(Command.info([[
					'Playlist',
					[
						'Successfully created a new Playlist!',
						'',
						'Title: ' + playlist.title,
						'Description: ' + playlist.description,
						'',
						'ID: ' + playlist.public_id
					].join('\n')
				]]));
			}, err => console.error(err))
			.catch(err => console.error(err));
		});
		return;
	}

	var todo = params.shift() || 'info';
	var defaultPlaylist = playlistId == null || (playlistId == 'default');

	if (playlistId == null) todo = 'info';

	if (['info', 'list', 'delete', 'add', 'remove', 'clear', 'title', 'description', 'thumbnail'].indexOf(todo) == -1) return Command.error([['Music', 'Unknown Usage: ' + todo]]);

	if (!server.userHasPerm(message.member, PERMS['PLAYLIST_' + todo.toUpperCase()])) return Command.noPermsMessage('Music');

	switch (todo) {
		case 'info':
			guildClient.getMusic(message.guild.id, (music) => {
				if (defaultPlaylist) playlistId = music.currentPlaylist;

				Playlists.findOne({ public_id: playlistId }, {}, (err, playlist) => {
					if (playlist == null) return message.channel.send(Command.error([['Playlist', 'No Playlist found.']]));

					message.channel.send(Command.info([[
						'Playlist',
						[
							'Title: ' + playlist.title,
							'Description: ' + playlist.description,
							'',
							'Plays: ' + playlist.plays,
							'Views: ' + playlist.views,
							'Items: ' + playlist.song_count,
							'',
							'ID: ' + playlist.public_id
						].join('\n')
					]]));
				});
			});
			break;
		case 'list':
			guildClient.getMusic(message.guild.id, (music) => {
				if (defaultPlaylist) playlistId = music.currentPlaylist;

				var paramPage = params.shift();

				if (paramPage == null || /^[0-9]+$/g.test(paramPage)) {
					var page = 1;
					var maxItems = 5;

					if (page < 1) page = 1;

					if (paramPage != null) {
						var parsed = parseInt(paramPage);
						if (Number.isInteger(parsed)) page = parsed;
					}

					Playlists.findOne({ public_id: playlistId }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } }, (err, item) => {
						if (item.song_count == 0) return message.channel.send(Command.info([['Playlist', 'Nothing in Playlist!']]));

						var maxPages = Math.ceil(item.song_count/5);

						if (page > maxPages) return message.channel.send(Command.info([['Playlist', 'Max pages exceeded!']]));

						musicPlugin.getSong(item.songs.map(i => i.song), (err, songs) => {
							songs = Array.isArray(songs) ? songs : [songs];

							var fields = [
								[
									'Playlist',
									'Items: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
								]
							]

							fields = fields.concat(songs
							.map((q: any, i) => [
								'ID: ' + (((page - 1) * 5) + i + 1),
								[	q.title,
									utils.videoIdToUrl(q.type || 'youtube', q.id)
								].join('\n')
							]));

							return message.channel.send(Command.info(fields));
						});
					});
					return;
				}
			});
			break;
		case 'delete':
			musicPlugin.removePlaylist(playlistId, err => {
				if (err != null) return message.channel.send(Command.error([['Playlist', err]]));
				message.channel.send(Command.info([['Playlist', 'Playlist now queued for deletion.']]));
			});
			break;
		case 'add':
			musicPlugin.addToPlaylist(message.guild.id, message.member.id, playlistId, params.shift(), (err, info) => {
				if (err != null) return message.channel.send(Command.error([['Playlist', err]]));
				message.channel.send(Command.error([['Playlist', 'Added song to playlist.']]));
			});
			break;
		case 'remove':
			musicPlugin.removeFromPlaylist(message.guild.id, message.member.id, playlistId, params.shift(), (err, info) => {
				if (err != null) return message.channel.send(Command.error([['Playlist', err]]));
				message.channel.send(Command.error([['Playlist', 'Removed song from playlist.']]));
			});
			break;
		case 'clear':
			musicPlugin.clearPlaylist(message.guild.id, message.member.id, playlistId, (err, playlist) => {
				if (err != null) return message.channel.send(Command.error([['Playlist', err]]));
				message.channel.send(Command.error([['Playlist', 'Removed song from playlist.']]));
			});
			break;
		case 'title':
			var title = params.join(' ');
			if (title.length == 0) return message.channel.send(Command.error([['Playlist', 'Playlist title cannot be nothing.']]));

			musicPlugin.editPlaylist(playlistId, 'title', title.slice(0, 50), errMsg => {
				message.channel.send(Command.info([['Playlist', 'Updated Playlist title.']]));
			});
			break;
		case 'description':
			var desc = params.join(' ');

			musicPlugin.editPlaylist(playlistId, 'description', desc.slice(0, 1000), errMsg => {
				message.channel.send(Command.info([['Playlist', 'Updated Playlist description.']]));
			});
			break;
		case 'thumbnail':
			var thumb = params.join(' ');

			musicPlugin.editPlaylist(playlistId, 'thumb', thumb, errMsg => {
				message.channel.send(Command.info([['Playlist', 'Updated Playlist thumbnail']]));
			});
			break;
	}
}

function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}


export {
	call
};