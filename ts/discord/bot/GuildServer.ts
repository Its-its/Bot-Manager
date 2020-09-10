import { Types } from 'mongoose';
import { DiscordBot, Nullable, Optional } from '@type-manager';

import * as redis from 'redis';
import * as Discord from 'discord.js';

import config = require('@config');

import DiscordServers = require('../models/servers');
import DiscordMembers = require('../models/members');

import ModelCommand = require('@base/models/commands');
import ModelPhrases = require('@base/models/phrases');

import Commands = require('./commands');

import intervalPlugin = require('./plugins/interval');

import utils = require('../utils');



const redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });

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
					for (let prop in value) {
						if (Object.prototype.hasOwnProperty.call(value, prop)) {
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


	public punishments: DiscordBot.Punishments;


	public events: Events;
	public ranks: Ranks;

	public alias: Alias;
	public commands: Command;
	public roles: Roles;
	public leveling: Leveling;

	public phrases: Phrases;
	public plugins: Plugins;
	public intervals: Intervals;
	public moderation: Moderation;
	public permissions: Permissions;

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

		this.punishments = def({}, options.punishments);

		this.migration = def(SERVER.LATEST_VERSION, options.version);

		this.commandPrefix = options.commandPrefix;

		this.events = new Events(options.events);
		this.alias = new Alias(this, def(undefined, options.alias, options.aliasList));
		this.intervals = new Intervals(options.intervals);
		this.ranks = new Ranks(options.ranks);
		this.roles = new Roles(options.roles);
		this.commands = new Command(this, options.commands);
		this.phrases = new Phrases(this, options.phrases);
		this.plugins = new Plugins(options.plugins);
		this.leveling = new Leveling(options.leveling);
		this.moderation = new Moderation(options.moderation);
		this.permissions = new Permissions(options.permissions);

		this.init_changes();
	}

	public regrab() {
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

	public isPluginEnabled(name: DiscordBot.PLUGIN_NAMES) {
		// Commands is enabled by default even if null.
		if (name == 'commands') return this.plugins[name] == null || this.plugins[name]!.enabled;

		return this.plugins[name] != null && this.plugins[name]!.enabled;
	}

	public getPrefix() {
		return this.commandPrefix == null ? '!' : this.commandPrefix;
	}


	public userHasPerm(user: Discord.GuildMember, perm: string): boolean {
		return this.permissions.userHasPerm(user, perm);
	}


	public strpToId(str?: string): Nullable<string> {
		return utils.strpToId(str);
	}

	public idType(str: string) {
		return utils.getIdType(str);
	}


	public toDBPrint(): DiscordBot.ServerOptions {
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
			aliasList: this.alias.toJSON(),
			ranks: this.ranks.toJSON(),
			moderation: this.moderation.toJSON(),
			plugins: this.plugins.toJSON(),

			roles: this.roles.toJSON(),
			permissions: this.permissions.toJSON()
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
			aliasList: this.alias.toJSON(),
			ranks: this.ranks.toJSON(),
			moderation: this.moderation.toJSON(),
			plugins: this.plugins.toJSON(),

			roles: this.roles.toJSON(),
			permissions: this.permissions.toJSON(),

			phrases: this.phrases.toJSON(),
			commands: this.commands.toJSON(),
			intervals: this.intervals.toJSON()
		});
	}
}


class Events {
	items: DiscordBot.PluginEvents.Grouping[];

	constructor(opts?: DiscordBot.PluginEvents.Grouping[]) {
		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}

	//

	public toJSON(): DiscordBot.PluginEvents.Grouping[] {
		return this.items;
	}
}


class Leveling {
	roles: {
		id: string;
		level: number;
	}[];

	keepPreviousRoles: boolean;

	constructor(opts?: DiscordBot.Leveling) {
		if (opts == undefined) {
			opts = {
				roles: [],
				keepPreviousRoles: false
			};
		}

		this.roles = opts.roles;
		this.keepPreviousRoles = opts.keepPreviousRoles;
	}

	public roleForLevel(level: number) {
		if (this.roles.length == 0) return null;

		for(let i = this.roles.length - 1; i >= 0; i--) {
			let role = this.roles[i];
			if (role.level <= level) return role.id;
		}

		return null;
	}

