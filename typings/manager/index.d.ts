// import { Message } from 'discord.js';


declare interface CommandClient {
	commands: Array<DiscordBot.Command>;
}


// declare interface Command {
// 	commandName: Array<string>;
// 	disabled: boolean;
// 	params: Array<CommandParam>;
// }

// declare interface CommandParam {
// 	id: number;
// 	onCalled?: DiscordBot.PhraseResponses;

// 	length?: number;
// 	minLength?: number;
// 	maxLength?: number;

// 	paramReg?: string;
// 	minPerms?: number;
// 	cb?: (params: Array<string>) => any;
// }


declare namespace DiscordBot {
	namespace plugins {
		export class Music {
			guildId: string;

			lastVoiceChannelId: string;
			lastTextChannelId: string;

			playing: PlayedSong;

			guildPlaylist: string;
			customPlaylist: string;

			playingFrom: number;

			repeatQueue: boolean;
			repeatSong: boolean;

			constructor(guildId: string, save: MusicOptions);

			save(cb?);
			// play(cb?: (err: string, newSong?: DiscordBot.plugins.SongGlobal, lastSong?: DiscordBot.plugins.SongGlobal) => any, trys?: number);
			// sendStop(reason: 'stopped' | 'next', cb?: (reason: string) => any);
			// next(cb: (err: string, newSong: DiscordBot.plugins.PlayedSong, lastSong: DiscordBot.plugins.PlayedSong) => any);
			// rejoinVoice(guild?: any/*Guild*/, cb?: (err, msg?) => any);
			clearQueue(cb: (err: any) => any);
			addToQueue(user: string, song: SongGlobal, cb: () => any);
			removeFromQueue(id: string, cb: (err: any) => any);
			nextInQueue(cb: (song: SongGlobal) => any);
			shuffleQueue();
			toggleQueueRepeat(): boolean;
			addToHistory(song: PlayedSong);
			clearHistory(cb: (err: any) => any);
			// isPlaying(cb: (playing: boolean) => any);
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

			defaultPlaylist?: string;

			guildPlaylist: string;
			customPlaylist: string;

			playingFrom: number;
		}

		interface PlayedSong extends SongGlobal {
			playedAt: number;
		}

		interface SongYT extends SongType<'youtube'> {
			channel_id: string;
		}

		interface SongType<T> {
			type: T;

			id: string;
			title: string;
			length: number;
			thumbnail_url: string;
			published: number;
			view_count: number;

			addedBy?: string;
		}

		type SongGlobal = SongYT;

		interface Playlist {
		}
	}


	// export class Server {
	// 	public serverId: string;

	// 	public region: string;
	// 	public moderation: Moderation;

	// 	public intervals: Interval[];
	// 	public ranks: string[];
	// 	public commands: Command[];
	// 	public phrases: Phrase[];
	// 	public roles: Role[];

	// 	public plugins: any;
	// 	public values: any;

	// 	public punishments: Punishments;
	// 	public permissions: Permissions;
	// 	public channels: Channels;

	// 	constructor(serverID: string, options: ServerOptions);
	// 	save(cb?);

	// 	createPhrase(member, phraseText: string[], cb: (phrase: Phrase) => any);
	// 	removePhrase(id: number, phrases?: string[]): Phrase;
	// 	addPhrase(id: number, phrases: string[]): boolean;
	// 	setPhraseResponse(id: number, response: DiscordBot.PhraseResponses[]): boolean;
	// 	findPhrase(text: string[] | string): Phrase;

	// 	hasBlacklistedWord(id: string, content: string): boolean;
	// 	isBlacklistedItem(id: string, item: string): boolean;
	// 	blacklist(id: string, item: string): boolean;

	// 	ignore(type: 'member' | 'channel', id: string): boolean;
	// 	clearIgnoreList(list: 'member' | 'channel' | 'all');
	// 	channelIgnored(id: string): boolean;
	// 	memberIgnored(id: string): boolean;

	// 	createCommand(member, commandName: string, onCalled: PhraseResponses, cb: (resp: boolean) => any);
	// 	removeCommand(commandName: string, paramId: number): boolean;
	// 	commandIndex(commandName: string): number;

	// 	addRank(name: string): boolean;
	// 	removeRank(name: string): boolean;
	// 	isRank(name: string): boolean;

	// 	addRole(role: Role): Role[];
	// 	removeRole(roleId: string): Role[];
	// 	getRole(roleId: string): Role;
	// 	getRoleIndex(roleId: string): number;

	// 	addInterval(seconds: number, guildId: string, channelId: string): number;
	// 	removeInterval(id: number);
	// 	toggleInterval(id: number): boolean;
	// 	setIntervalTime(id: number, minutes: number);
	// 	setIntervalName(id: number, name: string);
	// 	setIntervalMessage(id: number, name: string);
	// 	// setIntervalEvent(id: number, event: 'onCall' | 'onReset', content: string);
	// 	resetInterval(id: number): boolean;

	// 	// runIntervalOnCall();
	// 	// runIntervalOnReset();

	// 	toDBPrint(): any;
	// 	toString(): string;
	// }

	interface CommandDoc {
		title: string;
		categories: string[];
		alias: string[];
		permission: string;
		description: string;
		items?: {
			name: string;
			permission: string;
			description: string;
			opts?: {
				description: string;
				items?: {
					name: string;
					description: string;
					default?: string;
				}[];
			}[];
		}[];
	}

