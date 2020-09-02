import { DiscordBot } from '@type-manager';


import Playlists = require('../../../music/models/playlists');

import Users = require('../../../site/models/users');

import request = require('request');

import config = require('@config');

import { getMusic } from '../GuildMusic';

import client = require('../../client');


type SongGlobal = DiscordBot.plugins.SongGlobal;


// Bot Shard -> Music Shard
function sendReq(url: string, opts: { [a: string]: any }) {
	client.shard!.send(Object.assign({ from: 'bot', to: 'music', _event: url }, opts));
}

function sendQueue(queueType: string, guild_id: string, member_id: string, channel_id: string, params: string[]) {
	sendReq('queue', {
		_guild: guild_id,
		_channel: channel_id,
		_sender: member_id,

		queue_type: queueType,
		params: params
	});
}

function sendPlay(channel_id: string, guild_id: string, member_id: string, search?: string) {
	sendReq('play', {
		_guild: guild_id,
		_channel: channel_id,
		_sender: member_id,

		search: search
	});
}


// Playlist crap

function createPlaylist(guildId: string, cb: (errorMessage?: string) => any) {
	//
}

function removePlaylist(playlistId: string, cb: (errorMessage?: string) => any) {
	if (playlistId == 'default') return cb('Cannot remove default playlist!');
	Playlists.updateOne({ public_id: playlistId }, { $set: { markedForDeletion: true } }, (err) => cb());
}

function restorePlaylist(playlistId: string, cb: (errorMessage?: string) => any) {
	if (playlistId == 'default') return cb('Cannot restore default playlist!');
	Playlists.updateOne({ public_id: playlistId }, { $set: { markedForDeletion: false } }, (err) => cb());
}

function addToPlaylist(
	guildId: string,
	discordMemberId: string,
	playlistPublicId: string,
	songId: string,
	cb: (errorMessage?: string, info?: { song: SongGlobal, playlist_id: string }) => any)
{
	if (songId == null) return cb('Please provide an ID to the song.');

	getMusic(guildId, (music) => {
		if (music == null) {
			return cb('Unable to get Music. Please try again in a few minutes.');
		}

		if (playlistPublicId == 'default') playlistPublicId = music.currentPlaylist;

		var val = /(?:(?:https?:\/\/)?(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(songId);
		if (val == null) val = /^([a-zA-Z0-9-_]{11})$/.exec(songId);

		// TODO:  Search by ID, if failed, search by string?

		if (val != null) {
			var id = val[1];

			getSong(id, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				if (song == null || song.length == 0) return cb('Unable to find song!');
				addTo(song[0]);
			});
		} else {
			findFirstSong(songId, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				if (song == null) return cb('Unable to find song!');
				addTo(song);
			});
		}

		function addTo(song: DiscordBot.plugins.SongYT) {
			Users.findOne({ 'discord.id': discordMemberId }, (err, user) => {
				if (user == null) return cb('You cannot add songs to a playlist without authenticating your discord account!\nPlease do so here: ');

				Playlists.updateOne(
					{ public_id: playlistPublicId, 'songs.song': { $ne: song.id } },
					{
						$inc: {
							song_count: 1
						},
						$push: {
							songs: {
								user: user.id,
								song: song.id,
								added: Date.now()
							}
						}
					},
					(err, raw) => {
						console.log(raw);

						if (raw.nModified == 0) return cb('Song is already in playlist!');

						cb(err, { song: song, playlist_id: playlistPublicId });
					}
				);
			});
		}
	});
}

function removeFromPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, songId: string, cb: (errorMessage?: string, info?: { song: SongGlobal, playlist: any }) => any) {
	if (songId == null) return cb('Please provide an ID to the song.');

	Playlists.updateOne(
		{ public_id: playlistPublicId, 'songs.song': songId },
		{
			$inc: {
				song_count: -1
			},
			$pull: {
				songs: { song: songId }
			}
		},
		(err, raw) => {
			console.log(raw);
			if (raw.nModified == 0) return cb('Song is not in playlist!');

			cb(err);
		}
	);

	// Song.findOne({ uid: songId }, (err, song) => {
	// 	if (song == null) return;

	// 	Playlists.findOne({ public_id: playlistPublicId }, (err, item) => {
	// 		PlaylistItems.remove({ music_playlist: item.id, music_song: song.id }, () => {
	// 			cb();
	// 		});
	// 	});
	// });
}

function editPlaylist(playlistPublicId: string, type: 'title' | 'description' | 'thumb', value: string, cb: (errMsg?: string) => any) {
	Playlists.updateOne({ public_id: playlistPublicId }, { $set: { [type]: value } }, () => cb());
}

function clearPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, cb: (errorMessage?: string, playlist?: any) => any) {
	Playlists.updateOne({ public_id: playlistPublicId }, { $set: { songs: [] } }, (err, item) => cb());
}


// Utils

interface SongInfoReponse {
	error: any;

	songs: (DiscordBot.plugins.SongYT & {
		description: string;
		download_count: number;
		stream_count: number;
	})[];
}

function getSong(uri: string | string[], cb: (errorMessage?: string, song?: SongGlobal[]) => any) {
	request.get(`http://${config.ytdl.full}/info?force=true&id=` + (typeof uri == 'string' ? uri : uri.join(',')), (err, res) => {
		if (err != null) return cb(err);

		var data: SongInfoReponse = JSON.parse(res.body);

		if (data.error) return cb(data.error);

		var songs = data.songs.map(s => {
			let clone: any = Object.assign({}, s);

			clone.type = 'youtube';

			delete clone['description'];
			delete clone['download_count'];
			delete clone['stream_count'];

			return clone;
		});

		cb(undefined, songs);
	});
}

interface SongSearch {
	nextPageToken?: string;
	previousPageToken?: string;

	totalResults: number;
	resultsPerPage: number;

	items: {
		type: string;
		id: string;
		published: number;
		title: string;
		channel: {
			id: string;
			title: string;
		};
		thumbnail: {
			url: string;
			width: number;
			height: number;
		};
	}[];
}

function searchForSong(search: string, page: string | null | undefined, cb: (errorMsg?: any, data?: SongSearch) => any) {
	request.get(`http://${config.ytdl.full}/search?query=${search}${page == null ? '' : '&pageToken=' + page}`, (err, res) => {
		if (err != null) return cb(err);

		var data = JSON.parse(res.body);

		if (data.error) return cb(data.error);

		cb(null, data);
	});
}

function findFirstSong(search: string, cb: (errorMsg?: any, song?: SongGlobal) => any) {
	request.get(`http://${config.ytdl.full}/info?search=${search}`, (err, res) => {
		if (err != null) return cb(err);
		var song = JSON.parse(res.body);

		if (song.error) return cb(song.error);

		song = song.songs[0];

		if (song == null) return cb('No song found.');

		song.type = 'youtube';
		delete song['description'];
		delete song['download_count'];
		delete song['stream_count'];

		cb(null, song);
	});
}

// TODO: return { site name, download url }
function isProperSongUrl(url: string) {
	return /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.test(url) || /^([a-zA-Z0-9-_]){11}$/.test(url);
}


export {
	createPlaylist,
	removePlaylist,
	restorePlaylist,
	addToPlaylist,
	removeFromPlaylist,
	clearPlaylist,
	editPlaylist,

	isProperSongUrl,
	getSong,
	searchForSong,
	findFirstSong,

	sendReq,
	sendQueue,
	sendPlay
};