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

async function createPlaylist(guildId: string) {
	return Promise.resolve();
}

async function removePlaylist(playlistId: string) {
	if (playlistId == 'default') return Promise.reject('Cannot remove default playlist!');

	await Playlists.updateOne({ public_id: playlistId }, { $set: { markedForDeletion: true } }).exec();

	return Promise.resolve();
}

async function restorePlaylist(playlistId: string) {
	if (playlistId == 'default') return Promise.reject('Cannot restore default playlist!');

	await Playlists.updateOne({ public_id: playlistId }, { $set: { markedForDeletion: false } }).exec();

	return Promise.resolve();
}

async function addToPlaylist(
	guildId: string,
	discordMemberId: string,
	playlistPublicId: string,
	songId: string
) {
	if (songId == null) return Promise.reject('Please provide an ID to the song.');

	let music = await getMusic(guildId);

	if (playlistPublicId == 'default') playlistPublicId = music.currentPlaylist;

	let val = /(?:(?:https?:\/\/)?(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(songId);
	if (val == null) val = /^([a-zA-Z0-9-_]{11})$/.exec(songId);

	// TODO:  Search by ID, if failed, search by string?

	if (val != null) {
		let id = val[1];

		let song = await getSong(id);

		if (song == null || song.length == 0) {
			return Promise.reject('Unable to find song!');
		}

		return addTo(song[0]);
	} else {
		let song = await findFirstSong(songId);

		if (song == null) {
			return Promise.reject('Unable to find song!');
		}

		return addTo(song);
	}

	async function addTo(song: DiscordBot.plugins.SongYT) {
		let user = await Users.findOne({ 'discord.id': discordMemberId });

		if (user == null) return Promise.reject('You cannot add songs to a playlist without authenticating your discord account!\nPlease do so here: ');

		let raw = await Playlists.updateOne(
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
		).exec();

		console.log(raw);

		if (raw.nModified == 0) return Promise.reject('Song is already in playlist!');

		return Promise.resolve({ song: song, playlist_id: playlistPublicId });
	}
}

async function removeFromPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, songId: string) {
	if (songId == null) return Promise.reject('Please provide an ID to the song.');

	let raw = await Playlists.updateOne(
		{ public_id: playlistPublicId, 'songs.song': songId },
		{
			$inc: {
				song_count: -1
			},
			$pull: {
				songs: { song: songId }
			}
		}
	).exec();

	console.log(raw);

	if (raw.nModified == 0) return Promise.reject('Song is not in playlist!');

	return Promise.resolve();

	// Song.findOne({ uid: songId }, (err, song) => {
	// 	if (song == null) return;

	// 	Playlists.findOne({ public_id: playlistPublicId }, (err, item) => {
	// 		PlaylistItems.remove({ music_playlist: item.id, music_song: song.id }, () => {
	// 			cb();
	// 		});
	// 	});
	// });
}

async function editPlaylist(playlistPublicId: string, type: 'title' | 'description' | 'thumb', value: string) {
	await Playlists.updateOne({ public_id: playlistPublicId }, { $set: { [type]: value } }).exec();

	return Promise.resolve();
}

async function clearPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string) {
	await Playlists.updateOne({ public_id: playlistPublicId }, { $set: { songs: [] } }).exec();

	return Promise.resolve();
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

async function getSong(uri: string | string[]) {
	return new Promise<SongGlobal[]>((resolve, reject) => {
		request.get(`http://${config.ytdl.full}/info?force=true&id=` + (typeof uri == 'string' ? uri : uri.join(',')), (err, res) => {
			if (err != null) return reject(err);

			let data: SongInfoReponse = JSON.parse(res.body);

			if (data.error) return reject(data.error);

			let songs = data.songs.map(s => {
				let clone: any = Object.assign({}, s);

				clone.type = 'youtube';

				delete clone['description'];
				delete clone['download_count'];
				delete clone['stream_count'];

				return clone;
			});

			resolve(songs);
		});
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

async function searchForSong(search: string, page: string | null | undefined) {
	return new Promise<SongSearch>((resolve, reject) => {
		request.get(`http://${config.ytdl.full}/search?query=${search}${page == null ? '' : '&pageToken=' + page}`, (err, res) => {
			if (err != null) return reject(err);

			let data = JSON.parse(res.body);

			if (data.error) return reject(data.error);

			resolve(data);
		});
	});
}

async function findFirstSong(search: string) {
	return new Promise<SongGlobal | null>((resolve, reject) => {
		request.get(`http://${config.ytdl.full}/info?search=${search}`, (err, res) => {
			if (err != null) return reject(err);

			let song = JSON.parse(res.body);

			if (song.error) return reject(song.error);

			song = song.songs[0];

			if (song == null) return resolve(null);

			song.type = 'youtube';
			delete song['description'];
			delete song['download_count'];
			delete song['stream_count'];

			resolve(song);
		});
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