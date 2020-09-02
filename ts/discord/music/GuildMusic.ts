import { DiscordBot } from '@type-manager';


import redis = require('redis');
import Discord = require('discord.js');

import MusicPlaylist = require('@music/models/playlists');
import MusicHistory = require('@music/models/history');
import MusicQueue = require('@music/models/queue');

import musicPermissions = require('@music/permissions');

import musicPlugin = require('./plugins/music');

import config = require('@config');


let redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });



class Music implements DiscordBot.plugins.Music {
	public guildId: string;

	public lastVoiceChannelId: string;
	public lastTextChannelId: string;

	public playing?: DiscordBot.plugins.PlayedSong;

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
			// @ts-ignore
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
			case Music.Playlist.Custom: return this.customPlaylist;
			case Music.Playlist.Default:
			default:
				return this.guildPlaylist;
		}
	}

	public hasPlaylistPerms(user_id: string, playlist_id: string | undefined, cb: (value: boolean) => any) {
		if (playlist_id == null || this.guildPlaylist == playlist_id) {
			// TODO: Check is has music perms
			if (this.playingFrom == Music.Playlist.Default || this.guildPlaylist == playlist_id)
				return cb(true);

			playlist_id = this.currentPlaylist;
		}

		MusicPlaylist.findOne({ public_id: playlist_id }, (err, playlist) => {
			if (playlist == null) return cb(false);

			cb(playlist.creator.toString() == user_id);
		});
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisMusic.set(this.guildId, this.toString(), cb);
	}

	// Controls
	// public play() {
	// 	//
	// }

	// public sendStop(reason: 'stopped' | 'next' = 'stopped') {
	// 	//
	// }

	// public next() {
	// 	//
	// }

	// public rejoinVoice(guild?: Discord.Guild) {
	// 	//
	// }


	// Queue
	public clearQueue(cb: (err: string) => any) {
		MusicQueue.updateOne({ server_id: this.guildId }, { $set: { items: [] } }, err => cb(err));
		// MusicQueue.deleteMany({ server_id: this.guildId }, err => cb(err));
	}

	public addToQueue(user: string, song: DiscordBot.plugins.SongGlobal, cb: (err?: string) => any) {
		MusicQueue.findOne({
			server_id: this.guildId
		}, (err, queue: any) => {
			if (queue == null) return cb('WHOOPS! I wasn\'t able to find the queue! My fault.');

			for(let i = 0; i < queue.items.length; i++) {
				if (queue.items[i].id == song.id) return cb('Item already exists in queue.');
			}

			queue.items.push({
				addedBy: user,
				id: song.id
			});

			queue.save(() => cb());
		});
	}

	public removeFromQueue(id: string, cb: (err: any) => any) {
		MusicQueue.findOne({ server_id: this.guildId })
		.exec((err, queue: any) => {
			if (err != null) return cb('An Error Occured trying to query the Database.');
			if (queue == null) return cb('Queue not found!');

			for(let i = 0; i < queue.items.length; i++) {
				if (queue.items[i].id == id) {
					queue.items.splice(i, 1);
					return queue.save((err: any) => cb(err));
				}
			}

			cb('No queued item with that id was found.');
		});
	}

	public nextInQueue(cb: (song?: DiscordBot.plugins.SongGlobal) => any) {
		MusicQueue.findOne({ server_id: this.guildId }, (err, queue: any) => {
			if (err != null) {
				console.error(err);
				return cb();
			}

			let item = (!this.repeatSong ? queue.items.shift() : queue.items[0]);

			if (item == null) return cb();

			if (!this.repeatSong && this.repeatQueue) queue.items.push(item);

			queue.save((err: any) => {
				if (err != null) { console.error(err); cb(); return; }

				musicPlugin.getSong(item.id, (err, songs) => {
					if (err != null) { console.error(err); cb(); return; }
					if (songs == null) { console.error('No songs found.'); cb(); return; }
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
	// public isPlaying(cb: (playing: boolean) => any) {
	// 	//
	// }

	public sendMessageFromGuild(guild: Discord.Guild, message: any) {
		let channel = <Discord.TextChannel>guild.channels.cache.get(this.lastTextChannelId);
		if (channel == null) return console.error('Channel is none existent. - ' + this.lastTextChannelId);
		channel.send(message)
		.catch(e => console.error(e));
	}

	public regrab(cb: (music?: Music) => any) {
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

function getMusic(serverId: string,  cb: (music?: Music) => any) {
	redisMusic.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(); }
		cb(new Music(serverId, str == null ? {} : JSON.parse(str)));
	});
}

function uniqueID(size: number): string {
	let bloc = [];

	for(let i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}


export {
	Music,
	getMusic
};