import * as redis from 'redis';
import * as Discord from 'discord.js';

import config = require('../site/util/config');

import DiscordServers = require('./models/servers');
import DiscordMembers = require('./models/members');

import Commands = require('../models/commands');
import Phrases = require('../models/phrases');

import intervalPlugin = require('./plugins/interval');

import { Document, Types } from 'mongoose';


let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });

const server = {
	lastestVersion: 1,
	maxPhraseResponses: 2,
	maxPhraseText: 5
};

class Server implements DiscordBot.Server {
	serverId: string;
	migration: number;

	region: string;
	name: string;
	iconURL: string;
	createdAt: number;
	memberCount: number;
	ownerID: string;

	commandPrefix: string;

	moderation: DiscordBot.Moderation = {
		blacklisted: [],
		whitelisted: [],
		ignoredChannels: [],
		ignoredUsers: [],
		disabledDefaultCommands: [],
		disabledCustomCommands: []
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
		this.name = options.name;
		this.iconURL = options.iconURL;
		this.createdAt = options.createdAt;
		this.memberCount = options.memberCount;
		this.ownerID = options.ownerID;

		this.intervals = options.intervals || [];
		this.ranks = options.ranks || [];
		this.roles = options.roles || [];
		this.commands = options.commands || [];
		this.phrases = options.phrases || [];
		this.plugins = options.plugins || {};
		this.values = options.values || {};
		this.migration = options.version == null ? server.lastestVersion : options.version;

		if (options.moderation) this.moderation = options.moderation;
		if (options.permissions) this.permissions = options.permissions;
	}

	public save(cb?: redis.Callback<'OK'>) { // TODO: Mark items edited. Only save edited items to db.
		redisGuildsClient.set(this.serverId, this.toString(), cb);
		DiscordServers.findOneAndUpdate( 
			{ server_id: this.serverId },
			{
				$set: {
					server: this.toDBPrint()
				},
				$setOnInsert: {
					removed: false,
					created_at: Date.now(),
					edited_at: Date.now(),
				}
			},
			{
				runValidators: false,
				upsert: true,
			},
			(err) => { if (err) console.error(err); }
		);
	}

	// Plugins
	public isPluginEnabled(name: 'commands' | 'music' | 'interval' | 'rssfeed' | 'logs') {
		return this.plugins[name] != null && this.plugins[name].enabled;
	}

	public getPrefix() {
		return this.commandPrefix == null ? '!' : this.commandPrefix;
	}


	// Phrases
	public createPhrase(member: Discord.GuildMember, phraseText: string[], cb: (phrase: DiscordBot.Phrase) => any) {
		phraseText.slice(0, server.maxPhraseText);

		if (this.findPhrase(phraseText) != null) return null;

		var phrase = {
			_id: null,
			pid: uniqueID(2),
			phrases: phraseText,
			responses: []
		};

		getOrCreateUser(member, (err, doc) => {
			new Phrases({
				user_id: doc.id,
				uid: phrase.pid,
				phrases: phrase.phrases,
				responses: phrase.responses
			})
			.save((err, prod) => {
				phrase._id = prod.id;
				this.phrases.push(phrase);

				cb(phrase);
	
				DiscordServers.updateOne(
					{ server_id: this.serverId }, 
					{ $addToSet: { phrase_ids: [ prod.id ] } });
			});
		});
	}

