import { Document, Types } from 'mongoose';
import { DiscordBot, CustomDocs, Nullable, Optional } from '@type-manager';
import { ObjectId } from 'bson';

import * as redis from 'redis';
import * as Discord from 'discord.js';

import config = require('@config');

import DiscordServers = require('../models/servers');
import DiscordMembers = require('../models/members');

import Command = require('../../models/commands');
import Phrases = require('../../models/phrases');

import Commands = require('./commands');

import intervalPlugin = require('./plugins/interval');

import utils = require('../utils');



let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });

const SERVER = {
	LATEST_VERSION: 1,

	MAX_PHRASE_RESPONSES: 2,
	MAX_PHRASE_TEXT: 5
};

// TODO: Mark items edited. Only save edited items to db.

class Changes {
	public defaults = {};

	constructor() {
		//
	}

	init_changes() {
		let i = 0;
		// for (const value in this) {
		// 	if (this.hasOwnProperty(value)) {
		// 		// const element = this[value];
		// 		console.log((i++) + ' ' + value);
		// 	}
		// }
	}

	public copy(value: any): any {
		let type = typeof value;

		switch(typeof value) {
			case 'string': return String(value);
			case 'undefined':
			case 'boolean':
			case 'number':
				return value;

			case 'object':
				if (Array.isArray(value)) {
					return value.map(v => this.copy(v));
				} else {
					if (value instanceof Date) {
						return new Date(value.getDate());
					}

					let clonedObj = new value.constructor();
					for(let prop in value) {
						if(value.hasOwnProperty(prop)){
							clonedObj[prop] = this.copy(value[prop]);
						}
					}

					return clonedObj;
				}
			case 'symbol': break;
			case 'function': break;
		}
	}
}


class Server extends Changes {
	public linked: boolean;

	// public branch: number;
	public serverId: string;
	public migration: number;

	public region: string;
	public name: string;
	public iconURL: string;
	public createdAt: number;
	public memberCount: number;
	public ownerID: string;

	public commandPrefix?: string;


	public channels: DiscordBot.Channels;
	public punishments: DiscordBot.Punishments;

	public moderation: DiscordBot.Moderation = {
		blacklisted: {},
		whitelisted: [],
		ignoredChannels: [],
		ignoredUsers: [],
		disabledDefaultCommands: [],
		disabledCustomCommands: []
	};

	public events: DiscordBot.PluginEvents.Grouping[];
	public intervals: DiscordBot.Interval[];
	public ranks: string[];

	public alias: DiscordBot.Alias[];
	public commands: DiscordBot.Command[];
	public phrases: DiscordBot.Phrase[];
	public roles: DiscordBot.Role[];
	public leveling: DiscordBot.Leveling = { roles: [], keepPreviousRoles: false };

	public plugins: DiscordBot.Plugin = {
		commands: {
			enabled: true
		},
		// logs: {
		// 	enabled: false
		// },
		// events: {
		// 	enabled: false
		// }
	};


	public permissions: DiscordBot.Permissions = {
		roles: {}, users: {}, groups: {}
	};

	constructor(serverID: string, options: DiscordBot.ServerOptions) {
		super();

		this.linked = def(true, options.linked);
		this.serverId = serverID;

		this.region = options.region;
		this.name = options.name;
		this.iconURL = options.iconURL;
		this.createdAt = options.createdAt;
		this.memberCount = options.memberCount;
		this.ownerID = options.ownerID;

		this.events = def([], options.events);
		this.alias = def([], options.alias, options.aliasList);
		this.intervals = def([], options.intervals);
		this.ranks = def([], options.ranks);
		this.roles = def([], options.roles);
		this.commands = def([], options.commands);
		this.phrases = def([], options.phrases);

		// Update from old plugins
		this.plugins = def({}, options.plugins);
		if (this.plugins.logs != null) {
			if (this.plugins.logs.channels == null) {
				this.plugins.logs.channels = [];
			}

			// @ts-ignore
			if (this.plugins.logs.textChannelId != null || this.plugins.logs.filter != null) {
				this.plugins.logs.channels = [];
				this.plugins.logs.channels.push({
					// @ts-ignore
					textChannelId: this.plugins.logs.textChannelId,
				});

				// @ts-ignore
				delete this.plugins.logs['textChannelId'];
				// @ts-ignore
				delete this.plugins.logs['filter'];
			}
		}

		this.channels = def({}, options.channels);
		this.punishments = def({}, options.punishments);

		this.migration = def(SERVER.LATEST_VERSION, options.version);

		this.commandPrefix = options.commandPrefix;

		this.leveling = def(this.leveling, options.leveling);
		this.moderation = def(this.moderation, options.moderation);
		this.permissions = def(this.permissions, options.permissions);

		this.init();

		this.init_changes();
	}

