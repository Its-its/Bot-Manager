import * as redis from 'redis';
import * as Discord from 'discord.js';
import * as YTDL from 'ytdl-core';

import MusicPlaylist = require('../music/models/playlists');
import MusicHistory = require('../music/models/history');
import MusicQueue = require('../music/models/queue');

import musicPermissions = require('../music/permissions');

import musicPlugin = require('./plugins/music');

import config = require('../site/util/config');

import request = require('request');


let redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });

function sendReq(url: string, opts, cb) {
	return request.post('http://' + config.music.address + ':' + config.music.port + '/' + url)
	.form(opts)
	.on('response', res => cb(null, res.body == null ? { error: 'Music portion errored!' } : JSON.parse(res.body)))
	.on('error', error => cb(error));
}


class Music implements DiscordBot.plugins.Music {
	public guildId: string;

	public lastVoiceChannelId: string;
	public lastTextChannelId: string;

	public playing: DiscordBot.plugins.PlayedSong;

	public guildPlaylist: string;
	public customPlaylist: string;

	public playingFrom = Music.Playlist.Default;

	public repeatQueue = false;
	public repeatSong = false;

	constructor(guildId: string, save: DiscordBot.plugins.MusicOptions) {
		this.guildId = guildId;

		this.playing = save.playing;
		this.lastVoiceChannelId = save.lastVoiceChannelId;
		this.lastTextChannelId = save.lastTextChannelId;
		this.guildPlaylist = save.defaultPlaylist || save.guildPlaylist;
		this.customPlaylist = save.customPlaylist;

		if (save.playingFrom != null) this.playingFrom = save.playingFrom;
		if (save.repeatQueue != null) this.repeatQueue = save.repeatQueue;
		if (save.repeatSong != null) this.repeatSong = save.repeatSong;

		if (this.guildPlaylist == null) {
			MusicPlaylist.create({
				// user_id: null,
				type: 0,

				permissions: Object.values(musicPermissions.PLAYLIST_FLAGS).reduce((all, p) => all | p, 0),

				public_id: uniqueID(9),

				title: 'Default Playlist',
				description: 'Default Playlist for Guild.',
				// thumb: ''
			})
			.then(item => {
				this.guildPlaylist = item.public_id;
				this.save();
			}, err => console.error(err))
			.catch(err => console.error(err));

			MusicQueue.create({
				server_id: this.guildId,
				items: []
			});
		}
	}

	get currentPlaylist() {
		switch(this.playingFrom) {
			case Music.Playlist.Default: return this.guildPlaylist;
			case Music.Playlist.Custom: return this.customPlaylist;
		}
	}

	public hasPlaylistPerms(user_id: string, playlist_id: string, cb: (value: boolean) => any) {
		if (playlist_id == null || this.guildPlaylist == playlist_id) {
			// TODO: Check is has music perms
			if (this.playingFrom == Music.Playlist.Default || this.guildPlaylist == playlist_id)
				return cb(true);

			playlist_id = this.currentPlaylist;
		}

		MusicPlaylist.findOne({ public_id: playlist_id }, (err, playlist) => {
			if (playlist == null) return cb(false);

			cb(playlist['creator_id'] == user_id);
		});
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisMusic.set(this.guildId, this.toString(), cb);
	}

	// Controls
	public play(cb?: (err?: string, newSong?: DiscordBot.plugins.PlayedSong, lastSong?: DiscordBot.plugins.PlayedSong) => any) {
		sendReq('play', {
			guild_id: this.guildId
		}, (err, res) => {
			if (err) { console.error(err); cb && cb('An error occured.'); return; }
			if (res.error) { console.error(err); cb && cb(res.error); return; }
			cb && cb(null, res);
		});
	}

	public sendStop(reason: 'stopped' | 'next' = 'stopped', cb?: (reason: string) => any) {
		sendReq('stop', {
			guild_id: this.guildId,
			reason: reason
		}, () => (cb && cb(reason)));
	}

	public next(cb?: (err: string, newSong: DiscordBot.plugins.PlayedSong, lastSong: DiscordBot.plugins.PlayedSong) => any) {
		console.log(' - next');

		sendReq('next', {
			guild_id: this.guildId
		}, (err, res) => (cb && cb(res.err, res.newSong, res.lastSong)));
	}

	public rejoinVoice(guild?: Discord.Guild, cb?: (err, msg?) => any) {
		sendReq('join', {
			guild_id: guild == null ? this.guildId : guild.id,
			channel_id: this.lastVoiceChannelId
		}, (err, res) => {
			if (err) { console.error(err); cb('An error occured.'); return; }
			if (res.error) { console.error(err); cb(res.error); return; }
			if (res.msg) cb(null, res.msg);
		});
	}


