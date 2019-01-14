import { Guild } from 'discord.js';


import * as redis from 'redis';

import config = require('../config');

import DiscordServers = require('./models/servers');

import DiscordServer = require('./bot/GuildServer');
import { getMusic } from './music/GuildMusic';


// TODO: Cache Server even though it takes milliseconds to JSON.parse each get.

let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });
let redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });

function put(serverId: string, server: DiscordServer, cb?: (err: Error) => any) {
	redisGuildsClient.set(serverId, JSON.stringify(server), cb);
}

function exists(serverId: string, cb: (client: boolean) => any) {
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
			cb(server);
		});
	});
}

function get(serverId: string, cb: (client: DiscordServer) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); return cb(null); }

		if (str == null) {
			updateServer(serverId, (found, err) => {
				if (err != null) {
					console.error(found ? 'Not Found:' : 'Found:', err);
					return cb(null);
				}

				redisGuildsClient.get(serverId, (err, str) => {
					if (err != null) { console.error(err); return cb(null); }
					if (str == null) return cb(null);

					return cb(new DiscordServer(serverId, JSON.parse(str)));
				});
			});
		} else {
			cb(new DiscordServer(serverId, JSON.parse(str)));
		}
	});
}

function remove(serverId: string, cb: (count: number) => any) {
	var doCb = false;

	redisMusic.del(serverId, fin);
	redisGuildsClient.del(serverId, fin);

	function fin(err, count) {
		if (doCb) {
			if (err != null) { console.error(err); cb(null); return; }
			return cb(count);
		}

		doCb = true;
	}
}

function updateServer(serverId: string, cb?: (found: boolean, err: Error) => any) {
	DiscordServers.findOne({ server_id: serverId })
	.populate({ path: 'command_ids', select: 'pid alias params' })
	.populate({ path: 'phrase_ids', select: 'pid enabled ignoreCase phrases responses' })
	// .populate({ path: 'interval_ids', select: 'pid ' })
	.exec((err, server: any) => {
		if (err == null) return cb(false, err);
		if (server == null) return cb(false, new Error('No Server'));

		if (typeof server.server == 'string') {
			server.server = JSON.parse(server.server);
		}

		server.server.linked = (server.bot_id != null && server.bot_id.length != 0);
		server.server.commands = server.command_ids;
		server.server.phrases = server.phrase_ids;
		// server.server.intervals = server.interval_ids;

		// server.server.alias = server.server.aliasList;
		// delete server.server['aliasList'];

		put(serverId, server.server, err => cb(true, err));
	});
}

export {
	exists,
	put,
	get,
	getOrCreate,
	remove,
	updateServer,

	getMusic
};