	public init() {
		// Blacklisted Fix. Make sure it's proper.
		if (Array.isArray(this.moderation.blacklisted)) {
			this.moderation.blacklisted = {
				'global': {
					punishment: { type: 'censor' },
					items: this.moderation.blacklisted
				}
			};
		} else if (this.moderation.blacklisted) {
			for(let name in this.moderation.blacklisted) {
				let item = this.moderation.blacklisted[name];

				if (Array.isArray(item)) {
					this.moderation.blacklisted[name] = {
						punishment: { type: 'censor' },
						items: item
					}
				}
			}
		}
	}

	public async regrab() {
		return getServer(this.serverId);
	}

	public async save(): Promise<'OK'> {
		await DiscordServers.findOneAndUpdate(
			{ server_id: this.serverId },
			{
				$set: {
					server: JSON.stringify(this.toDBPrint())
				},
				$setOnInsert: {
					removed: false,
					created_at: new Date(),
					edited_at: new Date(),
				}
			},
			{
				runValidators: false,
				upsert: true,
			}
		);

		return new Promise((resolve, reject) => {
			redisGuildsClient.set(this.serverId, this.toString(), (err, resp) => {
				if (err) {
					return reject(err);
				} else {
					return resolve(resp);
				}
			});
		})
	}

	public isPluginEnabled(name: DiscordBot.PLUGIN_NAMES | string) {
		// Commands is enabled by default even if null.
		if (name == 'commands') return this.plugins[name] == null || this.plugins[name]!.enabled;

		return this.plugins[name] != null && this.plugins[name]!.enabled;
	}

	public getPrefix() {
		return this.commandPrefix == null ? '!' : this.commandPrefix;
	}


//#region Events



//#endregion

//#region Leveling

	public keepPreviousRoles() {
		return this.leveling != null && (this.leveling.keepPreviousRoles == null ? false : this.leveling.keepPreviousRoles);
	}

	public roleForLevel(level: number) {
		if (this.leveling == null || this.leveling.roles.length == 0) return null;

		for(let i = this.leveling.roles.length - 1; i >= 0; i--) {
			let role = this.leveling.roles[i];
			if (role.level <= level) return role.id;
		}

		return null;
	}

	public addLevelingRole(id: string, level: number) {
		if (this.leveling != null) {
			for(let i = 0; i < this.leveling.roles.length; i++) {
				let role = this.leveling.roles[i];
				if (role.id == id) return false;
			}
		} else {
			this.leveling = {
				roles: [],
				keepPreviousRoles: false
			};
		}

		this.leveling.roles.push({
			id: id,
			level: level
		});

		return true;
	}

	public removeLevelingRole(id: string) {
		if (this.leveling == null) return false;

		for(let i = 0; i < this.leveling.roles.length; i++) {
			let role = this.leveling.roles[i];
			if (role.id == id) {
				this.leveling.roles.splice(i, 1);
				return true;
			}
		}

		return false;
	}

	public editLevelingRole(id: string, level: number) {
		if (this.leveling == null) return false;

		for(let i = 0; i < this.leveling.roles.length; i++) {
			let role = this.leveling.roles[i];
			if (role.id == id) {
				if (role.level == level) return false;
				role.level = level;
				return true;
			}
		}

		return false;
	}

//#endregion

//#region Phrases

