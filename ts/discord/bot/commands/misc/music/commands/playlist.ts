import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

import DiscordMembers = require('@discord/models/members');


import guildClient = require('@discord/guildClient');
import utils = require('@discord/utils');
import PERMS = require('../perms');

import Playlists = require('@base/music/models/playlists');
import musicPlugin = require('@discord/music/plugins/music');
import musicPermissions = require('@base/music/permissions');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let playlistId = params.shift();

	if (playlistId == 'create') {
		if (!server.userHasPerm(message.member!, PERMS.PLAYLIST_CREATE)) return Command.noPermsMessage('Music');

		let member = await DiscordMembers.findOne({ did: message.member!.id });

		if (member == null) {
			await message.channel.send(Command.error([['Playlist', 'Unable to find user. Please']]));
			return Promise.resolve();
		}


		let count = await Playlists.count({ creator: member._id });

		if (count >= 10) {
			await message.channel.send(Command.error([['Playlist', 'Max Playlists reached.']]));
			return Promise.resolve();
		}

		// @ts-ignore
		let playlist = await Playlists.create({
			creator: member._id,

			type: 1,
			visibility: 2,

			permissions: Object.values(musicPermissions.PLAYLIST_FLAGS).reduce((all, p) => all | p, 0),

			public_id: uniqueID(9),

			title: 'New Playlist',
			description: 'New Playlist',
		});

		await message.channel.send(Command.info([[
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

		return Promise.resolve();
	}

	let todo = params.shift() || 'info';
	let defaultPlaylist = playlistId == null || (playlistId == 'default');

	if (playlistId == null) todo = 'info';

	if (['info', 'list', 'delete', 'add', 'remove', 'clear', 'title', 'description', 'thumbnail'].indexOf(todo) == -1) return Command.error([['Music', 'Unknown Usage: ' + todo]]);

	// @ts-ignore
	if (!server.userHasPerm(message.member!, PERMS['PLAYLIST_' + todo.toUpperCase()])) return Command.noPermsMessage('Music');

	switch (todo) {
		case 'info': {
			let music = await guildClient.getMusic(message.guild!.id);

			if (music == null) {
				await message.channel.send(Command.error([['Playlist', 'Unbale to find Music']]));
				return Promise.resolve();
			}

			if (defaultPlaylist) playlistId = music.currentPlaylist;

			let playlist = await Playlists.findOne({ public_id: playlistId }, {});

			if (playlist == null) {
				await message.channel.send(Command.error([['Playlist', 'No Playlist found.']]));
				return Promise.resolve();
			}

			await message.channel.send(Command.info([[
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

			break;
		}

		case 'list': {
			let music = await guildClient.getMusic(message.guild!.id);

			if (music == null) {
				await message.channel.send(Command.error([['Playlist', 'Unable to find Music']]));
				return Promise.resolve();
			}

			if (defaultPlaylist) playlistId = music.currentPlaylist;

			let paramPage = params.shift();

			if (paramPage == null || /^[0-9]+$/g.test(paramPage)) {
				let page = 1;
				let maxItems = 5;

				if (page < 1) page = 1;

				if (paramPage != null) {
					let parsed = parseInt(paramPage);
					if (Number.isInteger(parsed)) page = parsed;
				}

				let item = await Playlists.findOne({ public_id: playlistId }, { songs: { $slice: [(page - 1) * maxItems, maxItems] } });

				if (item == null) {
					await message.channel.send(Command.error([['Playlist', 'Unable to find Playlist']]));
					return Promise.resolve();
				}

				if (item.song_count == 0) {
					await message.channel.send(Command.info([['Playlist', 'Nothing in Playlist!']]));
					return Promise.resolve();
				}

				let maxPages = Math.ceil(item.song_count/5);

				if (page > maxPages) {
					await message.channel.send(Command.info([['Playlist', 'Max pages exceeded!']]));
					return Promise.resolve();
				}

				let songs = await musicPlugin.getSong(item.songs.map(i => i.song));

				if (songs == null) {
					await message.channel.send(Command.error([['Playlist', 'Unable to find Songs']]));
					return Promise.resolve();
				}

				songs = Array.isArray(songs) ? songs : [songs];

				let fields: [string, string][] = [
					[
						'Playlist',
						'Items: ' + item.song_count + '\nPage: ' + page + '/' + maxPages
					]
				]

				fields = fields.concat(songs
				.map((q, i) => [
					'ID: ' + (((page - 1) * 5) + i + 1),
					[	q.title,
						utils.videoIdToUrl(q.type || 'youtube', q.id)
					].join('\n')
				]));

				await message.channel.send(Command.info(fields));

				return Promise.resolve();
			}
			break;
		}

		case 'delete': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			await musicPlugin.removePlaylist(playlistId);

			await message.channel.send(Command.info([['Playlist', 'Playlist now queued for deletion.']]));

			break;
		}

		case 'add': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			if (params.length == 0) {
				await message.channel.send(Command.error([['Playlist', 'Invalid Params']]));
				return Promise.resolve();
			}

			await musicPlugin.addToPlaylist(message.guild!.id, message.member!.id, playlistId, params.shift()!);

			await message.channel.send(Command.error([['Playlist', 'Added song to playlist.']]));

			break;
		}

		case 'remove': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			if (params.length == 0) {
				await message.channel.send(Command.error([['Playlist', 'Invalid Params']]));
				return Promise.resolve();
			}

			await musicPlugin.removeFromPlaylist(message.guild!.id, message.member!.id, playlistId, params.shift()!);

			await message.channel.send(Command.error([['Playlist', 'Removed song from playlist.']]));

			break;
		}

		case 'clear': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			await musicPlugin.clearPlaylist(message.guild!.id, message.member!.id, playlistId);

			await message.channel.send(Command.error([['Playlist', 'Removed song from playlist.']]));

			break;
		}

		case 'title': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			let title = params.join(' ');
			if (title.length == 0) {
				await message.channel.send(Command.error([['Playlist', 'Playlist title cannot be nothing.']]));
				return Promise.resolve();
			}

			await musicPlugin.editPlaylist(playlistId, 'title', title.slice(0, 50));

			await message.channel.send(Command.info([['Playlist', 'Updated Playlist title.']]));

			break;
		}

		case 'description': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			let desc = params.join(' ');

			await musicPlugin.editPlaylist(playlistId, 'description', desc.slice(0, 1000));

			await message.channel.send(Command.info([['Playlist', 'Updated Playlist description.']]));

			break;
		}

		case 'thumbnail': {
			if (playlistId == null) {
				await message.channel.send(Command.error([['Playlist', 'No playlist ID specified']]));
				return Promise.resolve();
			}

			let thumb = params.join(' ');

			await musicPlugin.editPlaylist(playlistId, 'thumb', thumb);

			await message.channel.send(Command.info([['Playlist', 'Updated Playlist thumbnail']]));

			break;
		}
	}
}

function uniqueID(size: number): string {
	let bloc = [];

	for(let i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}


export {
	call
};