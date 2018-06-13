import guildClient = require('../guildClient');

import Playlists = require('../../music/models/playlists');

import Users = require('../../site/models/users');

import request = require('request');


type SongGlobal = DiscordBot.plugins.SongGlobal;


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

function addToPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, songId: string, cb: (errorMessage?: string, info?: { song: SongGlobal, playlist: any }) => any) {
	if (songId == null) return cb('Please provide an ID to the song.');

	guildClient.getMusic(guildId, (music) => {
		if (playlistPublicId == 'default') playlistPublicId = music.currentPlaylist;

		var val = /(?:(?:https?:\/\/)?(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)([^= &?/\r\n]{8,11})/g.exec(songId);
		if (val == null) val = /^([a-zA-Z0-9-_]{11})$/.exec(songId);

		// TODO:  Search by ID, if failed, search by string?

		if (val != null) {
			var id = val[1];

			getSong(id, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				addTo(song);
			});
		} else {
			searchForSong(songId, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				addTo(song);
			});
		}

		function addTo(song) {
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

						cb(err, song);
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
			$dec: {
				song_count: 1
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

// TODO: return { site name, download url }
function isProperSongUrl(url: string) {
	return /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.test(url) || /^([a-zA-Z0-9-_]){11}$/.test(url);
}



const getSong: newGetSong = <any>function(uri: string | string[], cb: (errorMessage?: string, song?: SongGlobal | SongGlobal[]) => any) {
	request.get('http://ytdl.local/info?force=true&id=' + (typeof uri == 'string' ? uri : uri.join(',')), (err, res) => {
		if (err != null) return cb(err);
		var song = JSON.parse(res.body);
		if (song.error) return cb(song.error);

		song.type = 'youtube';
		delete song['description'];
		delete song['download_count'];
		delete song['stream_count'];
		cb(null, song);
	});
}

function searchForSong(search: string, cb: (errorMsg?: any, song?: SongGlobal) => any) {
	request.get('http://ytdl.local/info?search=' + search, (err, res) => {
		if (err != null) return cb(err);
		var song = JSON.parse(res.body);
		if (song.error) return cb(song.error);
		song.type = 'youtube';
		delete song['description'];
		delete song['download_count'];
		delete song['stream_count'];
		cb(null, song);
	});
}


interface newGetSong {
	(uri: string, cb: (errorMessage?: string, song?: SongGlobal) => any);
	(uri: string[], cb: (errorMessage?: string, song?: SongGlobal[]) => any);
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
	searchForSong
};