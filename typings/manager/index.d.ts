import Discord = require ('discord.js');
import { Document, Schema } from "mongoose";
import { ObjectID } from 'bson';

// import { Message } from 'discord.js';

// declare module 'socket.io-stream';
declare module 'connect-mongo';
declare module 'mogan';
declare module 'express-session';

type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>


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

declare namespace CustomDocs {
	namespace global {
		export interface CommandsDoc extends Document {
			user_id: ObjectID;
			pid: string;

			alias: string[];
			params: DiscordBot.CommandParam[];

			created_at: Date;
			edited_at: Date;
		}

		export interface TwitterFeeds extends Document {
			user_id: string;

			displayName: string;
			screenName: string;

			sending_to: number;

			last_called: Date;

			items: TwitterFeedsItem[];
		}

		export interface TwitterFeedsItem {
			id: string;

			text: string;
			link: string;
		}

		export interface RSSFeeds extends Document {
			url: string;
			link: string;
			xmlUrl: string;

			sending_to: number;

			items: RSSFeedsItem[];

			last_called: Date;
		}

		export interface RSSFeedsItem {
			id: string;
			title: string;
			description: string;
			date: Date;
			link: string;
			guid: string;
			author: string;
			generator: string;
			categories: string[];
		}

		export interface Intervals extends Document {
			pid: string;

			guild_id: string;
			channel_id: string;

			displayName: string;
			message: string;
			active: boolean;

			every: number;
			nextCall: number;

			events: {
				onCall: string;
			}

			created_at: Date;
			edited_at: Date;
		}

		export interface Phrases extends Document {
			user_id: ObjectID,

			pid: string,

			enabled: boolean,
			ignoreCase: boolean,

			phrases: string[],
			responses: any[],

			created_at: Date,
			edited_at: Date
		}
	}

	namespace discord {
		export interface Member extends Document {
			user_id: ObjectID,

			did: string,
			name: string,
			avatar: string,
			locale: string,
			flags: number,
			premium_type: number,
			mfa_enabled: boolean,
			// provider: string,
			discriminator: string,

			connections: {
				id: string,
				name: string,
				type: string,
				revoked: boolean,
				integrations: any[]
			}[],

			guilds: {
				owner: boolean,
				permissions: number,
				icon: string,
				id: string,
				name: string
			}[];

			updated_guilds_at: Date;

			created_at: Date;
			edited_at: Date;
		}

		export interface UserLevel extends Document {
			server_id: string;
			member_id: string;

			xp: number;
			level: number;
		}

		export interface Punishments extends Document {
			server_id: string;
			member_id: string;
			creator_id: string;

			pid: string;

			type: string;
			length: number;

			reason: string;

			expires: Date;

			created_at: Date;
		}

		// Temp Punishment

		export interface TempPunishments extends _TempPunishments<ObjectID> {}
		export interface TempPunishmentsPopulated extends _TempPunishments<Punishments> {}

		export interface _TempPunishments<P> extends Document {
			server_id: string;
			member_id: string;

			punishment: P;

			expires: Date;
		}

		// RSS
		export interface DiscordRss extends DiscordFeedsTemp<ObjectID> {}
		export interface DiscordRssPopulated extends DiscordFeedsTemp<CustomDocs.global.RSSFeeds> {}

		export interface DiscordFeedsTemp<F> extends Document {
			pid: string;
			active: boolean;
			guild_id: string;
			channel_id: string;
			last_check: Date;

			feeds: DiscordRssFeeds<F>[];
		}

		export interface DiscordRssFeeds<F> {
			format: string;
			active: boolean;
			items: string[];
			feed: F;
		}

		// Twitter
		export interface DiscordTwitter extends DiscordTwitterTemp<ObjectID> {}
		export interface DiscordTwitterPopulated extends DiscordTwitterTemp<CustomDocs.global.TwitterFeeds> {}