	public async createPhrase(member: Discord.GuildMember, phraseText: string[]): Promise<DiscordBot.Phrase> {
		phraseText.slice(0, SERVER.MAX_PHRASE_TEXT);

		if (this.findPhrase(phraseText) != null) {
			return Promise.reject('Phrase already exists.');
		}

		let phrase = {
			_id: undefined,
			enabled: true,
			sid: this.serverId,
			pid: uniqueID(4),
			phrases: phraseText,
			responses: [],
			ignoreCase: true
		};

		let doc = await getOrCreateUser(member);

		let model = new Phrases({
			user_id: doc.id,
			uid: phrase.pid,
			sid: phrase.sid,
			phrases: phrase.phrases,
			responses: phrase.responses
		});

		let prod = await model.save();

		phrase._id = prod.id;

		this.phrases.push(phrase);

		await DiscordServers.updateOne(
			{ server_id: this.serverId },
			{ $addToSet: { phrase_ids: prod.id } }
		).exec();

		return Promise.resolve(phrase);
	}

	public removePhrase(id: number | string, phrases?: string[]): Nullable<DiscordBot.Phrase> {
		if (this.phrases.length < id) return null;

		let phrase: Nullable<DiscordBot.Phrase> = null;
		let pos = -1;

		if (typeof id == 'string') {
			for(let i = 0; i < this.phrases.length; i++) {
				let p = this.phrases[i];
				if (p.pid == id) {
					phrase = p;
					pos = i;
					break;
				}
			}
		} else {
			pos = id - 1;
			phrase = this.phrases[pos];
		}

		if (pos == -1) return null;
		if (phrase == null) return null;

		// Remove full phrase?
		if (phrases == null) {
			Phrases.remove({ _id: phrase._id }).exec();
			this.phrases.splice(pos, 1);
		} else {
			Phrases.updateOne({ _id: phrase._id }, { $pull: { phrases: { $in: phrases } } }).exec();
			phrases.forEach((p, i) => {
				let index = phrase!.phrases.indexOf(p);
				if (index != -1) phrase!.phrases.splice(index, 1);
			});
		}

		return phrase;
	}

	public addPhrase(id: number | string, phrases: string[]): boolean {
		if (this.phrases.length < id) return false;

		if (typeof id == 'string') {
			for(let i = 0; i < this.phrases.length; i++) {
				let phrase = this.phrases[i];
				if (phrase.pid == id) {
					Phrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();
					phrase.phrases = phrase.phrases.concat(phrases).slice(0, SERVER.MAX_PHRASE_TEXT);
					return true;
				}
			}
		} else {
			let phrase = this.phrases[id - 1];
			Phrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();
			phrase.phrases = phrase.phrases.concat(phrases).slice(0, SERVER.MAX_PHRASE_TEXT);
		}

		return true;
	}

	public setPhraseResponse(id: number | string, response: DiscordBot.PhraseResponses[]): boolean {
		if (this.phrases.length < id) return false;

		response.splice(0, SERVER.MAX_PHRASE_RESPONSES);

		if (typeof id == 'string') {
			for(let i = 0; i < this.phrases.length; i++) {
				let phrase = this.phrases[i];
				if (phrase.pid == id || phrase._id == id) {
					Phrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();
					phrase.responses = response;
					return true;
				}
			}
		} else {
			let phrase = this.phrases[id - 1];
			Phrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();
			phrase.responses = response;
		}

		return true;
	}

	public setPhraseIgnoreCase(id: number | string, ignoreCase: boolean): boolean {
		if (typeof id == 'string') {
			for(let i = 0; i < this.phrases.length; i++) {
				let phrase = this.phrases[i];

				if (phrase.pid == id || phrase._id == id) {
					Phrases.updateOne({ _id: phrase._id }, { $set: { ignoreCase: ignoreCase } }).exec();
					phrase.ignoreCase = ignoreCase;
				}
			}
		} else {
			if (this.phrases.length < id) return false;

			let phrase = this.phrases[id - 1];
			Phrases.updateOne({ _id: phrase._id }, { $set: { ignoreCase: ignoreCase } }).exec();
			phrase.ignoreCase = ignoreCase;
		}

		return true;
	}

