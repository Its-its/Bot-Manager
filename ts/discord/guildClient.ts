import { Guild } from 'discord.js';


import redis = require('redis');

import config = require('@config');

import DiscordServers = require('./models/servers');

import DiscordServer = require('./bot/GuildServer');
import { getMusic } from './music/GuildMusic';
import { CustomDocs } from '@type-manager';

import { asyncFnWrapper } from './utils';


// TODO: Cache Server even though it takes milliseconds to JSON.parse each get.

const redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });
const redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });


async function putInCache(serverId: string, server: DiscordServer) {
	return new Promise((resolve, reject) => {
		redisGuildsClient.set(serverId, JSON.stringify(server), (err, ok) => {
			if (err != null) return reject(err);

			resolve();
		});
	});
}

async function existsInCache(serverId: string) {
	return new Promise((resolve, reject) => {
		redisGuildsClient.get(serverId, (err, str) => {
			if (err != null) {
				return reject(err);
			}

			if (str == null) {
				return resolve(false);
			}

			resolve(true);
		});
	});
}

async function getOrCreate(guild: Guild) {
	let server = await get(guild.id);

	if (server != null) {
		return server;
	}

	console.log('Created ' + guild.name + ' (' + guild.id + ')');

	// Create Server.

	server = new DiscordServer(guild.id, {
		region: guild.region,
		name: guild.name,
		iconURL: guild.iconURL() || '',
		createdAt: guild.createdTimestamp,
		memberCount: guild.memberCount,
		ownerID: guild.ownerID
	});

	await server.save();

	return server;
}

async function get(serverId: string) {
	return new Promise<DiscordServer | null>((resolve, reject) => {
		redisGuildsClient.get(serverId, asyncFnWrapper(async (err, str) => {
			if (err != null) return reject(err);

			if (str == null) {
				let found = await updateServerFromDB(serverId);

				if (!found) return reject('Unable to find server!');

				redisGuildsClient.get(serverId, (err, str) => {
					if (err != null) return reject(err);
					if (str == null) return resolve(null);

					resolve(new DiscordServer(serverId, JSON.parse(str)));
				});
			} else {
				resolve(new DiscordServer(serverId, JSON.parse(str)));
			}
		}, async (async_err) => reject(async_err)));
	});
}

async function removeFromCache(serverId: string) {
	return new Promise<number>((resolve, reject) => {
		let nextCallback = false;

		redisMusic.del(serverId, fin);
		redisGuildsClient.del(serverId, fin);

		function fin(err: Error | null, count: number) {
			if (err != null) {
				return reject(err);
			}

			if (nextCallback) {
				return resolve(count);
			}

			nextCallback = true;
		}
	});
}

async function updateServerFromDB(serverId: string) {
	// @ts-ignore
	let server: CustomDocs.discord.ServersPopulatedDocument = await DiscordServers.findOne({ server_id: serverId })
		.populate({ path: 'command_ids', select: 'pid alias params' })
		.populate({ path: 'phrase_ids', select: 'pid enabled ignoreCase phrases responses' })
		.populate('interval_ids')
		.exec();

	if (server == null) return Promise.reject('No Server');

	let parsed: DiscordServer;

	if (typeof server.server == 'string') {
		parsed = JSON.parse(server.server);
	} else {
		parsed = server.server;
	}

	parsed.linked = (server.bot_id != null);

	parsed.commands = server.command_ids.map(c => {
		return {
			_id: c._id,
			pid: c.pid,

			alias: c.alias,
			params: c.params
		}
	});

	parsed.phrases = server.phrase_ids.map(p => {
		return {
			_id: p._id,
			pid: p.pid,
			sid: serverId,

			enabled: p.enabled,
			phrases: p.phrases,
			responses: p.responses,
			ignoreCase: p.ignoreCase
		};
	});

	parsed.intervals.items = server.interval_ids.map(i => {
		return {
			_id: i._id,
			pid: i.pid,

			guild_id: i.guild_id,
			channel_id: i.channel_id,

			displayName: i.displayName,
			message: i.message,
			active: i.active,

			every: i.every,
			nextCall: i.nextCall,

			events: i.events
		};
	});

	// parsed.alias = parsed.aliasList;
	// delete parsed['aliasList'];

	await putInCache(serverId, parsed);

	return true;
}

export {
	existsInCache,
	putInCache,
	get,
	getOrCreate,
	removeFromCache,
	updateServerFromDB,

	getMusic
};