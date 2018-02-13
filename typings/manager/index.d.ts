
declare interface CommandClient {
	commands: Array<Command>;
}


declare interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParam>;
}

declare interface CommandParam {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: Array<string>) => any;
}


declare namespace DiscordBot {
	namespace plugins {
		export class Music {
			guildId: string;

			lastVoiceChannelId: string;
			lastTextChannelId: string;

			playing: PlayedSong;

			defaultPlaylist: string;
			customPlaylist: string;

			playingFrom: number;

			repeatQueue: boolean;
			repeatSong: boolean;
			
			constructor(guildId: string, save: MusicOptions);
			
			save(cb?);
			play(song?: SongGlobal, trys?: number): boolean;
			stop(): boolean;
			next(): boolean;
			joinVoice(guild?: any/*Guild*/, cb?: () => any): boolean;
			clearQueue(cb: (err: any) => any);
			addToQueue(user: string, song: SongGlobal, cb: () => any);
			removeFromQueue(id: string, cb: (err: any) => any);
			nextInQueue(cb: (song: SongGlobal) => any);
			shuffleQueue();
			toggleQueueRepeat(): boolean;
			addToHistory(song: PlayedSong);
			clearHistory(cb: (err: any) => any);
			isPlaying(): boolean;
			sendMessage(message: string, error?: boolean);
			sendMessageFromGuild(guild: any/*Guild*/, message: string, error?: boolean);
			regrab(cb: (music: Music) => any);
			toString(): string;
		}

		interface MusicOptions {
			lastVoiceChannelId: string;
			lastTextChannelId: string;
			repeatQueue: boolean;
			repeatSong: boolean;
			
			playing: PlayedSong;

			defaultPlaylist: string;
			customPlaylist: string;

			playingFrom: number;
		}
		
		interface PlayedSong extends SongGlobal {
			playedAt: number;
		}

		interface SongYT extends SongType<'youtube'> {
			channelId: string;
		}
		
		interface SongType<T> {
			_id: string;

			type: T;
			
			uid: string;
			title: string;
			length: number;
			thumb: string;
			uploaded: number;

			addedBy?: string;
		}

		type SongGlobal = SongYT;
		
		interface Playlist {
		}
	}


	export class Server {
		serverId: string;
		region: string;
		moderation: Moderation;
		intervals: Interval[];
		ranks: string[];
		commands: Command[];
		phrases: Phrase[];
		roles: Role[];
		plugins: any;
		values: any;
		permissions: Permissions;

		constructor(serverID: string, options: ServerOptions);
		save(cb?);
		createPhrase(phraseText: string[]): Phrase;
		removePhrase(id: number, phrases?: string[]): Phrase;
		addPhrase(id: number, phrases: string[]): boolean;
		setPhraseResponse(id: number, response: string[]): boolean;
		findPhrase(text: string[] | string): Phrase;

		hasBlacklistedWord(content: string): boolean;
		isBlacklistedItem(item: string): boolean;
		blacklist(item: string): boolean;

		ignore(type: 'member' | 'channel', id: string): boolean;
		clearIgnoreList(list: 'member' | 'channel' | 'all');
		channelIgnored(id: string): boolean;
		memberIgnored(id: string): boolean;

		createCommand(commandName: string, onCalled: string): boolean;
		removeCommand(commandName: string, paramId: number): boolean;
		commandIndex(commandName: string): number;

		addRank(name: string): boolean;
		removeRank(name: string): boolean;
		isRank(name: string): boolean;

		addRole(role: Role): Role[];
		removeRole(roleId: string): Role[];
		getRole(roleId: string): Role;
		getRoleIndex(roleId: string): number;

		addInterval(seconds: number, guildId: string, channelId: string): number;
		removeInterval(id: number);
		toggleInterval(id: number): boolean;
		setIntervalTime(id: number, minutes: number);
		setIntervalName(id: number, name: string);
		setIntervalMessage(id: number, name: string);
		// setIntervalEvent(id: number, event: 'onCall' | 'onReset', content: string);
		resetInterval(id: number): boolean;

		// runIntervalOnCall();
		// runIntervalOnReset();

		toDBPrint(): any;
		toString(): string;
	}

	interface ServerOptions {
		region: string;
		intervals?: Interval[];
		ranks?: string[];
		commands?: Command[];
		phrases?: Phrase[];
		roles?: Role[];
		plugins?: any;
		values?: any;
		moderation?: Moderation;
		permissions?: Permissions;
	}

	interface Permissions {
		roles: {
			[id: string]: {
				groups: string[];
				perms: string[];
			}
		};
		users: {
			[id: string]: {
				groups: string[];
				perms: string[];
			}
		};
		groups: {
			[id: string]: {
				displayName: string;
				name: string;
				
				perms: string[];
				groups?: string[];
			}
		};
	}
	
	interface Phrase {
		phrases: string[];
		responses: string[];
	}
	
	interface Moderation {
		disabledCommands: string[];
		blacklisted: string[];
		whitelisted: string[];
		ignoredChannels: string[];
		ignoredUsers: string[];
	}
	
	
	interface Interval {
		_id?: string;
	
		server_id?: string;
		channel_id?: string;
	
		displayName?: string;
		message?: string;
		active?: boolean;
	
		every?: number;
		nextCall?: number;
	
		events?: {
			onCall?: string;
			onReset?: string;
		};
	}
	
	interface Plugin {
		[name: string]: PluginItem;
		commands?: PluginItem;
		music?: PluginItem;
		interval?: PluginItem;
		rssfeed?: PluginItem;
		logs?: PluginItem;
	}

	interface PluginItem {
		enabled: boolean;
		perms: boolean;
	}
	
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
		commandName: string[];
		disabled: boolean;
		params: CommandParam[];
	}
	
	interface CommandParam {
		id: number;
		onCalled?: string;
	
		length?: number;
		minLength?: number;
		maxLength?: number;
	
		paramReg?: string;
		minPerms?: number;
		cb?: (params: string[], userOptions: object) => any;
	}
}