	public findPhrase(text: string[] | string): Nullable<DiscordBot.Phrase> {
		if (Array.isArray(text)) {
			text = text.slice(0, SERVER.MAX_PHRASE_TEXT);

			for(let i = 0; i < text.length; i++) {
				let phrase = this.findPhrase(text[i]);
				if (phrase != null) return phrase;
			}

			return null;
		}

		for(let i = 0; i < this.phrases.length; i++) {
			let ePhrase = this.phrases[i];

			if (ePhrase.phrases.find(p => ePhrase.ignoreCase == null || ePhrase.ignoreCase ? p.toLowerCase() == (<string>text).toLowerCase() : p == text))
				return ePhrase;
		}

		return null;
	}

	public phraseResponseToString(response: DiscordBot.PhraseResponses): string {
		switch(response.type) {
			case 'alias': return JSON.stringify(response);
			case 'echo': return JSON.stringify(response);
			case 'interval': return JSON.stringify(response);
			case 'rank': return JSON.stringify(response);
			case 'set': return JSON.stringify(response);
		}
	}

//#endregion

//#region Whitelisted/Blacklisted

	public hasBlacklistedWord(id: string, content: string): boolean {
		let splt = content.toLowerCase().split(' '); // TODO: URL Check

		let blacklisted = this.moderation.blacklisted;

		let channelBlacklist = blacklisted[id];

		if (channelBlacklist == null || channelBlacklist.items.length == 0) return false;

		for (let i = 0; i < splt.length; i++) {
			if (channelBlacklist.items.indexOf(splt[i]) != -1) return true;
		}

		return false;
	}

	public isBlacklistedItem(id: string, item: string): boolean {
		let blacklisted = this.moderation.blacklisted;

		let channelBlacklist = blacklisted[id];

		if (channelBlacklist == null || channelBlacklist.items.length == 0) return false;

		return channelBlacklist.items.indexOf(item) != -1;
	}

	public blacklist(id: string, item: string): boolean {
		let blacklisted = this.moderation.blacklisted;

		let channelBlacklist = blacklisted[id];

		if (channelBlacklist == null || channelBlacklist.items.length == 0) return false;

		let indexOf = channelBlacklist.items.indexOf(item);

		if (indexOf != -1) {
			// items.splice(indexOf, 1);
			return false;
		}

		channelBlacklist.items.push(item);

		return true;
	}

	public blacklistPunishment(id: string, punishment: DiscordBot.PunishmentTypes): boolean {
		let channelBlacklist = this.moderation.blacklisted[id];

		if (channelBlacklist == null) return false;

		channelBlacklist.punishment = punishment;

		return true;
	}

//#endregion

//#region Ignore
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