		export interface DiscordTwitterTemp<F> extends Document {
			pid: string;
			active: boolean;
			guild_id: string;
			channel_id: string;
			last_check: Date;

			feeds: DiscordTwitterFeeds<F>[];
		}

		export interface DiscordTwitterFeeds<F> {
			format: string;
			active: boolean;
			items: string[];
			feed: F;
		}

		export interface Backup extends Document {
			version: number;
			server_id: string;
			pid: string;
			items: string[];
			json: string;
			created_at: Date;
		}

		export interface ServersPopulatedDocument extends ServersDocumentTemp<
			CustomDocs.global.CommandsDoc,
			CustomDocs.global.Intervals,
			CustomDocs.global.Phrases> {}

		export interface ServersDocument extends ServersDocumentTemp<
			ObjectID, ObjectID, ObjectID> {}

		export interface ServersDocumentTemp<C, I, P> extends Document {
			user_id: ObjectID;
			bot_id: ObjectID;

			server_id: string;
			key: string;

			removed: boolean;

			command_ids: C[];
			interval_ids: I[];
			phrase_ids: P[];

			server: string;

			created_at: Date;
			edited_at: Date;
		}
	}

	namespace web {
		export interface BotsDocument extends Document {
			getBot: (cb: (err?: Error, res?: Document) => any) => any;

			user_id: ObjectID;
			uid: string;

			botType: string;
			botId: string;

			displayName: string;

			is_active: boolean;

			created_at: Date;
			edited_at: Date;
		}

		export interface UsersDocument extends Document {
			is_Active: boolean;
			admin: boolean;

			bots: {
				amount: number;
				twitch_amount: number;
				youtube_amount: number;
				discord_amount: number;
			};

			twitch: {
				id: string;
				token: string;
				email: string;
				name: string;
			}

			youtube: {
				id: string;
				token: string;
				email: string;
				name: string;
			}

			discord: {
				id: string;
				token: string;
				refreshToken: string;
				tokenExpires?: Date;
			}

			created_at: Date;

			bot_listeners?: BotsDocument[];
		}
	}

	namespace music {
		export interface Playlists extends Document {
			creator: ObjectID;

			type: number; // default, custom, generated
			visibility: number; // public, private, hidden
			permissions: number;

			public_id: string;
			plays: number;
			views: number;

			title: string;

			description: string;
			thumb: string;

			// markedForDeletion: boolean;

			songs: any[];
			song_count: number;

			created_at: Date;
			updated_at: Date;
		}

		export interface Queue extends Document {
			server_id: string;
			items: {
				addedBy: string;
				id: string;
			}[];
		}
	}
}


declare namespace DiscordBot {
	namespace plugins {
		export class Music {
			guildId: string;

			lastVoiceChannelId: string;
			lastTextChannelId: string;

			playing?: PlayedSong;

			guildPlaylist: string;
			customPlaylist: string;

			playingFrom: number;

			repeatQueue: boolean;
			repeatSong: boolean;

			constructor(guildId: string, save: MusicOptions);

			save(cb?: any): any;
			// play(cb?: (err: string, newSong?: DiscordBot.plugins.SongGlobal, lastSong?: DiscordBot.plugins.SongGlobal) => any, trys?: number);
			// sendStop(reason: 'stopped' | 'next', cb?: (reason: string) => any);
			// next(cb: (err: string, newSong: DiscordBot.plugins.PlayedSong, lastSong: DiscordBot.plugins.PlayedSong) => any);
			// rejoinVoice(guild?: any/*Guild*/, cb?: (err, msg?) => any);
			clearQueue(cb: (err: any) => any): any;
			addToQueue(user: string, song: SongGlobal, cb: () => any): any;
			removeFromQueue(id: string, cb: (err: any) => any): any;
			nextInQueue(cb: (song?: SongGlobal) => any): any;
			shuffleQueue(): any;
			toggleQueueRepeat(): boolean;
			addToHistory(song: PlayedSong): any;
			clearHistory(cb: (err: any) => any): any;
			// isPlaying(cb: (playing: boolean) => any);
			sendMessageFromGuild(guild: any/*Guild*/, message: string, error?: boolean): any;
			regrab(cb: (music?: Music) => any): any;
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

