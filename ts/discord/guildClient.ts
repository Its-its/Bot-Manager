import redis = require('redis');
import Discord = require('discord.js');
import YTDL = require('ytdl-core');

import DiscordServers = require('../site/models/discord_servers');
import discordClient = require('./index');

// IDEA: Temporarily store music in object? After it isn't used for X minutes delete it.

let dispatchers: { [id: string]: Discord.StreamDispatcher } = {};


let redisGuildsClient = redis.createClient({ db: '0' });
let redisMusic = redis.createClient({ db: '2' });


function get(serverId: string, cb: (client: Server) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		if (str == null) cb(null); // TODO: Check DB?
		cb(new Server(serverId, JSON.parse(str)));
	});
}


function getMusic(serverId: string,  cb: (music: Music) => any) {
	redisMusic.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		cb(new Music(serverId, str == null ? {} : JSON.parse(str)));
	});
}


export { get, getMusic, Server };



let maxQueueSize = 50;
let maxHistorySize = 25;

class Music {
	public guildId: string;
	
	public lastVoiceChannelId: string;
	public lastTextChannelId: string;

	public playing: PlayedSong;
	public history: PlayedSong[];
	public queue: Song[];

	public repeatQueue = false;
	public repeatSong = false;

	constructor(guildId: string, save: MusicOptions) {
		this.guildId = guildId;

		this.lastVoiceChannelId = save.lastVoiceChannelId;
		this.lastTextChannelId = save.lastTextChannelId;

		if (save.repeatQueue != null) this.repeatQueue = save.repeatQueue;
		if (save.repeatSong != null) this.repeatSong = save.repeatSong;

		this.playing = save.playing;
		this.queue = save.queue || []; 
		this.history = save.history || [];
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisMusic.set(this.guildId, this.toString(), cb);
	}

	// Controls
	public play(song?: Song, trys = 0): boolean {
		var guild = discordClient.client.guilds.get(this.guildId);
		if (guild == null) { console.error('UNKNOWN GUILD ID!!!! - ' + this.guildId); return false; }

		var conn = discordClient.client.voiceConnections.get(this.guildId);

		if (conn != null) {
			if (this.isPlaying()) {
				if (song == null) return false; // Currently playing a song, no url specified.
				else this.stop(); // Stop song, new song ready to play
			}
			
			if (song == null) song = this.nextInQueue();
			if (song == null) {
				this.sendMessageFromGuild(guild, 'End of Queue.');
				return;
			}

			var stream = YTDL('http://youtu.be/' + song.id, { filter: 'audioonly' });
			var dispatcher = dispatchers[this.guildId] = conn.playStream(stream);

			stream.on('info', info => {
				this.sendMessageFromGuild(guild, `Now Playing ${info.title}`);

				this.playing = Object.assign(song, { playedAt: Date.now() });

				this.addToHistory(this.playing);
				this.save();
			});
			
			dispatcher.on('end', (reason) => {
				delete dispatchers[this.guildId];
				this.playing = null;

				if (reason != 'stopped') {
					this.save(() => this.regrab(music => music.next()));
				} else this.save();
			});
			
			dispatcher.on('error', (...e) => console.log('dispatcher', ...e));
		} else {
			// If the bot is QUICKLY restarted it doesn't leave the voice channel and it doesn't know it's still in it.
			if (trys >= 3) { console.error('Attempted to join Voice Channel 3 times. Now stopping. - ' + this.lastVoiceChannelId); return false;}
			return this.joinVoice(guild, () => this.play(song, trys + 1));
		}
	}

	public stop(): boolean {
		var dispatcher = dispatchers[this.guildId];

		if (dispatcher == null) return false
		dispatcher.end('stopped');

		return true;
	}