	public removeIgnore(type: 'member' | 'channel', id: string): boolean {
		if (type == 'member') {
			let indexOf = this.moderation.ignoredUsers.indexOf(id);

			if (indexOf != -1) this.moderation.ignoredUsers.splice(indexOf, 1);

			return indexOf != -1;
		} else {
			let indexOf = this.moderation.ignoredChannels.indexOf(id);

			if (indexOf != -1) this.moderation.ignoredChannels.splice(indexOf, 1);

			return indexOf != -1;
		}
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

//#endregion

//#region Commands
	public async createCommand(
		member: Discord.GuildMember,
		commandNames: string | string[],
		resp: DiscordBot.PhraseResponses | DiscordBot.CommandParam[],
	): Promise<boolean> {
		if (!Array.isArray(commandNames)) commandNames = [commandNames.toLowerCase()];
		else commandNames = commandNames.map(c => c.toLowerCase());

		for(let i = 0; i < commandNames.length; i++) {
			let name = commandNames[i];

			if (this.commandIndex(name) != -1 || this.aliasIndex(name) != -1 || Commands.is(name)) {
				return Promise.resolve(false);
			}
		}

		let comm: DiscordBot.Command = {
			_id: undefined,
			pid: uniqueID(4),
			alias: commandNames,
			params: Array.isArray(resp) ? resp : [
				{
					response: resp,
					length: 0
				}
			]
		};

		let doc = await getOrCreateUser(member);

		let model = new Command({
			user_id: doc.id,
			uid: comm.pid,
			alias: comm.alias,
			params: comm.params
		});

		let prod = await model.save();

		comm._id = prod.id;
		this.commands.push(comm);

		await DiscordServers.updateOne(
			{ server_id: this.serverId },
			{ $addToSet: { command_ids: prod.id } }
		).exec();

		return Promise.resolve(true);
	}

	public removeCommand(commandName: string, paramId?: number): boolean {
		commandName = commandName.toLowerCase();

		let index = this.commandIndex(commandName);
		if (index != -1) {
			let comm = this.commands.splice(index, 1)[0];
			Command.remove({ _id: Types.ObjectId(comm._id) }).exec();
		}

		return index != -1;
	}

	public commandIndex(commandName: string): number {
		for (let i = 0; i < this.commands.length; i++) {
			if (this.commands[i].alias.indexOf(commandName) != -1) {
				return i;
			}
		}
		return -1;
	}

//#endregion

//#region Alias

	public createAlias(alias: string | string[], command: string) {
		if (!Array.isArray(alias)) alias = [alias.toLowerCase()];
		else alias = alias.map(c => c.toLowerCase());

		for(let i = 0; i < alias.length; i++) {
			let name = alias[i];
			if (this.commandIndex(name) != -1 || this.aliasIndex(name) != -1 || Commands.is(name)) return false;
		}

		this.alias.push({
			pid: uniqueID(4),
			alias: alias,
			command: command
		});

		return true;
	}

	public removeAlias(alias: string) {
		alias = alias.toLowerCase();

		let index = this.aliasIndex(alias);
		if (index != -1) {
			this.alias.splice(index, 1)[0];
		}

		return index != -1;
	}

	public aliasIndex(aliasName: string): number {
		for (let i = 0; i < this.alias.length; i++) {
			if (this.alias[i].alias.indexOf(aliasName) != -1) {
				return i;
			}
		}

		return -1;
	}

//#endregion

//#region Ranks

	public addRank(name: string): boolean {
		if (this.isRank(name)) return false;
		this.ranks.push(name);
		return true;
	}

	public removeRank(name: string): boolean {
		let index = this.ranks.indexOf(name);
		if (index == -1) return false;
		this.ranks.splice(index, 1);
		return true;
	}

	public isRank(name: string) {
		return this.ranks.indexOf(name) != -1;
	}

//#endregion

//#region Roles
	public addRole(role: DiscordBot.Role): DiscordBot.Role[] {
		if (this.getRoleIndex(role.id) == -1) {
			this.roles.push(role);
			this.roles.sort((r1, r2) => r2.position - r1.position);
		}

		return this.roles;
	}

	public removeRole(roleId: string): DiscordBot.Role[] {
		let index = this.getRoleIndex(roleId);
		if (index != -1) this.roles.splice(index, 1);
		return this.roles;
	}

	public getRole(roleId: string): Nullable<DiscordBot.Role> {
		let index = this.getRoleIndex(roleId);
		return index == -1 ? null : this.roles[index];
	}

	public getRoleIndex(roleId: string): number {
		for (let i = 0; i < this.roles.length; i++) {
			if (this.roles[i].id == roleId) return i;
		}

		return -1;
	}

//#endregion

//#region Intervals

	public createInterval(opts: DiscordBot.Interval): number {
		this.intervals.push(opts);
		let modelId = intervalPlugin.addInterval(opts);
		opts._id = modelId;

		return this.intervals.length;
	}

	public addInterval(seconds: number, guildId: string, channelId: string): number {
		this.createInterval({
			pid: uniqueID(4),
			guild_id: guildId,
			channel_id: channelId,
			every: seconds,
			active: false,
			message: 'No message set!',
			displayName: 'Interval',
			events: {}
		});

		return this.intervals.length;
	}

	public removeInterval(id: number | string) {
		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					intervalPlugin.removeInterval(this.intervals[i]._id!);
					break;
				}
			}
		} else {
			let interval = this.intervals.splice(id - 1, 1)[0];
			if (interval == null) return console.error('Remove Interval, id does not exist!');
			intervalPlugin.removeInterval(interval._id!);
		}
	}

	public toggleInterval(id: number | string): Nullable<boolean> {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) {
			console.error('Interval not found for ID: ' + id);
			return null;
		}

		interval.active = !interval.active;
		interval.nextCall = undefined;

		let opts: any = { active: interval.active };

		if (interval.active) {
			interval.nextCall = opts.nextCall = Date.now() + (interval.every! * 1000);
		}

		intervalPlugin.editInterval(interval._id!, opts);

		return interval.active;
	}

	public setIntervalTime(id: number | string, minutes: number) {
		let interval: DiscordBot.Interval | null = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		let params: { every: number; nextCall?: any; } = {
			every: minutes
		};

		if (interval.active) {
			params.nextCall = interval.nextCall = Date.now() + (minutes * 1000);
		}

		Object.assign(interval, params);

		intervalPlugin.editInterval(interval._id!, params);
	}

	public setIntervalName(id: number | string, name: string) {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		intervalPlugin.editInterval(interval._id!, { displayName: name });
		interval.displayName = name;
	}

	public setIntervalMessage(id: number | string, name: string) {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		intervalPlugin.editInterval(interval._id!, { message: name });
		interval.message = name;
	}

	// public setIntervalEvent(id: number, event: 'onCall' | 'onReset', content: string) {
	// 	let interval = this.intervals[id - 1];
	// 	if (interval == null) return console.error('Interval not found for ID: ' + (id - 1));

	// 	if (interval.events == null) interval.events = {};
	// 	interval.events[event] = content;

	// 	intervalPlugin.editInterval(interval._id, { events: interval.events });
	// }

	public resetInterval(id: number | string): boolean {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return false;

		this.setIntervalTime(id, interval.every!);
		return true;
	}

