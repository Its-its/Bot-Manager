import YouTube = require('youtube-node');

import discordClient = require('../index');

import guildClient = require('../guildClient');
import config = require('../../site/util/config');

import MusicHistory = require('../../music/models/history');
import Playlists = require('../../music/models/playlists');
import PlaylistItems = require('../../music/models/playlist_items');
import Song = require('../../music/models/song');
import Queue = require('../../music/models/queue');

import Users = require('../../site/models/users');

import * as Discord from 'discord.js';

let youTube = new YouTube();
youTube.setKey(config.youtube.key);

type SongGlobal = DiscordBot.plugins.SongGlobal;


// Do everything music and send to socket when executed.

//! HAS to be the middleware for Discord Chat and the Web UI


// Playlist crap

function createPlaylist(guildId: string, cb: (errorMessage?: string) => any) {
	//
}

function removePlaylist(playlistId: string, cb: (errorMessage?: string) => any) {
	if (playlistId == 'default') return cb('Cannot remove default playlist!');
	Playlists.updateOne({ public_id: playlistId }, { $set: { deleting: true } }, (err) => cb());
}

function restorePlaylist(playlistId: string, cb: (errorMessage?: string) => any) {
	if (playlistId == 'default') return cb('Cannot restore default playlist!');
	Playlists.updateOne({ public_id: playlistId }, { $set: { deleting: false } }, (err) => cb());
}

function addToPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, songId: string, cb: (errorMessage?: string, info?: { song: SongGlobal, playlist: any }) => any) {
	if (songId == null) return cb('Please provide an ID to the song.');

	guildClient.getMusic(guildId, (music) => {
		if (playlistPublicId == 'default') playlistPublicId = music.defaultPlaylist;

		Song.findOne({ uid: songId }, (err, songDoc) => {
			if (songDoc == null) {
				getOrCreateSong('youtube', songId, song => addTo(song));
			} else {
				addTo(songDoc);
			}
		});

		function addTo(song) {
			Playlists.findOne({ public_id: playlistPublicId }, (err, playlist) => {
				Users.findOne({ 'discord.id': discordMemberId }, (err, user) => {
					if (user == null) return cb('You cannot add songs to a playlist without authenticating your discord account!\nPlease do so here: ');

					PlaylistItems.create({
						user: user.id,
						playlist: playlist.id,
						song: song._id,
						added: Date.now()
					}, () => cb());
				});
			});
		}
	});
}

function removeFromPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, songId: string, cb: (errorMessage?: string, info?: { song: SongGlobal, playlist: any }) => any) {
	if (songId == null) return cb('Please provide an ID to the song.');
	
	Song.findOne({ uid: songId }, (err, song) => {
		if (song == null) return;

		Playlists.findOne({ public_id: playlistPublicId }, (err, item) => {
			PlaylistItems.remove({ music_playlist: item.id, music_song: song.id }, () => {
				cb();
			});
		});
	});
}

function editPlaylist(playlistPublicId: string, type: 'title' | 'description' | 'thumb', value: string, cb: (errMsg?: string) => any) {
	Playlists.updateOne({ public_id: playlistPublicId }, { $set: { [type]: value } }, () => cb());
}

function clearPlaylist(guildId: string, discordMemberId: string, playlistPublicId: string, cb: (errorMessage?: string, playlist?: any) => any) {
	Playlists.findOne({ public_id: playlistPublicId }, (err, item) => {
		PlaylistItems.remove({ music_playlist: item.id }, (err2) => {
			cb();
		});
	});
}



// Core

function startPlaying(guildId: string, cb: (errorMessage?: string) => any) {
	guildClient.getMusic(guildId, music => {
		if (music.isPlaying()) return cb('Already playing music!');

		Queue.findOne({ server_id: guildId }, (err, queue: any) => {
			if (queue.items.length == 0) return cb('No music in queue!');

			music.next(); // TODO: make callback
			cb(null);
		});
	});
}

