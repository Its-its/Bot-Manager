import * as redis from 'redis';
import * as Discord from 'discord.js';
import * as YTDL from 'ytdl-core';

import config = require('../site/util/config');

import MusicPlaylist = require('../music/models/playlists');
import MusicHistory = require('../music/models/history');
import MusicQueue = require('../music/models/queue');
import Song = require('../music/models/song');

import DiscordServers = require('../site/models/discord_servers');

import intervalPlugin = require('./plugins/interval');
import discordClient = require('./index');

// IDEA: Temporarily store music in object? After it isn't used for X minutes delete it.
//! Remove at some point Discord.js already has this build in.
let dispatchers: { [id: string]: Discord.StreamDispatcher } = {};

let tempdis = [];


let redisGuildsClient = redis.createClient({ db: config.redis.guildsDB });
let redisMusic = redis.createClient({ db: config.redis.musicDB });

function put(serverId: string, server: Server, cb?: () => any) {
	redisGuildsClient.set(serverId, JSON.stringify(server), cb);
}

function exists(serverId: string, cb: (client: boolean) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(false); }
		if (str == null) cb(false);
		cb(true);
	});
}

function get(serverId: string, cb: (client: Server) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); return; }
		if (str == null) return cb(null); // TODO: Check DB?
		cb(new Server(serverId, JSON.parse(str)));
	});
}


function getMusic(serverId: string,  cb: (music: Music) => any) {
	redisMusic.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		cb(new Music(serverId, str == null ? {} : JSON.parse(str)));
	});
}


export {
	exists,
	put,
	get,
	getMusic,
	Server
};


class Music implements DiscordBot.plugins.Music {
	public guildId: string;

	public lastVoiceChannelId: string;
	public lastTextChannelId: string;

	public playing: DiscordBot.plugins.PlayedSong;

	public defaultPlaylist: string;
	public customPlaylist: string;

	public playingFrom = Music.Playlist.Default;

	public repeatQueue = false;
	public repeatSong = false;

	constructor(guildId: string, save: DiscordBot.plugins.MusicOptions) {
		this.guildId = guildId;

		this.playing = save.playing;
		this.lastVoiceChannelId = save.lastVoiceChannelId;
		this.lastTextChannelId = save.lastTextChannelId;
		this.defaultPlaylist = save.defaultPlaylist;
		this.customPlaylist = save.customPlaylist;

		if (save.playingFrom != null) this.playingFrom = save.playingFrom;
		if (save.repeatQueue != null) this.repeatQueue = save.repeatQueue;
		if (save.repeatSong != null) this.repeatSong = save.repeatSong;

		if (this.defaultPlaylist == null) {
			MusicPlaylist.create({
				// user_id: null,
				type: 'default',

				public_id: uniqueID(9),
				plays: 0,
				views: 0,

				title: 'Default Playlist',
				description: 'Default Playlist for Guild.',
				// thumb: ''
			})
			.then(item => {
				this.defaultPlaylist = item.id;
				this.save();
			}, err => console.error(err))
			.catch(err => console.error(err));

			MusicQueue.create({
				server_id: this.guildId,
				items: []
			});
		}
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisMusic.set(this.guildId, this.toString(), cb);
	}