	public addLevelingRole(id: string, level: number) {
		if (this.roles.length != 0) {
			for(let i = 0; i < this.roles.length; i++) {
				let role = this.roles[i];
				if (role.id == id) return false;
			}
		}

		this.roles.push({
			id: id,
			level: level
		});

		return true;
	}

	public removeLevelingRole(id: string) {
		if (this.roles.length == 0) return false;

		for(let i = 0; i < this.roles.length; i++) {
			let role = this.roles[i];
			if (role.id == id) {
				this.roles.splice(i, 1);
				return true;
			}
		}

		return false;
	}

	public editLevelingRole(id: string, level: number) {
		if (this.roles.length == 0) return false;

		for(let i = 0; i < this.roles.length; i++) {
			let role = this.roles[i];

			if (role.id == id) {
				if (role.level == level) return false;
				role.level = level;
				return true;
			}
		}

		return false;
	}


	public toJSON(): DiscordBot.Leveling {
		return {
			roles: this.roles,
			keepPreviousRoles: this.keepPreviousRoles
		};
	}
}


class Command {
	server: Server;
	items: DiscordBot.Command[];

	constructor(server: Server, opts?: DiscordBot.Command[]) {
		this.server = server;

		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}


	public async createCommand(
		member: Discord.GuildMember,
		commandNames: string | string[],
		resp: DiscordBot.PhraseResponses | DiscordBot.CommandParam[],
	): Promise<boolean> {
		if (!Array.isArray(commandNames)) commandNames = [commandNames.toLowerCase()];
		else commandNames = commandNames.map(c => c.toLowerCase());

		for(let i = 0; i < commandNames.length; i++) {
			let name = commandNames[i];

			if (this.commandIndex(name) != -1 || this.server.alias.aliasIndex(name) != -1 || Commands.is(name)) {
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

		let model = new ModelCommand({
			user_id: doc.id,
			uid: comm.pid,
			alias: comm.alias,
			params: comm.params
		});

		let prod = await model.save();

		comm._id = prod.id;
		this.items.push(comm);

		await DiscordServers.updateOne(
			{ server_id: this.server.serverId },
			{ $addToSet: { command_ids: prod.id } }
		).exec();

		return Promise.resolve(true);
	}

	public removeCommand(commandName: string, paramId?: number): boolean {
		commandName = commandName.toLowerCase();

		let index = this.commandIndex(commandName);
		if (index != -1) {
			let comm = this.items.splice(index, 1)[0];
			ModelCommand.remove({ _id: Types.ObjectId(comm._id) }).exec();
		}

		return index != -1;
	}

	public commandIndex(commandName: string): number {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].alias.indexOf(commandName) != -1) {
				return i;
			}
		}
		return -1;
	}


	public toJSON(): DiscordBot.Command[] {
		return this.items;
	}
}


class Alias {
	server: Server;
	items: DiscordBot.Alias[];

	constructor(server: Server, opts?: DiscordBot.Alias[]) {
		this.server = server;

		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}


	public createAlias(alias: string | string[], command: string) {
		if (!Array.isArray(alias)) alias = [alias.toLowerCase()];
		else alias = alias.map(c => c.toLowerCase());

		for(let i = 0; i < alias.length; i++) {
			let name = alias[i];
			if (this.server.commands.commandIndex(name) != -1 || this.aliasIndex(name) != -1 || Commands.is(name)) return false;
		}

		this.items.push({
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
			this.items.splice(index, 1)[0];
		}

		return index != -1;
	}

	public aliasIndex(aliasName: string): number {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].alias.indexOf(aliasName) != -1) {
				return i;
			}
		}

		return -1;
	}


	public toJSON(): DiscordBot.Alias[] {
		return this.items;
	}
}


class Ranks {
	items: string[];

	constructor(opts?: string[]) {
		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}


	public addRank(name: string): boolean {
		if (this.isRank(name)) return false;

		this.items.push(name);

		return true;
	}

	public removeRank(name: string): boolean {
		let index = this.items.indexOf(name);

		if (index == -1) return false;

		this.items.splice(index, 1);

		return true;
	}

	public isRank(name: string) {
		return this.items.indexOf(name) != -1;
	}