//#endregion

//#region Permissions

	public createGroup(displayName: string): Nullable<DiscordBot.PermissionsGroup> {
		let tounique = displayName.replace(/ /, '').toLowerCase();

		if (Object.keys(this.permissions.groups).length >= 15) return null;
		if (this.permissions.groups[tounique] != null) return null;

		return this.permissions.groups[tounique] = {
			displayName: displayName,
			name: displayName.replace(/\s/, '').toLowerCase(),
			perms: [],
			groups: []
		};
	}

	public removeGroup(name: string): boolean {
		if (this.permissions.groups[name] == null) return false;

		delete this.permissions.groups[name];

		for(let id in this.permissions.roles) {
			let role = this.permissions.roles[id];

			let index = role.groups.indexOf(name);
			if (index != -1) role.groups.splice(index, 1);
		}

		for(let id in this.permissions.users) {
			let user = this.permissions.users[id];

			let index = user.groups.indexOf(name);
			if (index != -1) user.groups.splice(index, 1);
		}

		return true;
	}

	public getPermsFrom(type: 'roles' | 'users' | 'groups', id: string): Nullable<DiscordBot.PermissionTypes> {
		let sid = this.strpToId(id);

		if (sid == null) return null;

		return this.permissions[type][sid];
	}

	public isGroupsRecursive(id: string, saved: string[] = []) {
		if (saved.indexOf(id) != -1) return true;

		saved.push(id);

		let group = this.permissions.groups[id];

		for(let i = 0; i < group.groups!.length; i++) {
			if (this.isGroupsRecursive(group.groups![i], saved)) return true;
		}

		return false;
	}

	public addGroupTo(type: 'roles' | 'users' | 'groups', id: string, groupId: string): boolean {
		let perms = this.permissions[type];

		if (this.permissions.groups[groupId] == null) return false;

		if (perms[id] == null) {
			if (type == 'roles' || type == 'users') {
				perms[id] = {
					groups: [],
					perms: []
				};
			} else return false;
		}

		if (type == 'groups' && this.isGroupsRecursive(id, [ groupId ])) return false;

		let groups = perms[id].groups!;

		if (groups.length >= 5) return false;

		if (groups.indexOf(groupId) == -1)
			groups.push(groupId);

		return true;
	}

	public addPermTo(type: 'roles' | 'groups' | 'users', id: string, perm: string): boolean {
		let perms = this.permissions[type];

		let sid = this.strpToId(id);

		if (sid == null) return false;

		if (perms[sid] == null) {
			if (type == 'roles' || type == 'users') {
				perms[sid] = {
					groups: [],
					perms: []
				};
			} else return false;
		}

		let ps = perms[sid].perms;

		if (ps.length >= 25) return false;

		let permSplit = perm.split('.');

		for(let i = 0; i < permSplit.length; i++) {
			if (ps.indexOf(permSplit.slice(0, i + 1).join('.')) != -1) return false;
		}

		ps.push(perm);

		return true;
	}

	public removePermFrom(type: 'roles' | 'groups' | 'users', id: string, perm: string): boolean {
		let sid = this.strpToId(id);

		if (sid == null) return false;

		let perms = this.permissions[type];

		if (perms[sid] == null) return false;

		let index = perms[sid].perms.indexOf(perm);

		if (index == -1) return false;
		perms[sid].perms.splice(index, 1);

		return true;
	}

	public removeGroupFrom(type: 'roles' | 'users', id: string, group: string): boolean {
		let sid = this.strpToId(id);

		if (sid == null) return false;

		let perms = this.permissions[type];

		if (perms[sid] == null) return false;
		let index = perms[sid].groups.indexOf(group);

		if (index == -1) return false;
		perms[sid].groups.splice(index, 1);

		return true;
	}


	// Full Perm, used to detect "commands.bypasstoggle"
	public memberHasExactPerm(member: Discord.GuildMember, perm: string): boolean {
		if (member == null) return false;
		return this.userHasExactPerm(member.id, perm) || this.anyRoleHasExactPerm(member.roles.cache.keyArray(), perm);
	}

	public rolesHaveAnyChildPerm(roleIds: string[], perms: string[]) {
		for(let i = 0; i < perms.length; i++) {
			if (this.anyRoleHasBasePerm(roleIds, perms[i])) return true;
		}

		return false;
	}

	public anyRoleHasExactPerm(ids: string[], perm: string) {
		for(let i = 0; i < ids.length; i++) {
			if (this.roleHasExactPerm(ids[i], perm)) return true;
		}

		return false;
	}

	public roleHasExactPerm(id: string, perm: string): boolean {
		let rolePerm = this.permissions.roles[id];
		if (rolePerm == null) return false;

		return rolePerm.perms.indexOf(perm) != -1;
	}

	public userHasExactPerm(id: string, perm: string): boolean {
		let userPerm = this.permissions.users[id];
		if (userPerm == null) return false;

		return userPerm.perms.indexOf(perm) != -1;
	}


	public anyRoleHasBasePerm(ids: string[], perm: string) {
		for(let i = 0; i < ids.length; i++) {
			if (this.roleHasBasePerm(ids[i], perm)) return true;
		}

		return false;
	}

	public roleHasBasePerm(id: string, perm: string): boolean {
		let rolePerm = this.permissions.roles[id];
		if (rolePerm == null) return false;

		let expandedPerm = expandPerm(perm);

		for(let i = 0; i < expandedPerm.length; i++) {
			if (rolePerm.perms.indexOf(expandedPerm[i]) != -1) return true;
		}

		return false;
	}

	public userHasParentPerm(id: string, perm: string): boolean {
		let userPerm = this.permissions.users[id];
		if (userPerm == null) return false;

		let expandedPerm = expandPerm(perm);

		for(let i = 0; i < expandedPerm.length; i++) {
			if (userPerm.perms.indexOf(expandedPerm[i]) != -1) return true;
		}

		return false;
	}

	public userHasAnyChildPerm(user_id: string, perms: string[]): boolean {
		for(let i = 0; i < perms.length; i++) {
			if (this.userHasParentPerm(user_id, perms[i])) return true;
		}

		return false;
	}

	public hasPerms(userId: string, roleIds: string[], permItem: string): boolean {
		let userPerm = this.permissions.users[userId];

		if (userPerm != null) {
			if (userPerm.perms.indexOf(permItem) != -1) return true;

			for(let i = 0; i < userPerm.groups.length; i++) {
				let id = userPerm.groups[i];
				let group = this.permissions.groups[id];
				if (group.perms.indexOf(permItem) != -1) return true;
			}
		}

		for(let i = 0; i < roleIds.length; i++) {
			let id = roleIds[i];
			let role = this.permissions.roles[id];
			if (role.perms.indexOf(permItem) != -1) return true;

			for(let x = 0; i < role.groups.length; x++) {
				let id = role.groups[x];
				let group = this.permissions.groups[id];
				if (group.perms.indexOf(permItem) != -1) return true;
			}
		}

		return false;
	}

	public userHasPerm(user: Discord.GuildMember, perm: string): boolean {
		if (user == null) return false;

		if (user.hasPermission('ADMINISTRATOR')) return true;

		if (this.userHasParentPerm(user.id, perm)) return true;

		if (this.anyRoleHasBasePerm(user.roles.cache.keyArray(), perm)) return true;

		return false;
	}