	// Backup / Restore
	interface BackupEmojis {
		name: string;
		animated: boolean;
		requiresColons: boolean;
		image: string;
		roles: string[];
	}

	interface BackupModeration {
		verification: number;
		content_filter: number;
	}

	interface BackupOverview {
		server_image: string;
		server_name: string;
		server_region: string;
		afk_channel?: string;
		afk_timeout: number;
		new_member_channel?: string;
		notification_settings: Discord.MessageNotifications;
	}

	interface BackupChannel {
		id: string;
		name: string;
		type: 'category' | 'text' | 'voice';
		perms: {
			id: string;
			allow: number;
			deny: number;
			type: string;
		}[];
		position: number;

		parent?: string;
		children?: CompiledChannel[];
	}

	type CompiledChannel = any;


	//

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

	interface ServerDocument {
		linked?: boolean;
		version?: number;

		region: string;
		name: string;
		iconURL: string;
		createdAt: number;
		memberCount: number;
		ownerID: string;

		values: any;
		plugins: any;
		ranks: string[];
		moderation: Moderation;
		permissions: Permissions;

		commandPrefix?: string;
		channels?: Channels;
		events?: ListenEvents[];
		leveling?: Leveling;
		aliasList?: Alias[];
		alias?: Alias[];
		intervals?: Interval[];
		commands?: Command[];
		phrases?: Phrase[];
		roles?: Role[];

		punishments?: Punishments;
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
		event: DoEvents;
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

	type PermissionTypes = PermissionsUserOrRoles | PermissionsGroup;

	interface Permissions {
		roles: {
			[id: string]: PermissionsUserOrRoles;
		}

		users: {
			[id: string]: PermissionsUserOrRoles;
		}

		groups: {
			[id: string]: PermissionsGroup;
		}
	}

	interface PermissionsUserOrRoles {
		groups: string[];
		perms: string[];
	}

	interface PermissionsGroup {
		displayName: string;
		name: string;

		perms: string[];
		groups: string[];
	}

	interface Alias {
		pid: string;

		alias: string[];
		command: string;
	}

	interface Phrase {
		_id?: string;

		pid: string;
		// sid: string;

		enabled: boolean;
		ignoreCase: boolean;

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
		disabledDefaultCommands?: string[];
		disabledCustomCommands?: string[];

		blacklisted: ModerationBlacklist;
		whitelisted: string[];
		ignoredChannels: string[];
		ignoredUsers: string[];
	}

	type ModerationBlacklist = {
		[value: string]: { punishment: PunishmentTypes, items: string[] }
	};


	interface Interval {
		_id?: string;

		pid?: string;

		guild_id?: string;
		channel_id?: string;

		displayName: string;
		message: string;
		active: boolean;

		every: number;
		nextCall?: number;

		events: {
			onCall?: string;
			onReset?: string;
		};
	}

	type PLUGIN_NAMES = 'commands' | 'logs' | 'leveling' | 'events';

	interface Plugin {

		logs?: PluginLogs;
		commands?: PluginItem;
		leveling?: PluginItem;
		events?: PluginItem;

		[name: string]: PluginItem;
	}

	interface OldPluginLogs extends PluginItem {
		textChannelId?: string;
		filter?: string[];
	}

	interface PluginLogs extends PluginItem {
		channels: PluginLogsChannel[];
	}

	interface PluginLogsChannel {
		id: string;
		priority?: number;

		// Listening to channels
		filterChannels?: string[];

		// 0 Add, 1 Rem, 2 Add/Rem
		filterMembersAddRemove?: number;
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
		editable: boolean;
		permissions: number;
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