	interface ServerOptions {
		linked?: boolean;
		version?: number;

		region: string;
		name: string;
		iconURL: string;
		createdAt: number;
		memberCount: number;
		ownerID: string;

		commandPrefix?: string;

		channels?: Channels;

		events?: ListenEvents[];
		leveling?: Leveling;
		aliasList?: Alias[];
		alias?: Alias[];
		intervals?: Interval[];
		ranks?: string[];
		commands?: Command[];
		phrases?: Phrase[];
		roles?: Role[];
		plugins?: any;
		values?: any;
		moderation?: Moderation;
		permissions?: Permissions;
		punishments?: Punishments;
	}

	interface Punishments {
		punished_role_id?: string;
	}

	type PunishmentTypes = CensorPunishment | DeletePunishment | WarnPunishment | TempmutePunishment | MutePunishment | TempbanPunishment | BanPunishment;

	interface Punishment {
		type: string;
		reason?: string;
	}

	interface TimedPunishment extends Punishment {
		length: number;
	}

	interface CensorPunishment extends Punishment {
		type: 'censor';
	}

	interface DeletePunishment extends Punishment {
		type: 'delete';
	}

	interface WarnPunishment extends Punishment {
		type: 'warn';
	}

	interface TempmutePunishment extends TimedPunishment {
		type: 'tempmute';
	}

	interface MutePunishment extends Punishment {
		type: 'mute';
	}

	interface TempbanPunishment extends TimedPunishment {
		type: 'tempban';
	}

	interface BanPunishment extends Punishment {
		type: 'ban';
	}

	type DoEvents = DoGroupEvent | DoMessageEvent | DoDirectMessageEvent;
	type ListenEvents = ReactAddEvent | MemberAddEvent | MemberRemoveEvent;

	interface ListenEvent {
		uid: string;
		type: string;
		event?: DoEvents;
	}

	interface ReactAddEvent extends ListenEvent {
		type: 'react_add';
		message_id: string;
		emoji_id: string;
	}

	interface MemberAddEvent extends ListenEvent {
		type: 'member_add';
	}

	interface MemberRemoveEvent extends ListenEvent {
		type: 'member_remove';
	}


	interface DoEvent {
		type: string;
	}

	interface DoGroupEvent extends DoEvent {
		type: 'role';
		do?: 'add' | 'remove';
		role_id?: string;
	}

	interface DoMessageEvent extends DoEvent {
		type: 'message';
		message?: string;
		channel_id?: string;
	}

	interface DoDirectMessageEvent extends DoEvent {
		type: 'dm';
		message?: string;
	}

	interface Channels {
		admin?: string;
	}

	interface Leveling {
		roles: {
			id: string;
			level: number;
		}[];

		keepPreviousRoles: boolean;
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

	interface Alias {
		pid: string;

		alias: string[];
		command: string;
	}

	interface Phrase {
		_id?: string;

		pid: string;
		sid: string;

		enabled?: boolean;
		ignoreCase?: boolean;

		phrases: string[];
		responses: PhraseResponses[];
	}


	type PhraseResponses = PhraseResEcho | PhraseResInterval | PhraseResAlias | PhraseResSet | PhraseResRank;

	interface PhraseResEcho {
		type: 'echo';
		message: string;
		reply?: boolean;
		embed?: any;
	}

	interface PhraseResInterval {
		type: 'interval';
		do: string | 'reset';
		id: string;
	}

	interface PhraseResAlias {
		type: 'alias';
		do: string;
	}

	interface PhraseResSet {
		type: 'set';
		command: string;
		paramId: number;
		oldValue: PhraseResponses;
		newValue: PhraseResponses;
	}

	interface PhraseResRank {
		type: 'rank';
		id: string;
		do: 'add' | 'remove' | string;
	}

	interface Moderation {
		disabledDefaultCommands: string[];
		disabledCustomCommands: string[];
		blacklisted: { [value: string]: { punishment: PunishmentTypes, items: string[] } };
		whitelisted: string[];
		ignoredChannels: string[];
		ignoredUsers: string[];
	}


	interface Interval {
		_id?: string;

		pid?: string;

		guild_id?: string;
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

	type PLUGIN_NAMES = 'commands' | 'music' | 'interval' | 'logs' | 'leveling' | 'events';

	interface Plugin {
		[name: string]: PluginItem;
		commands?: PluginItem;
		music?: PluginItem;
		interval?: PluginItem;
		rssfeed?: PluginItem;
		leveling?: PluginItem;
		events?: PluginItem;
		logs?: PluginLogs;
	}

	interface PluginLogs extends PluginItem {
		textChannelId?: string;
		filter?: string[];
	}

	interface PluginItem {
		enabled: boolean;
		// perms: boolean;
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
		_id?: string;

		pid: string;
		alias: string[];
		params: CommandParam[];
	}

	interface CommandParam {
		onCalled?: PhraseResponses;
		response?: PhraseResponses;

		length?: number;
		minLength?: number;
		maxLength?: number;

		paramReg?: string;
		minPerms?: number;
		cb?: (params: string[], userOptions: any, message: any) => any;
	}
}