	public toJSON(): string[] {
		return this.items;
	}
}


class Roles {
	items: DiscordBot.Role[];

	constructor(opts?: DiscordBot.Role[]) {
		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}


	public addRole(role: DiscordBot.Role): DiscordBot.Role[] {
		if (this.getRoleIndex(role.id) == -1) {
			this.items.push(role);
			this.items.sort((r1, r2) => r2.position - r1.position);
		}

		return this.items;
	}

	public removeRole(roleId: string): DiscordBot.Role[] {
		let index = this.getRoleIndex(roleId);
		if (index != -1) this.items.splice(index, 1);
		return this.items;
	}

	public getRole(roleId: string): Nullable<DiscordBot.Role> {
		let index = this.getRoleIndex(roleId);
		return index == -1 ? null : this.items[index];
	}

	public getRoleIndex(roleId: string): number {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].id == roleId) return i;
		}

		return -1;
	}


	public toJSON(): DiscordBot.Role[] {
		return this.items;
	}
}


class Plugins {
	logs?: DiscordBot.PluginLogs;
	commands?: DiscordBot.PluginItem;
	leveling?: DiscordBot.PluginItem;
	events?: DiscordBot.PluginEvents.Plugin;


	constructor(opts?: DiscordBot.Plugin) {
		if (opts == undefined) {
			opts = {
				commands: {
					enabled: true
				}
			};
		}


		this.logs = def(undefined, opts.logs);
		this.commands = def(undefined, opts.commands);
		this.leveling = def(undefined, opts.leveling);
		this.events = def(undefined, opts.events);

		// Fix logs.
		if (this.logs != null) {
			if (this.logs.channels == null) {
				this.logs.channels = [];
			}

			// @ts-ignore
			if (this.logs.textChannelId != null || this.logs.filter != null) {
				this.logs.channels = [];
				this.logs.channels.push({
					// @ts-ignore
					textChannelId: this.logs.textChannelId,
				});

				// @ts-ignore
				delete this.logs['textChannelId'];
				// @ts-ignore
				delete this.logs['filter'];
			}
		}
	}





	public toJSON(): DiscordBot.Plugin {
		return {
			logs: this.logs,
			commands: this.commands,
			leveling: this.leveling,
			events: this.events
		};
	}
}


class Phrases {
	server: Server;
	items: DiscordBot.Phrase[];

	constructor(server: Server, opts?: DiscordBot.Phrase[]) {
		this.server = server;

		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}

	public async createPhrase(member: Discord.GuildMember, phraseText: string[]): Promise<DiscordBot.Phrase> {
		phraseText.slice(0, SERVER.MAX_PHRASE_TEXT);

		if (this.findPhrase(phraseText) != null) {
			return Promise.reject('Phrase already exists.');
		}

		let phrase = {
			_id: undefined,
			enabled: true,
			sid: this.items,
			pid: uniqueID(4),
			phrases: phraseText,
			responses: [],
			ignoreCase: true
		};

		let doc = await getOrCreateUser(member);

		let model = new ModelPhrases({
			user_id: doc.id,
			uid: phrase.pid,
			sid: phrase.sid,
			phrases: phrase.phrases,
			responses: phrase.responses
		});

		let prod = await model.save();

		phrase._id = prod.id;

		this.items.push(phrase);

		await DiscordServers.updateOne(
			{ server_id: this.server.serverId },
			{ $addToSet: { phrase_ids: prod.id } }
		).exec();

		return phrase;
	}