	public removePhrase(id: number | string, phrases?: string[]): DiscordBot.Phrase {
		if (this.phrases.length < id) return null;

		var phrase: DiscordBot.Phrase = null;
		var pos = -1;

		if (typeof id == 'string') {
			for(var i = 0; i < this.phrases.length; i++) {
				var p = this.phrases[i];
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

		// Remove full phrase?
		if (phrases == null) {
			Phrases.remove({ _id: phrase._id }).exec();
			this.phrases.splice(pos, 1);
		} else {
			Phrases.updateOne({ _id: phrase._id }, { $pull: { phrases: { $in: phrases } } }).exec();
			phrases.forEach((p, i) => {
				var index = phrase.phrases.indexOf(p);
				if (index != -1) phrase.phrases.splice(index, 1);
			});
		}

		return phrase;
	}

	public addPhrase(id: number | string, phrases: string[]): boolean {
		if (this.phrases.length < id) return false;

		if (typeof id == 'string') {
			for(var i = 0; i < this.phrases.length; i++) {
				var phrase = this.phrases[i];
				if (phrase.pid == id) {
					Phrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();
					phrase.phrases = phrase.phrases.concat(phrases).slice(0, server.maxPhraseText);
					return true;
				}
			}
		} else {
			var phrase = this.phrases[id - 1];
			Phrases.updateOne({ _id: phrase._id }, { $push: { phrases: { $each: phrases } } }).exec();
			phrase.phrases = phrase.phrases.concat(phrases).slice(0, server.maxPhraseText);
		}

		return true;
	}

	public setPhraseResponse(id: number | string, response: DiscordBot.PhraseResponses[]): boolean {
		if (this.phrases.length < id) return false;

		response.slice(0, server.maxPhraseResponses);

		if (typeof id == 'string') {
			for(var i = 0; i < this.phrases.length; i++) {
				var phrase = this.phrases[i];
				if (phrase.pid == id) {
					Phrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();
					phrase.responses = response;
					return true;
				}
			}
		} else {
			var phrase = this.phrases[id - 1];
			Phrases.updateOne({ _id: phrase._id }, { $set: { responses: response } }).exec();
			phrase.responses = response;
		}

		return true;
	}

	public setPhraseIgnoreCase(id: number, ignoreCase: boolean): boolean {
		if (this.phrases.length < id) return false;
		var phrase = this.phrases[id - 1];
		Phrases.updateOne({ _id: phrase._id }, { $set: { ignoreCase: ignoreCase } }).exec();
		phrase.ignoreCase = ignoreCase;
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

		for(var i = 0; i < this.phrases.length; i++) {
			var phrase = this.phrases[i];

			if (phrase.phrases.find(p => phrase.ignoreCase == null || phrase.ignoreCase ? p.toLowerCase() == (<string>text).toLowerCase() : p == text))
				return phrase;
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
	public createCommand(member: Discord.GuildMember, commandName: string, resp: DiscordBot.PhraseResponses, cb: (resp: boolean) => any) {
		commandName = commandName.toLowerCase();

		if (this.commandIndex(commandName) != -1) return cb(false);

		var comm: DiscordBot.Command = {
			_id: null,
			pid: uniqueID(2),
			alias: [ commandName ],
			params: [
				{
					response: resp,
					length: 0
				}
			]
		};

		getOrCreateUser(member, (err, doc) => {
			new Commands({
				user_id: doc.id,
				uid: comm.pid,
				alias: comm.alias,
				params: comm.params
			})
			.save((err, prod) => {
				comm._id = prod.id;
				this.commands.push(comm);

				cb(true);
	
				DiscordServers.updateOne(
					{ server_id: this.serverId }, 
					{ $addToSet: { command_ids: [ prod.id ] } });
			});
		});
	}

	public removeCommand(commandName: string, paramId?: number): boolean {
		commandName = commandName.toLowerCase();

		var index = this.commandIndex(commandName);
		if (index != -1) {
			var comm = this.commands.splice(index, 1)[0];
			Commands.remove({ _id: Types.ObjectId(comm._id) }).exec();
		};

		return index != -1;
	}

	public commandIndex(commandName: string): number {
		for (var i = 0; i < this.commands.length; i++) {
			if (this.commands[i].alias.indexOf(commandName) != -1) {
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
			pid: uniqueID(2),
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

	public removeInterval(id: number | string) {
		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					intervalPlugin.removeInterval(this.intervals[i]._id);
					break;
				}
			}
		} else {
			var interval = this.intervals.splice(id - 1, 1)[0];
			if (interval == null) return console.error('Remove Interval, id does not exist!');
			intervalPlugin.removeInterval(interval._id);
		}
	}

	public toggleInterval(id: number | string): boolean {
		var interval = null;

		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
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
		interval.nextCall = null;

		var opts: DiscordBot.Interval = { active: interval.active, nextCall: null };

		if (interval.active) {
			interval.nextCall = opts.nextCall = Date.now() + (interval.every * 1000);
		}

		intervalPlugin.editInterval(interval._id, opts);

		return interval.active;
	}

	public setIntervalTime(id: number | string, minutes: number) {
		var interval = null;

		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		var params: DiscordBot.Interval = {
			every: minutes
		};

		if (interval.active) {
			params.nextCall = interval.nextCall = Date.now() + (minutes * 1000);
		}

		Object.assign(interval, params);
		intervalPlugin.editInterval(interval._id, params);
	}

	public setIntervalName(id: number | string, name: string) {
		var interval = null;

		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

		intervalPlugin.editInterval(interval._id, { displayName: name });
		interval.displayName = name;
	}

	public setIntervalMessage(id: number | string, name: string) {
		var interval = null;

		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

		if (interval == null) return console.error('Interval not found for ID: ' + id);

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

	public resetInterval(id: number | string): boolean {
		var interval = null;
		
		if (typeof id == 'string') {
			for(var i = 0; i < this.intervals.length; i++) {
				if (this.intervals[i].pid == id) {
					interval = this.intervals[i];
					break;
				}
			}
		} else interval = this.intervals[id - 1];

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
		if (str == null) return null;

		if (!str.startsWith('<@') && !str.startsWith('<#')) return str;

		if (str.length < 3) return null;

		var sub = str.substr(2, str.length - 3);
		if (sub[0] == '@' || sub[0] == '#') return sub.substr(1);
		
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
			version: this.migration,
			region: this.region,
			name: this.name,
			iconURL: this.iconURL,
			createdAt: this.createdAt,
			memberCount: this.memberCount,
			ownerID: this.ownerID,

			ranks: this.ranks,
			moderation: this.moderation,
			plugins: this.plugins,
			// intervals: this.intervals.map(i => i._id), //TODO: Remove from server, store next to command_ids
			// commands: this.commands,
			// phrases: this.phrases,
			values: this.values,
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

function getOrCreateUser(member: Discord.GuildMember, cb: (err: any, doc: Document) => any) {
	DiscordMembers.findOne({
		'did': member.id
	}, (err, exists) => {
		if (exists == null) {
			new DiscordMembers({
				did: member.id,
				name: member.user.username,
				discriminator: member.user.discriminator,
				avatar: member.user.avatarURL,
				created_at: member.user.createdAt,
				connections: [],
				guilds: []
			}).save((err, ret) => {
				cb(err, ret);
			});
		} else {
			cb(err, exists);
		}
	});
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


export = Server;