//#endregion


	public strpToId(str?: string): Nullable<string> {
		return utils.strpToId(str);
	}

	public idType(str: string) {
		return utils.getIdType(str);
	}


	public toDBPrint() {
		return {
			version: this.migration,
			region: this.region,
			name: this.name,
			iconURL: this.iconURL,
			createdAt: this.createdAt,
			memberCount: this.memberCount,
			ownerID: this.ownerID,
			commandPrefix: this.commandPrefix,

			punishments: this.punishments,
			aliasList: this.alias,
			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,

			roles: this.roles,
			permissions: this.permissions
		};
	}

	public toString() {
		return JSON.stringify({
			version: this.migration,
			region: this.region,
			name: this.name,
			iconURL: this.iconURL,
			createdAt: this.createdAt,
			memberCount: this.memberCount,
			ownerID: this.ownerID,
			commandPrefix: this.commandPrefix,

			punishments: this.punishments,

			aliasList: this.alias,
			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,
			intervals: this.intervals,
			commands: this.commands,
			phrases: this.phrases,
			roles: this.roles,
			permissions: this.permissions
		});
	}
}

function def<D>(def: D, ...opts: Optional<Nullable<D>>[]): D {
	for(let i = 0; i < opts.length; i++) {
		let value = opts[i];

		if (value != null) {
			return value;
		}
	}

	return def;
}

async function getOrCreateUser(member: Discord.GuildMember) {
	let exists = await DiscordMembers.findOne({ 'did': member.id });

	if (exists == null) {
		let model = new DiscordMembers({
			did: member.id,
			name: member.user.username,
			discriminator: member.user.discriminator,
			avatar: member.user.avatarURL(),
			created_at: member.user.createdAt,
			connections: [],
			guilds: []
		});

		let up = await model.save();

		return up;
	} else {
		return exists;
	}
}

function getServer(serverId: string) {
	return new Promise<Server>((resolve, reject) => {
		redisGuildsClient.get(serverId, (err, str) => {
			if (err != null) {
				return reject(err);
			}

			resolve(new Server(serverId, str == null ? {} : JSON.parse(str)));
		});
	});
}

function expandPerm(perm: string): string[] {
	let splt = perm.split('.');
	return splt.map((_, i) => splt.slice(0, i + 1).join('.'));
}

function uniqueID(size: number): string {
	let bloc = [];

	for(let i = 0; i < size; i++) {
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));
	}

	return bloc.join('');
}


export = Server;