	public async removePhrase(id: number | string, phrases?: string[]): Promise<Nullable<DiscordBot.Phrase>> {
		if (this.items.length < id) return null;

		let phrase: Nullable<DiscordBot.Phrase> = null;
		let pos = -1;

		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				let p = this.items[i];

				if (p.pid == id) {
					phrase = p;
					pos = i;

					break;
				}
			}
		} else {
			pos = id - 1;
			phrase = this.items[pos];
		}

		if (pos == -1) return null;
		if (phrase == null) return null;

		// Remove full phrase?
		if (phrases == null) {
			await ModelPhrases.remove({ _id: phrase._id }).exec();

			this.items.splice(pos, 1);
		} else {
			await ModelPhrases.updateOne({ _id: phrase._id }, { $pull: { phrases: { $in: phrases } } }).exec();

			phrases.forEach(p => {
				let index = phrase!.phrases.indexOf(p);
				if (index != -1) phrase!.phrases.splice(index, 1);
			});
		}

		return phrase;
	}

	public async addPhrase(id: number | string, phrases: string[]): Promise<boolean> {
		if (this.items.length < id) return false;

		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				let phrase = this.items[i];

				if (phrase.pid == id) {
					await ModelPhrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();

					phrase.phrases = phrase.phrases.concat(phrases).slice(0, SERVER.MAX_PHRASE_TEXT);

					return true;
				}
			}
		} else {
			let phrase = this.items[id - 1];

			await ModelPhrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();

			phrase.phrases = phrase.phrases.concat(phrases).slice(0, SERVER.MAX_PHRASE_TEXT);
		}

		return true;
	}

	public async setPhraseResponse(id: number | string, response: DiscordBot.PhraseResponses[]): Promise<boolean> {
		if (this.items.length < id) return false;

		response.splice(0, SERVER.MAX_PHRASE_RESPONSES);

		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				let phrase = this.items[i];

				if (phrase.pid == id || phrase._id == id) {
					await ModelPhrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();

					phrase.responses = response;

					return true;
				}
			}
		} else {
			let phrase = this.items[id - 1];

			await ModelPhrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();

			phrase.responses = response;
		}

		return true;
	}

	public async setPhraseIgnoreCase(id: number | string, ignoreCase: boolean): Promise<boolean> {
		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				let phrase = this.items[i];

				if (phrase.pid == id || phrase._id == id) {
					await ModelPhrases.updateOne({ _id: phrase._id }, { $set: { ignoreCase: ignoreCase } }).exec();

					phrase.ignoreCase = ignoreCase;
				}
			}
		} else {
			if (this.items.length < id) return false;

			let phrase = this.items[id - 1];

			await ModelPhrases.updateOne({ _id: phrase._id }, { $set: { ignoreCase: ignoreCase } }).exec();

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

		for(let i = 0; i < this.items.length; i++) {
			let ePhrase = this.items[i];

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


	public toJSON(): DiscordBot.Phrase[] {
		return this.items;
	}
}


class Intervals {
	items: DiscordBot.Interval[];

	constructor(opts?: DiscordBot.Interval[]) {
		if (opts == undefined) {
			opts = [];
		}

		this.items = opts;
	}

	public createInterval(opts: DiscordBot.Interval): number {
		this.items.push(opts);
		let modelId = intervalPlugin.addInterval(opts);
		opts._id = modelId;

		return this.items.length;
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

		return this.items.length;
	}

	public removeInterval(id: number | string) {
		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					intervalPlugin.removeInterval(this.items[i]._id!);
					break;
				}
			}
		} else {
			let interval = this.items.splice(id - 1, 1)[0];
			if (interval == null) return console.error('Remove Interval, id does not exist!');
			intervalPlugin.removeInterval(interval._id!);
		}
	}

	public toggleInterval(id: number | string): Nullable<boolean> {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					interval = this.items[i];
					break;
				}
			}
		} else interval = this.items[id - 1];

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
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					interval = this.items[i];
					break;
				}
			}
		} else interval = this.items[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		let params: { every: number; nextCall?: number; } = {
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
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					interval = this.items[i];
					break;
				}
			}
		} else interval = this.items[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		intervalPlugin.editInterval(interval._id!, { displayName: name });
		interval.displayName = name;
	}

	public setIntervalMessage(id: number | string, name: string) {
		let interval = null;

		if (typeof id == 'string') {
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					interval = this.items[i];
					break;
				}
			}
		} else interval = this.items[id - 1];

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
			for(let i = 0; i < this.items.length; i++) {
				if (this.items[i].pid == id) {
					interval = this.items[i];
					break;
				}
			}
		} else interval = this.items[id - 1];

		if (interval == null) return false;

		this.setIntervalTime(id, interval.every!);
		return true;
	}


	public toJSON(): DiscordBot.Interval[] {
		return this.items;
	}
}


class Permissions {
	roles: { [id: string]: DiscordBot.PermissionsUserOrRoles };
	users: { [id: string]: DiscordBot.PermissionsUserOrRoles };
	groups: { [id: string]: DiscordBot.PermissionsGroup; };