	public next(): boolean {
		console.log('Next Song');
		if (this.isPlaying()) this.stop();
		return this.play();
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
	public clearQueue(): boolean {
		if (this.queue.length == 0) return false;
		this.queue = [];
		return true;
	}

	public addToQueue(song: Song): boolean {
		if (this.queue.filter(q => q.id == song.id).length != 0) return false;
		if (this.queue.length >= maxQueueSize) return false;

		this.queue.push(song);
		return true;
	}

	public removeFromQueue(item: string | number): boolean {
		if (typeof item == 'string') {
			var parsed = parseInt(item);
			if (!Number.isInteger(parsed)) {
				for(var i = 0; i < this.queue.length; i++) {
					if (this.queue[i].id == item) {
						this.queue.splice(i, 1);
						return true;
					}
				}
				return false;
			}
			item = parsed;
		}


		if (item >= this.queue.length) return false;
		this.queue.splice(item, 1);
		return true;
	}

	public isQueueEmpty(): boolean {
		return this.queue.length == 0;
	}

	public nextInQueue(): Song {
		if (this.isQueueEmpty()) return null;

		var nextUrl = this.queue.splice(0, 1)[0];
		if (this.repeatQueue) this.queue.push(nextUrl);

		return nextUrl;
	}

	public shuffleQueue() {
		//
	}

	public toggleQueueRepeat(): boolean {
		return this.repeatQueue = !this.repeatQueue;
	}


	// History
	public addToHistory(song: PlayedSong) {
		if (this.history.length == maxHistorySize) this.history.splice(0, 1);
		this.history.push(song);
	}

	public clearHistory() {
		this.history = [];
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

	public sendMessageFromGuild(guild: Discord.Guild, message: string, error = false) {
		var channel = <Discord.TextChannel>guild.channels.get(this.lastTextChannelId);
		if (channel == null) return console.error('Channel is none existent. - ' + this.lastTextChannelId);
		channel.send(message);
	}

	public regrab(cb: (music: Music) => any) {
		getMusic(this.guildId, music => cb(music));
	}

	
	public toString() {
		return JSON.stringify({
			lastVoiceChannelId: this.lastVoiceChannelId,
			lastTextChannelId: this.lastTextChannelId,
			repeatQueue: this.repeatQueue,
			repeatSong: this.repeatSong,
			playing: this.playing,
			queue: this.queue,
			history: this.history
		});
	}
}

interface MusicOptions {
	lastVoiceChannelId: string;
	lastTextChannelId: string;
	repeatQueue: boolean;
	repeatSong: boolean;

	playing: PlayedSong;
	queue: Song[];
	history: PlayedSong[];
}

interface PlayedSong extends Song {
	playedAt: number;
}

interface Song {
	type: 'youtube';

	id: string;
	title: string;
}


// Server

class Server {
	serverId: string;

	moderation: Moderation = {
		blacklisted: [],
		whitelisted: [],
		ignoredChannels: [],
		ignoredUsers: [],
		disabledCommands: []
	};

	ranks: string[];
	commands: Command[];
	roles: Role[];
	plugins;
	values;

	constructor(serverID: string, options: ServerOptions) {
		this.serverId = serverID;

		this.ranks = options.ranks || [];
		this.roles = options.roles || [];
		this.commands = options.commands || [];
		this.plugins = options.plugins || {};
		this.values = options.values || {};
		if (options.moderation) this.moderation = options.moderation;
	}

	public save(cb?: redis.Callback<'OK'>) {
		redisGuildsClient.set(this.serverId, this.toString(), cb);
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

	public isBlacklistedItem(item: string) {
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

	public commandIndex(commandName: string) {
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
	public addRole(role: Role): Array<Role> {
		if (this.getRoleIndex(role.id) == -1) {
			this.roles.push(role);
			this.roles.sort((r1, r2) => r2.position - r1.position);
		}
	
		return this.roles;
	}

	public removeRole(roleId: string): Array<Role> {
		var index = this.getRoleIndex(roleId);
		if (index != -1) this.roles.splice(index, 1);
		return this.roles;
	}

	public getRole(roleId: string): Role {
		var index = this.getRoleIndex(roleId);
		return index == -1 ? null : this.roles[index];
	}

	public getRoleIndex(roleId: string): number {
		for (var i = 0; i < this.roles.length; i++) {
			if (this.roles[i].id == roleId) return i;
		}
	
		return -1;
	}

	public toString() {
		return JSON.stringify({
			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,
			commands: this.commands,
			values: this.values,
			roles: this.roles
		});
	}
}


interface ServerOptions {
	ranks: string[];
	commands: Array<Command>;
	roles: Array<Role>;
	plugins;
	values;
	moderation: Moderation;
}


interface Moderation {
	disabledCommands: string[];
	blacklisted: string[];
	whitelisted: string[];
	ignoredChannels: string[];
	ignoredUsers: string[];
};


// Role
interface Role {
	id: string;
	name: string;
	color: number;
	hoist: boolean;
	position: number;
	permissions: number;
	managed: boolean;
	mentionable: boolean;
}

// Command
interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParam>;
}

interface CommandParam {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: Array<string>, userOptions: object) => any;
};
