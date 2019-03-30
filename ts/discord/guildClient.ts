import { Guild } from 'discord.js';


import redis = require('redis');

import config = require('@config');

import DiscordServers = require('./models/servers');

import DiscordServer = require('./bot/GuildServer');
import { getMusic } from './music/GuildMusic';
import { CustomDocs } from '@type-manager';


// TODO: Cache Server even though it takes milliseconds to JSON.parse each get.

const redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });
const redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });

function putInCache(serverId: string, server: DiscordServer, cb?: redis.Callback<"OK">) {
	redisGuildsClient.set(serverId, JSON.stringify(server), cb);
}

function existsInCache(serverId: string, cb: (client: boolean) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(false); }
		if (str == null) cb(false);
		cb(true);
	});
}

function getOrCreate(guild: Guild, cb: (client: DiscordServer) => any) {
	get(guild.id, server => {
		if (server != null) return cb(server);

		console.log('Created ' + guild.name + ' (' + guild.id + ')');

		server = new DiscordServer(guild.id, {
			region: guild.region,
			name: guild.name,
			iconURL: guild.iconURL,
			createdAt: guild.createdTimestamp,
			memberCount: guild.memberCount,
			ownerID: guild.ownerID
		});

		server.save(() => {
			cb(server!);
		});
	});
}

function get(serverId: string, cb: (client?: DiscordServer) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); return cb(); }

		if (str == null) {
			updateServerFromDB(serverId, (found, err) => {
				if (err != null || !found) return cb();

				redisGuildsClient.get(serverId, (err, str) => {
					if (err != null) { console.error(err); return cb(); }
					if (str == null) return cb();

					return cb(new DiscordServer(serverId, JSON.parse(str)));
				});
			});
		} else {
			cb(new DiscordServer(serverId, JSON.parse(str)));
		}
	});
}

function removeFromCache(serverId: string, cb: (count?: number) => any) {
	var doCb = false;

	redisMusic.del(serverId, fin);
	redisGuildsClient.del(serverId, fin);

	function fin(err?: any, count?: number) {
		if (doCb) {
			if (err != null) { console.error(err); cb(); return; }
			return cb(count);
		}

		doCb = true;
	}
}

function updateServerFromDB(serverId: string, cb?: (found: boolean, err: Error | null) => any) {
	DiscordServers.findOne({ server_id: serverId })
	.populate({ path: 'command_ids', select: 'pid alias params' })
	.populate({ path: 'phrase_ids', select: 'pid enabled ignoreCase phrases responses' })
	.populate({ path: 'interval_ids', select: 'pid' })
	.exec((err, server: CustomDocs.discord.ServersPopulatedDocument) => {
		if (err == null) return cb && cb(false, err);
		if (server == null) return cb && cb(false, new Error('No Server'));

		var parsed: DiscordServer;

		if (typeof server.server == 'string') {
			parsed = JSON.parse(server.server);
		} else {
			parsed = server.server;
		}

		parsed.linked = (server.bot_id != null && server.bot_id.length != 0);

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

		parsed.intervals = server.interval_ids.map(i => {
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

		putInCache(serverId, parsed, err => cb && cb(true, err));
	});
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