	constructor(opts?: DiscordBot.Permissions) {
		if (opts == undefined) {
			opts = {
				roles: {},
				users: {},
				groups: {}
			};
		}

		this.roles = def({}, opts.roles);
		this.users = def({}, opts.users);
		this.groups = def({}, opts.groups);
	}

	public createGroup(displayName: string): Nullable<DiscordBot.PermissionsGroup> {
		let tounique = displayName.replace(/ /, '').toLowerCase();

		if (Object.keys(this.groups).length >= 15) return null;
		if (this.groups[tounique] != null) return null;

		return this.groups[tounique] = {
			displayName: displayName,
			name: displayName.replace(/\s/, '').toLowerCase(),
			perms: [],
			groups: []
		};
	}

	public removeGroup(name: string): boolean {
		if (this.groups[name] == null) return false;

		delete this.groups[name];

		for(let id in this.roles) {
			let role = this.roles[id];

			let index = role.groups.indexOf(name);
			if (index != -1) role.groups.splice(index, 1);
		}

		for(let id in this.users) {
			let user = this.users[id];

			let index = user.groups.indexOf(name);
			if (index != -1) user.groups.splice(index, 1);
		}

		return true;
	}

	public getPermsFrom(type: 'roles' | 'users' | 'groups', id: string): Nullable<DiscordBot.PermissionTypes> {
		let sid = utils.strpToId(id);

		if (sid == null) return null;

		return this[type][sid];
	}

	public isGroupsRecursive(id: string, saved: string[] = []) {
		if (saved.indexOf(id) != -1) return true;

		saved.push(id);

		let group = this.groups[id];

		for(let i = 0; i < group.groups!.length; i++) {
			if (this.isGroupsRecursive(group.groups![i], saved)) return true;
		}

		return false;
	}

	public addGroupTo(type: 'roles' | 'users' | 'groups', id: string, groupId: string): boolean {
		let perms = this[type];

		if (this.groups[groupId] == null) return false;

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
		let perms = this[type];

		let sid = utils.strpToId(id);

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
		let sid = utils.strpToId(id);

		if (sid == null) return false;

		let perms = this[type];

		if (perms[sid] == null) return false;

		let index = perms[sid].perms.indexOf(perm);

		if (index == -1) return false;
		perms[sid].perms.splice(index, 1);

		return true;
	}

	public removeGroupFrom(type: 'roles' | 'users', id: string, group: string): boolean {
		let sid = utils.strpToId(id);

		if (sid == null) return false;

		let perms = this[type];

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
		let rolePerm = this.roles[id];
		if (rolePerm == null) return false;

		return rolePerm.perms.indexOf(perm) != -1;
	}

	public userHasExactPerm(id: string, perm: string): boolean {
		let userPerm = this.users[id];
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
		let rolePerm = this.roles[id];
		if (rolePerm == null) return false;

		let expandedPerm = expandPerm(perm);

		for(let i = 0; i < expandedPerm.length; i++) {
			if (rolePerm.perms.indexOf(expandedPerm[i]) != -1) return true;
		}

		return false;
	}