function startPlayingSong(guildId: string, uriOrSearch: string, cb: (errorMessage?: string, song?: SongGlobal) => any) {
	guildClient.getMusic(guildId, music => {
		var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.exec(uriOrSearch);

		if (val != null) {
			var id = val[1];

			getSong(id, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);

				music.play(song);
				cb(null, song);
			})
		} else {
			searchForSong(uriOrSearch, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);

				music.play(song);
				cb(null, song);
			});
		}
	});
}

function stopPlaying(guildId: string, cb: (errorMessage?: string) => any) {
	guildClient.getMusic(guildId, music => {
		music.stop(); // TODO: make callback
		cb();
	});
}

function nextSong(guildId: string, cb: (errMsg?: string) => any) {
	guildClient.getMusic(guildId, music => {
		music.next(); // TODO: make callback
		cb();
	});
}


function joinVoiceChannel(guildId: string, channelId: string, cb: (errMsg?: string) => any) {
	var channel = discordClient.client.channels.get(channelId);

	if (channel != null && channel.type == 'voice') {
		guildClient.getMusic(guildId, music => {
			music.lastVoiceChannelId = channel.id;
			music.playing = null;
			music.save();

			joinChannel(<any>channel, () => cb());
		});
	} else cb([
		'Unable to join channel provided.',
		'Please right click the VOICE Channel and click "Copy ID" !music join <id>',
		'OR',
		'Join the VOICE channel and do !music join'
	].join('\n'));
}


// Queue
function queueToggleRepeat(guildId: string, cb: (value: boolean) => any) {
	guildClient.getMusic(guildId, music => {
		cb(music.toggleQueueRepeat());
	});
}

function queueClear(guildId: string, cb: (err?: any) => any) {
	guildClient.getMusic(guildId, music => {
		music.clearQueue(err => cb(err));
	});
}

function queueShuffle(guildId: string, cb: () => any) {
	guildClient.getMusic(guildId, music => {
		music.shuffleQueue();
		cb();
	});
}

function queueRemoveItem(guildId: string, item, cb: (err?: any) => any) {
	guildClient.getMusic(guildId, music => {
		music.removeFromQueue(item, err => {
			cb(err);
		});
	});
}

function queueSong(guildId: string, memberId: string, uriOrSearch: string, cb: (errorMessage?: string, song?: SongGlobal) => any) {
	guildClient.getMusic(guildId, music => {
		var val = /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.exec(uriOrSearch);

		if (val != null) {
			var id = val[1];

			getSong(id, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				music.addToQueue(memberId, song, err => cb(err, song));
			})
		} else {
			searchForSong(uriOrSearch, (errMsg, song) => {
				if (errMsg != null) return cb(errMsg);
				music.addToQueue(memberId, song, err => cb(err, song));
			});
		}
	});
}

function queuePlaylist(guildId: string, playlistId: string, cb: (err?: any, count?: number) => any) {
	if (playlistId == null) return cb('No playlist ID specified! Please use an ID or "default"');

	guildClient.getMusic(guildId, music => {
		if (playlistId == 'default') playlistId = music.defaultPlaylist;

		Playlists.findOne({ public_id: playlistId }, (err, playlist) => {
			PlaylistItems.count({ playlist: playlist.id }, (err, count) => {
				if (count == 0) return cb('Nothing to queue! No songs present in playlist.');

				PlaylistItems.find({ playlist: playlist.id }, (err, items) => {
					Queue.updateOne({ server_id: music.guildId }, {
						$set: {
							items: items.map(i => {
								return {
									addedBy: 'playlist',
									server_id: music.guildId,
									song: i['song']
								}
							})
						}
					}, (err) => {
						cb(null, items.length);
					});
				});
			});
		});
	});
}



// Utils