	// Controls
	public play(song?: DiscordBot.plugins.SongGlobal, trys = 0): boolean {
		var guild = discordClient.client.guilds.get(this.guildId);
		if (guild == null) { console.error('UNKNOWN GUILD ID!!!! - ' + this.guildId); return false; }

		var conn = discordClient.client.voiceConnections.get(this.guildId);

		if (conn != null) {
			if (this.isPlaying()) {
				if (song == null) return false; // Currently playing a song, no url specified.
				else this.stop(); // Stop song, new song ready to play
			}

			this.nextInQueue(song => {
				if (song == null) {
					this.sendMessageFromGuild(guild, 'End of Queue.');
					return;
				}

				var streamUrl = uidToStreamUrl(song.type, song.uid);

				if (streamUrl == null) {
					console.error('Invalid song type: ' + song.type + ' | ' + song.uid + ' | ' + song._id);
					return;
				}

				var stream = YTDL(streamUrl, { filter: 'audioonly' });
				var dispatcher = dispatchers[this.guildId] = conn.playStream(stream);

				tempdis.push(dispatcher);

				stream.on('info', info => {
					this.playing = Object.assign(song, { playedAt: Date.now() });

					var avatarURL = '';
					
					if (this.playing.addedBy != null) {
						var member = discordClient.client.users.get(this.playing.addedBy);
						if (member != null) avatarURL = member.avatarURL;
					}

					this.sendMessageFromGuild(guild, generateFullSong(
						'Now Playing', avatarURL, 
						song.title, song.thumb, '' + song.length,
						song.channelId, new Date(song.uploaded).toISOString()));
	
					this.addToHistory(this.playing);
					this.save();
				});

				dispatcher.on('end', (reason) => {
					delete dispatchers[this.guildId];
					this.playing = null;
		
					if (reason == 'stopped') {
						this.save();
					} else {
						this.regrab(music => {
							music.playing = null;
							music.play();
						});
					}
				});

				dispatcher.on('error', (...e) => console.log('dispatcher', ...e));
			});
		} else {
			// If the bot is QUICKLY restarted it doesn't leave the voice channel and it doesn't know it's still in it.
			if (trys >= 3) { console.error('Attempted to join Voice Channel 3 times. Now stopping. - ' + this.lastVoiceChannelId); return false;}
			return this.joinVoice(guild, () => this.play(song, trys + 1));
		}
	}

	public stop(reason: 'stopped' | 'next' = 'stopped'): boolean {
		var dispatcher = dispatchers[this.guildId];

		if (dispatcher == null) return false;
		dispatcher.end(reason);

		return true;
	}

	public next(): boolean {
		console.log(' - next');
		if (this.isPlaying()) {
			if (!this.stop('next')) return this.play();
			return true;
		} else return this.play();
	}

	public joinVoice(guild?: Discord.Guild, cb?: () => any): boolean {
		var guild = guild || discordClient.client.guilds.get(this.guildId);
		if (guild == null) return false;
		var voiceChannel = <Discord.VoiceChannel>guild.channels.get(this.lastVoiceChannelId);
		if (voiceChannel == null) return false;

		voiceChannel.join()
		.then(connection => cb && cb())
		.catch(err => console.error(err));
		return true;
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
				if (queue.items[i].song == song._id) return cb('Item already exists in queue.');
			}

			queue.items.push({
				addedBy: user,
				song: song._id
			});