	public userHasParentPerm(id: string, perm: string): boolean {
		let userPerm = this.users[id];
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
		let userPerm = this.users[userId];

		if (userPerm != null) {
			if (userPerm.perms.indexOf(permItem) != -1) return true;

			for(let i = 0; i < userPerm.groups.length; i++) {
				let id = userPerm.groups[i];
				let group = this.groups[id];
				if (group.perms.indexOf(permItem) != -1) return true;
			}
		}

		for(let i = 0; i < roleIds.length; i++) {
			let id = roleIds[i];
			let role = this.roles[id];
			if (role.perms.indexOf(permItem) != -1) return true;

			for(let x = 0; i < role.groups.length; x++) {
				let id = role.groups[x];
				let group = this.groups[id];
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


	public toJSON(): DiscordBot.Permissions {
		return {
			roles: this.roles,
			users: this.users,
			groups: this.groups
		};
	}
}


class Moderation {
	disabledDefaultCommands: string[];
	disabledCustomCommands: string[];

	blacklisted: DiscordBot.ModerationBlacklist;
	whitelisted: string[];
	ignoredChannels: string[];
	ignoredUsers: string[];

	constructor(opts?: DiscordBot.Moderation) {
		if (opts == undefined) {
			opts = {
				disabledDefaultCommands: [],
				disabledCustomCommands: [],
				blacklisted: {},
				whitelisted: [],
				ignoredChannels: [],
				ignoredUsers: []
			};
		}

		this.blacklisted = def({}, opts.blacklisted);
		this.whitelisted = def([], opts.whitelisted);
		this.ignoredChannels = def([], opts.ignoredChannels);
		this.ignoredUsers = def([], opts.ignoredUsers);

		this.disabledDefaultCommands = def([], opts.disabledDefaultCommands);
		this.disabledCustomCommands = def([], opts.disabledCustomCommands);

		// Blacklisted Fix. Make sure it's proper.
		if (Array.isArray(this.blacklisted)) {
			this.blacklisted = {
				'global': {
					punishment: { type: 'censor' },
					items: this.blacklisted
				}
			};
		} else if (this.blacklisted) {
			for(let name in this.blacklisted) {
				let item = this.blacklisted[name];

				if (Array.isArray(item)) {
					this.blacklisted[name] = {
						punishment: { type: 'censor' },
						items: item
					}
				}
			}
		}
	}

	public ignore(type: 'member' | 'channel', id: string): boolean {
		if (type == 'member') {
			if (this.ignoredUsers.indexOf(id) != -1) return false;
			this.ignoredUsers.push(id);
		} else {
			if (this.ignoredChannels.indexOf(id) != -1) return false;
			this.ignoredChannels.push(id);
		}

		return true;
	}

	public removeIgnore(type: 'member' | 'channel', id: string): boolean {
		if (type == 'member') {
			let indexOf = this.ignoredUsers.indexOf(id);

			if (indexOf != -1) this.ignoredUsers.splice(indexOf, 1);

			return indexOf != -1;
		} else {
			let indexOf = this.ignoredChannels.indexOf(id);

			if (indexOf != -1) this.ignoredChannels.splice(indexOf, 1);

			return indexOf != -1;
		}
	}

	public clearIgnoreList(list: 'member' | 'channel' | 'all') {
		if (list == 'member') {
			this.ignoredUsers = [];
		} else if (list == 'channel') {
			this.ignoredChannels = [];
		} else {
			this.ignoredChannels = [];
			this.ignoredUsers = [];
		}
	}

	public channelIgnored(id: string): boolean {
		return this.ignoredChannels.indexOf(id) != -1;
	}

	public memberIgnored(id: string): boolean {
		return this.ignoredUsers.indexOf(id) != -1;
	}


	public hasBlacklistedWord(id: string, content: string): boolean {
		let splt = content.toLowerCase().split(' '); // TODO: URL Check

		let blacklisted = this.blacklisted;

		let channelBlacklist = blacklisted[id];

		if (channelBlacklist == null || channelBlacklist.items.length == 0) return false;

		for (let i = 0; i < splt.length; i++) {
			if (channelBlacklist.items.indexOf(splt[i]) != -1) return true;
		}

		return false;
	}

	public isBlacklistedItem(id: string, item: string): boolean {
		let blacklisted = this.blacklisted;

		let channelBlacklist = blacklisted[id];

		if (channelBlacklist == null || channelBlacklist.items.length == 0) return false;

		return channelBlacklist.items.indexOf(item) != -1;
	}

	public blacklist(id: string, item: string): boolean {
		let blacklisted = this.blacklisted;

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
		let channelBlacklist = this.blacklisted[id];

		if (channelBlacklist == null) return false;

		channelBlacklist.punishment = punishment;

		return true;
	}


	public toJSON(): DiscordBot.Moderation {
		return {
			blacklisted: this.blacklisted,
			whitelisted: this.whitelisted,
			ignoredUsers: this.ignoredUsers,
			ignoredChannels: this.ignoredChannels,

			disabledCustomCommands: this.disabledCustomCommands,
			disabledDefaultCommands: this.disabledDefaultCommands
		};
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


export {
	Server,
	Intervals,
	Permissions,
	Moderation,
	Phrases
};