	// Queue
	public clearQueue(cb: (err: any) => any) {
		MusicQueue.updateOne({ server_id: this.guildId }, { $set: { items: [] } }, err => cb(err));
		// MusicQueue.deleteMany({ server_id: this.guildId }, err => cb(err));
	}

	public addToQueue(user: string, song: DiscordBot.plugins.SongGlobal, cb: (err) => any) {
		MusicQueue.findOne({
			server_id: this.guildId
		}, (err, queue: any) => {
			if (queue == null) return cb('WHOOPS! I wasn\'t able to find the queue! My fault.');

			for(var i = 0; i < queue.items.length; i++) {
				if (queue.items[i].id == song.id) return cb('Item already exists in queue.');
			}

			queue.items.push({
				addedBy: user,
				id: song.id
			});

			queue.save(() => cb(null));
		});
	}

	public removeFromQueue(id: string, cb: (err: any) => any) {
		MusicQueue.findOne({ server_id: this.guildId })
		.exec((err, queue: any) => {
			if (queue == null) return cb('Queue not found!');

			for(var i = 0; i < queue.items.length; i++) {
				if (queue.items[i].id == id) {
					queue.items.splice(i, 1);
					return queue.save(err => cb(err));
				}
			}

			cb('No queued item with that id was found.');
		});
	}

	public nextInQueue(cb: (song: DiscordBot.plugins.SongGlobal) => any) {
		MusicQueue.findOne({ server_id: this.guildId }, (err, queue: any) => {
			if (err != null) {
				console.error(err);
				return cb(null);
			}

			var item = (!this.repeatSong ? queue.items.shift() : queue.items[0]);

			if (item == null) return cb(null);

			if (!this.repeatSong && this.repeatQueue) queue.items.push(item);

			queue.save(err => {
				if (err != null) { console.error(err); cb(null); return; }

				musicPlugin.getSong(item.id, (err, songs) => {
					if (err != null) { console.error(err); cb(null); return; }
					songs[0].addedBy = item.addedBy;
					cb(songs[0]);
				});
			});
		});
	}

	public shuffleQueue() {
		// TODO: Use random seed?
	}

	public toggleQueueRepeat(): boolean {
		return this.repeatQueue = !this.repeatQueue;
	}


	// History
	public addToHistory(song: DiscordBot.plugins.PlayedSong) {
		MusicHistory.updateOne({ server_id: this.guildId }, {
			$inc: {
				song_count: 1
			},
			$push: {
				songs: {
					$each: [
						{
							played_at: song.playedAt,
							song_id: song.id
						}
					],
					$slice: 25,
					$position: 0
				}
			},
			$setOnInsert: {
				server_id: this.guildId
			}
		}, { upsert: true }).exec();
	}

	public clearHistory(cb: (err: any) => any) {
		MusicHistory.updateOne({ server_id: this.guildId }, { $set: { songs: [], song_count: 0 } }, err => cb(err));
	}


	// Util
	public isPlaying(cb: (playing: boolean) => any) {
		sendReq('stop', {
			guild_id: this.guildId
		}, (err, res) => cb(res.msg));
	}

	public sendMessageFromGuild(guild: Discord.Guild, message: any) {
		var channel = <Discord.TextChannel>guild.channels.get(this.lastTextChannelId);
		if (channel == null) return console.error('Channel is none existent. - ' + this.lastTextChannelId);
		channel.send(message)
		.catch(e => console.error(e));
	}

	public regrab(cb: (music: Music) => any) {
		getMusic(this.guildId, music => cb(music));
	}

	public playingFromString() {
		if (this.playingFrom == Music.Playlist.Default) return 'Default';
		if (this.playingFrom == Music.Playlist.Custom) return 'Custom';
	}


	public toString() {
		return JSON.stringify({
			lastVoiceChannelId: this.lastVoiceChannelId,
			lastTextChannelId: this.lastTextChannelId,
			guildPlaylist: this.guildPlaylist,
			customPlaylist: this.customPlaylist,
			playingFrom: this.playingFrom,
			repeatQueue: this.repeatQueue,
			repeatSong: this.repeatSong,
			playing: this.playing,
		});
	}

	static Playlist = {
		Default: 0,
		Custom: 1
	}
}

function getMusic(serverId: string,  cb: (music: Music) => any) {
	redisMusic.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		cb(new Music(serverId, str == null ? {} : JSON.parse(str)));
	});
}

function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}


export = Music;