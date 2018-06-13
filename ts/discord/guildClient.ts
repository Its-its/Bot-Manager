import * as redis from 'redis';

import config = require('../site/util/config');

import DiscordServers = require('./models/servers');

import DiscordMusic = require('./discordmusic');
import DiscordServer = require('./discordserver');




let redisGuildsClient = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.guildsDB });
let redisMusic = redis.createClient({ host: config.redis.address, port: config.redis.port, db: config.redis.musicDB });

function put(serverId: string, server: DiscordServer, cb?: () => any) {
	redisGuildsClient.set(serverId, JSON.stringify(server), cb);
}

function exists(serverId: string, cb: (client: boolean) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(false); }
		if (str == null) cb(false);
		cb(true);
	});
}

function get(serverId: string, cb: (client: DiscordServer) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); return; }
		if (str == null) return cb(null); // TODO: Check DB?
		cb(new DiscordServer(serverId, JSON.parse(str)));
	});
}

function updateServer(serverId: string, cb?: () => any) {
	DiscordServers.findOne({ server_id: serverId })
	.populate({ path: 'command_ids', select: 'pid alias params' })
	.populate({ path: 'phrase_ids', select: 'pid enabled ignoreCase phrases responses' })
	// .populate({ path: 'interval_ids', select: 'pid ' })
	.exec((err, server: any) => {
		server.server.commands = server.command_ids;
		server.server.phrases = server.phrase_ids;
		// server.server.intervals = server.interval_ids;

		put(serverId, server.server, cb);
	});
}

function getMusic(serverId: string,  cb: (music: DiscordMusic) => any) {
	redisMusic.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		cb(new DiscordMusic(serverId, str == null ? {} : JSON.parse(str)));
	});
}

export {
	exists,
	put,
	get,
	updateServer,
	getMusic
};