// TODO: return { site name, download url }
function isProperSongUrl(url: string) {
	return /(?:(?:https?:\/\/)(?:www)?\.?(?:youtu\.?be)(?:\.com)?\/(?:.*[=/])*)?([^= &?/\r\n]{8,11})/g.test(url);
}

function getSong(uri: string, cb: (errorMessage?: string, song?: SongGlobal) => any) {
	youTube.getById(uri, (err, resp) => {
		if (err) { cb('An Unknown error occured.'); return console.error(err); }

		var item = resp.items[0];

		if (item == null) return cb('Could not find song: "' + uri + '"');	
		if (item.kind != 'youtube#video') return cb('Not a Video!');

		itemToSong('youtube', item, song => cb(null, song));
	});
}

function searchForSong(search: string, cb: (errorMsg?: any, song?: SongGlobal) => any) {
	youTube.search(search, 4, (error, result) => {
		if (error) { cb('An Unknown error occured.'); return console.error(error); }

		var items = result.items;

		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			if (item.id.kind == 'youtube#video') {
				itemToSong('youtube', item, song => cb(null, song));
				return;
			}
		}

		cb('Couldn\'t find the song! Try searching for it first or use the songs ID instead of name.');
	});
}


function itemToSong(type: 'youtube', item: any, cb?: (song: SongGlobal) => any) {
	if (type == 'youtube') {
		var song: SongGlobal = {
			type: type,
			_id: null,
			uid: item.id.videoId || item.id,
			title: item.snippet.title,
			length: ytDurationToSeconds(item.contentDetails.duration),
			thumb: item.snippet.thumbnails.default.url,
			uploaded: new Date(item.snippet.publishedAt).getTime(),
			channelId: item.snippet.channelId
		};

		Song.findOne({ type: type, uid: song.uid }, (err, item) => {
			if (item != null) {
				song._id = item.id;
				return cb(song);
			}

			Song.create({
				type: song.type,
				uid: song.uid,
				title: song.title,
				length: song.length,
				uploaded: song.uploaded,
				thumb: song.thumb,
				uploader_id: song.channelId
			})
			.then(item => {
				song._id = item.id;
				cb(song);
			}, err => console.error(err))
			.catch(err => console.error(err));
		});
	}
}

function getOrCreateSong(type: 'youtube', uid: string, cb: (song: SongGlobal) => any) {
	Song.findOne({ type: type, uid: uid }, (err, songDoc: any) => {
		if (songDoc != null) return cb({
			type: songDoc.type,
			_id: songDoc.id,
			uid: songDoc.uid,
			title: songDoc.title,
			length: songDoc.length,
			thumb: songDoc.thumb,
			uploaded: songDoc.uploaded,
			channelId: songDoc.uploader_id
		});

		youTube.getById(idToUrl(type, uid), (err, resp) => {
			itemToSong('youtube', resp.items[0], song => cb(song));
		});
	});
}


function ytDurationToSeconds(duration: string): number {
	var time = /PT(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(duration);
	var seconds = 0;
	
	if (time[1] != null) seconds += parseInt(time[1]) * 60 * 60 * 24;
	if (time[2] != null) seconds += parseInt(time[2]) * 60 * 60;
	if (time[3] != null) seconds += parseInt(time[3]) * 60;
	if (time[4] != null) seconds += parseInt(time[4]);

	return seconds;
}

function joinChannel(voiceChannel: Discord.VoiceChannel, cb: (err?: string) => any) {
	voiceChannel.join()
	.then(connection => cb())
	.catch(err => { console.error(err); cb(err); });
}

function idToUrl(site: 'youtube', id: string) {
	if (site == 'youtube') return 'https://youtu.be/' + id;
	return 'Unknwon: ' + id + ' - ' + site;
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

	queueToggleRepeat,
	queueClear,
	queueShuffle,
	queueRemoveItem,
	queueSong,
	queuePlaylist,

	startPlaying,
	startPlayingSong,
	stopPlaying,
	nextSong,

	joinVoiceChannel
}