			queue.save(() => cb(null));
		});
	}

	public removeFromQueue(id: string, cb: (err: any) => any) {
		MusicQueue.findOne({ server_id: this.guildId })
		.populate('items.song')
		.exec((err, queue: any) => {
			if (queue == null) return cb('Queue not found!');

			for(var i = 0; i < queue.items.length; i++) {
				if (queue.items[i].song.uid == id) {
					queue.items.splice(i, 1);
					return queue.save(err => cb(err));
				}
			}

			cb('No queued item with that id was found.');
		});
	}

	public nextInQueue(cb: (song: DiscordBot.plugins.SongGlobal) => any) {
		if (!this.repeatSong) {
			MusicQueue.findOne({ server_id: this.guildId }, (err, queue: any) => {
				var item = queue.items.shift();

				if (this.repeatQueue) {
					queue.items.push(item);
				}

				queue.save(err => {
					Song.populate(item, { path: 'song' }, (err, itemPopped: any) => {
						if (itemPopped == null) return cb(null);
						var song = itemPopped.song;

						cb({
							_id: song.id,
							type: song.type,
							uid: song.uid,
							title: song.title,
							length: song.length,
							uploaded: song.uploaded,
							thumb: song.thumb,
							channelId: song.uploader_id,
							addedBy: itemPopped.addedBy
						});
					});
				});
			});
		}
	}

	public shuffleQueue() {
		// TODO: Use random seed?
	}

	public toggleQueueRepeat(): boolean {
		return this.repeatQueue = !this.repeatQueue;
	}


	// History
	public addToHistory(song: DiscordBot.plugins.PlayedSong) {
		new MusicHistory({
			played_at: song.playedAt,
			server_id: this.guildId,
			song: song._id
		}).save(() => {});
		// if (this.history.length == maxHistorySize) this.history.splice(0, 1);
		// this.history.push(song);
	}

	public clearHistory(cb: (err: any) => any) {
		MusicHistory.remove({ server_id: this.guildId }, err => cb(err));
		// this.history = [];
	}


	// Util
	public isPlaying(): boolean {
		return dispatchers[this.guildId] != null;
	}

	public sendMessage(message: string, error = false) {
		var guild = discordClient.client.guilds.get(this.guildId);
		if (guild == null) return console.error('UNKNOWN GUILD ID!!!! - ' + this.guildId);
		this.sendMessageFromGuild(guild, message, error);
	}

	public sendMessageFromGuild(guild: Discord.Guild, message: any, error = false) {
		var channel = <Discord.TextChannel>guild.channels.get(this.lastTextChannelId);
		if (channel == null) return console.error('Channel is none existent. - ' + this.lastTextChannelId);
		channel.send(message);
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
			defaultPlaylist: this.defaultPlaylist,
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


let server = {
	maxPhraseResponses: 2,
	maxPhraseText: 5
};

class Server implements DiscordBot.Server {
	serverId: string;

	region: string;

	moderation: DiscordBot.Moderation = {
		blacklisted: [], whitelisted: [],
		ignoredChannels: [], ignoredUsers: [],
		disabledCommands: []
	};

	intervals: DiscordBot.Interval[];
	ranks: string[];
	commands: DiscordBot.Command[];
	phrases: DiscordBot.Phrase[];
	roles: DiscordBot.Role[];
	plugins: DiscordBot.Plugin = {
		commands: {
			enabled: false,
			perms: true
		},
		music: {
			enabled: false,
			perms: true
		},
		interval: {
			enabled: false,
			perms: true
		},
		rssfeed: {
			enabled: false,
			perms: true
		},
		logs: {
			enabled: false,
			perms: true
		}
	};
	values;

	permissions: DiscordBot.Permissions = {
		roles: {}, users: {}, groups: {}
	};

	constructor(serverID: string, options?: DiscordBot.ServerOptions) {
		this.serverId = serverID;

		this.region = options.region;
		this.intervals = options.intervals || [];
		this.ranks = options.ranks || [];
		this.roles = options.roles || [];
		this.commands = options.commands || [];
		this.phrases = options.phrases || [];
		this.plugins = options.plugins || {};
		this.values = options.values || {};
		if (options.moderation) this.moderation = options.moderation;
		if (options.permissions) this.permissions = options.permissions;
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisGuildsClient.set(this.serverId, this.toString(), cb);
		DiscordServers.findOneAndUpdate({ server_id: this.serverId }, { $set: { server: this.toDBPrint() } });
	}

	// Phrases
	public createPhrase(phraseText: string[]): DiscordBot.Phrase {
		phraseText.slice(0, server.maxPhraseText);

		if (this.findPhrase(phraseText) != null) return null;

		var phrase = {
			phrases: phraseText,
			responses: []
		};

		this.phrases.push(phrase);

		return phrase;
	}

	public removePhrase(id: number, phrases?: string[]): DiscordBot.Phrase {
		if (this.phrases.length < id) return null;

		var phrase = this.phrases[id - 1];

		if (phrases == null) {
			delete this.phrases[id - 1];
		} else {
			phrases.forEach(p => {
				var index = phrase.phrases.indexOf(p);
				if (index != -1) phrase.phrases.splice(index, 1);
			});
		}

		return phrase;
	}

	public addPhrase(id: number, phrases: string[]): boolean {
		if (this.phrases.length < id) return false;

		var phrase = this.phrases[id - 1];
		phrase.phrases = phrase.phrases.concat(phrases).slice(0, server.maxPhraseText);

		return true;
	}

	public setPhraseResponse(id: number, response: string[]): boolean {
		if (this.phrases.length < id) return false;
		this.phrases[id - 1].responses = response.slice(0, server.maxPhraseResponses);
		return true;
	}

	public findPhrase(text: string[] | string): DiscordBot.Phrase {
		if (Array.isArray(text)) {
			text = text.slice(0, server.maxPhraseText);
			
			for(var i = 0; i < text.length; i++) {
				var phrase = this.findPhrase(text[i]);
				if (phrase != null) return phrase;
			}
			return null;
		}

		for(var i = 0; this.phrases.length; i++) {
			if (this.phrases[i].phrases.indexOf(text) != -1) return this.phrases[i];
		}

		return null;
	}


	// Whitelisted/Blacklisted
	public hasBlacklistedWord(content: string): boolean {
		var splt = content.toLowerCase().split(' '); // TODO: URL Check

		for (let i = 0; i < splt.length; i++) {
			if (this.moderation.blacklisted.indexOf(splt[i]) != -1) {
				return true;
			}
		}
		return false;
	}

	public isBlacklistedItem(item: string): boolean {
		return this.moderation.blacklisted.indexOf(item) != -1;
	}

	public blacklist(item: string): boolean {
		var indexOf = this.moderation.blacklisted.indexOf(item);

		if (indexOf != -1) {
			this.moderation.blacklisted.splice(indexOf, 1);
			return false;
		}

		this.moderation.blacklisted.push(item);
		return true;
	}


	// Ignore
	public ignore(type: 'member' | 'channel', id: string): boolean {
		if (type == 'member') {
			if (this.moderation.ignoredUsers.indexOf(id) != -1) return false;
			this.moderation.ignoredUsers.push(id);
		} else {
			if (this.moderation.ignoredChannels.indexOf(id) != -1) return false;
			this.moderation.ignoredChannels.push(id);
		}

		return true;
	}

	public clearIgnoreList(list: 'member' | 'channel' | 'all') {
		if (list == 'member') {
			this.moderation.ignoredUsers = [];
		} else if (list == 'channel') {
			this.moderation.ignoredChannels = [];
		} else {
			this.moderation.ignoredChannels = [];
			this.moderation.ignoredUsers = [];
		}
	}

	public channelIgnored(id: string): boolean {
		return this.moderation.ignoredChannels.indexOf(id) != -1;
	}

	public memberIgnored(id: string): boolean {
		return this.moderation.ignoredUsers.indexOf(id) != -1;
	}


	// Commands
	public createCommand(commandName: string, onCalled: string): boolean {
		commandName = commandName.toLowerCase();

		if (this.commandIndex(commandName) != -1) return false;

		var comm: Command = {
			commandName: [ commandName ],
			disabled: false,
			params: [
				{
					id: 0,
					onCalled: onCalled,
					length: 0
				}
			]
		};

		this.commands.push(comm);
		return true;
	}

	public removeCommand(commandName: string, paramId: number): boolean {
		commandName = commandName.toLowerCase();

		var index = this.commandIndex(commandName);
		if (index != -1) this.commands.splice(index, 1);
		return index != -1;
	}

	public commandIndex(commandName: string): number {
		for (var i = 0; i < this.commands.length; i++) {
			if (this.commands[i].commandName.indexOf(commandName) != -1) {
				return i;
			}
		}
		return -1;
	}


	// Ranks
	public addRank(name: string): boolean {
		if (this.isRank(name)) return false;
		this.ranks.push(name);
		return true;
	}

	public removeRank(name: string): boolean {
		var index = this.ranks.indexOf(name);
		if (index == -1) return false;
		this.ranks.splice(index, 1);
		return true;
	}
	
	public isRank(name: string) {
		return this.ranks.indexOf(name) != -1;
	}


	// Roles
	public addRole(role: DiscordBot.Role): DiscordBot.Role[] {
		if (this.getRoleIndex(role.id) == -1) {
			this.roles.push(role);
			this.roles.sort((r1, r2) => r2.position - r1.position);
		}
	
		return this.roles;
	}

	public removeRole(roleId: string): DiscordBot.Role[] {
		var index = this.getRoleIndex(roleId);
		if (index != -1) this.roles.splice(index, 1);
		return this.roles;
	}

	public getRole(roleId: string): DiscordBot.Role {
		var index = this.getRoleIndex(roleId);
		return index == -1 ? null : this.roles[index];
	}

	public getRoleIndex(roleId: string): number {
		for (var i = 0; i < this.roles.length; i++) {
			if (this.roles[i].id == roleId) return i;
		}
	
		return -1;
	}


	// Interval
	public addInterval(seconds: number, guildId: string, channelId: string): number {
		var params: DiscordBot.Interval = {
			server_id: guildId,
			channel_id: channelId,
			every: seconds,
			active: false,
			message: 'No message set!'
		};

		this.intervals.push(params);
		var modelId = intervalPlugin.addInterval(params);
		params._id = modelId;

		return this.intervals.length;
	}

	public removeInterval(id: number) {
		var interval = this.intervals.splice(id - 1, 1)[0];
		if (interval == null) return console.error('Remove Interval, id does not exist!');
		intervalPlugin.removeInterval(interval._id);
	}

	public toggleInterval(id: number): boolean {
		var interval = this.intervals[id - 1];
		if (interval == null) {
			console.error('Interval not found for ID: ' + (id - 1));
			return null;
		}

		interval.active = !interval.active;
		interval.nextCall = null;

		var opts: DiscordBot.Interval = { active: interval.active, nextCall: null };

		if (interval.active) {
			interval.nextCall = opts.nextCall = Date.now() + (interval.every * 1000);
		}

		intervalPlugin.editInterval(interval._id, opts);

		return interval.active;
	}

	public setIntervalTime(id: number, minutes: number) {
		var interval = this.intervals[id - 1];
		if (interval == null) return console.error('Interval not found for ID: ' + (id - 1));

		var params: DiscordBot.Interval = {
			every: minutes
		};

		if (interval.active) {
			params.nextCall = interval.nextCall = Date.now() + (minutes * 1000);
		}

		this.intervals[id - 1] = Object.assign(interval, params);
		intervalPlugin.editInterval(interval._id, params);
	}

	public setIntervalName(id: number, name: string) {
		var interval = this.intervals[id - 1];
		if (interval == null) return console.error('Interval not found for ID: ' + (id - 1));
		intervalPlugin.editInterval(interval._id, { displayName: name });
		interval.displayName = name;
	}

	public setIntervalMessage(id: number, name: string) {
		var interval = this.intervals[id - 1];
		if (interval == null) return console.error('Interval not found for ID: ' + (id - 1));
		intervalPlugin.editInterval(interval._id, { message: name });
		interval.message = name;
	}

	// public setIntervalEvent(id: number, event: 'onCall' | 'onReset', content: string) {
	// 	var interval = this.intervals[id - 1];
	// 	if (interval == null) return console.error('Interval not found for ID: ' + (id - 1));

	// 	if (interval.events == null) interval.events = {};
	// 	interval.events[event] = content;

	// 	intervalPlugin.editInterval(interval._id, { events: interval.events });
	// }

	public resetInterval(id: number): boolean {
		var interval = this.intervals[id - 1];
		if (interval == null) return false;
		this.setIntervalTime(id, interval.every);
		return true;
	}


	// Permissions
	public createGroup(displayName: string): boolean {
		var tounique = displayName.replace(/ /, '').toLowerCase();

		if (Object.keys(this.permissions.groups).length >= 15) return false;
		
		if (this.permissions.groups[tounique] != null) return false;

		this.permissions.groups[tounique] = {
			displayName: displayName,
			name: displayName.replace(/\s/, '').toLowerCase(),
			perms: []
		};

		return true;
	}

	public removeGroup(name: string): boolean {
		if (this.permissions.groups[name] == null) return false;

		delete this.permissions.groups[name];

		for(var id in this.permissions.roles) {
			var role = this.permissions.roles[id];

			var index = role.groups.indexOf(name);
			if (index != -1) role.groups.splice(index, 1);
		}

		for(var id in this.permissions.users) {
			var user = this.permissions.users[id];

			var index = user.groups.indexOf(name);
			if (index != -1) user.groups.splice(index, 1);
		}

		return true;
	}

	public getPermsFrom(type: 'roles' | 'users' | 'groups', id: string) {
		return this.permissions[type][this.strpToId(id)];
	}

	public addGroupTo(type: 'roles' | 'users', id: string, groupId: string): boolean {
		var perms = this.permissions[type];

		if (perms[id] == null) {
			if (type == 'roles' || type == 'users') {
				perms[id] = {
					groups: [],
					perms: []
				};
			} else return false;
		}

		var groups = perms[id].groups;

		if (groups.length >= 5) return false;

		if (groups.indexOf(groupId) == -1) 
			groups.push(groupId);

		return true;
	}

	public addPermTo(type: 'roles' | 'groups' | 'users', id: string, perm: string): boolean {
		var perms = this.permissions[type];
		id = this.strpToId(id);

		if (perms[id] == null) {
			if (type == 'roles' || type == 'users') {
				perms[id] = {
					groups: [],
					perms: []
				};
			} else return false;
		}

		var ps = perms[id].perms;

		if (ps.length >= 25) return false;

		if (ps.indexOf(perm) == -1)
			ps.push(perm);

		console.log(this.permissions);

		return true;
	}

	public removePermFrom(type: 'roles' | 'groups' | 'users', id: string, perm: string): boolean {
		id = this.strpToId(id);
		var perms = this.permissions[type];

		if (perms[id] == null) return false;

		var index = perms[id].perms.indexOf(perm);
		
		if (index == -1) return false;
		perms[id].perms.splice(index, 1);

		return true;
	}

	public removeGroupFrom(type: 'roles' | 'users', id: string, group: string): boolean {
		id = this.strpToId(id);
		var perms = this.permissions[type];

		if (perms[id] == null) return false;
		var index = perms[id].groups.indexOf(group);
		
		if (index == -1) return false;
		perms[id].groups.splice(index, 1);

		return true;
	}

	public strpToId(str: string): string {
		if (!str.startsWith('<@')) return str;

		if (str.length < 3) return null;

		var sub = str.substr(2, str.length - 3);
		if (sub[0] == '@') return sub.substr(1);
		
		return sub;
	}

	public userHasBasePerm(id: string, perm: string): boolean {
		var userPerm = this.permissions.users[id];
		if (userPerm == null) return false;

		var expandedPerm = expandPerm(perm);

		for(var i = 0; i < expandedPerm.length; i++) {
			if (userPerm.perms.indexOf(expandedPerm[i]) != -1) return true;
		}

		return false;
	}

	public userHasFullPerm(id: string, perm: string): boolean {
		var userPerm = this.permissions.users[id];
		if (userPerm == null) return false;

		return userPerm.perms.indexOf(perm) != -1;
	}

	public hasPerms(userId: string, roleIds: string[], permItem: string): boolean {
		var userPerm = this.permissions.users[userId];

		if (userPerm != null) {
			if (userPerm.perms.indexOf(permItem) != -1) return true;

			for(var i = 0; i < userPerm.groups.length; i++) {
				var id = userPerm.groups[i];
				var group = this.permissions.groups[id];
				if (group.perms.indexOf(permItem) != -1) return true;
			}
		}
		
		for(var i = 0; i < roleIds.length; i++) {
			var id = roleIds[i];
			var role = this.permissions.roles[id];
			if (role.perms.indexOf(permItem) != -1) return true;

			for(var x = 0; i < role.groups.length; x++) {
				var id = role.groups[x];
				var group = this.permissions.groups[id];
				if (group.perms.indexOf(permItem) != -1) return true;
			}
		}

		return false;
	}

	public userHasPerm(user: Discord.GuildMember, perm: string): boolean {
		if (user.hasPermission('ADMINISTRATOR')) return true;
		return this.userHasBasePerm(user.id, perm);
	}


	//
	public toDBPrint() {
		return {
			region: this.region,
			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,
			intervals: this.intervals.map(i => i._id),
			commands: this.commands,
			phrases: this.phrases,
			values: this.values,
			roles: this.roles,
			permissions: this.permissions
		};
	}

	public toString() {
		return JSON.stringify({
			region: this.region,
			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,
			intervals: this.intervals,
			commands: this.commands,
			phrases: this.phrases,
			values: this.values,
			roles: this.roles,
			permissions: this.permissions
		});
	}
}

function expandPerm(perm: string): string[] {
	var splt = perm.split('.');
	return splt.map((str, i) => splt.slice(0, i + 1).join('.'));
}

function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

function uidToStreamUrl(site: 'youtube', id: string) {
	if (site == 'youtube') return 'https://youtu.be/' + id;
	return null;
}

function generateFullSong(
	title: string, icon: string, 
	videoTitle: string, videoThumb: string, duration: string,
	channel: string, uploaded: string) {
	return {
		embed: {
			title: videoTitle,
			url: 'https://youtu.be/',
			color: 0x46a0c0,
			timestamp: uploaded,
			footer: {
				icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
				text: 'Youtube'
			},
			thumbnail: {
				url: videoThumb
			},
			author: {
				name: title,
				url: 'https://its.rip/for/bots',
				icon_url: icon
			},
			fields: [
				{
					name: 'Duration',
					value: duration,
					inline: true
				},
				{
					name: 'Channel',
					value: channel,
					inline: true
				}
				// {
				// 	name: "Position",
				// 	value: "best",
				// 	inline: true
				// }
			]
		}
	};
}