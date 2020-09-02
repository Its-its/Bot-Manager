import logger = require('@logging');

import mongoose = require('mongoose');

import { Shard, ShardingManager } from 'discord.js';
import socket = require('socket.io-client');

import config = require('@config');


const SHARD_ID_STATUS: { [shard_id: number]: number } = {};
let GUILD_ID_SHARD: { [guild_id: string]: Shard } = {};


const clients = [
	'bot',
	'games',
	'interval',
	'music'
];

let manager: ShardingManager;
let io: SocketIOClient.Socket;


function launch(client: string) {
	if (clients.indexOf(client) == -1) throw new Error('Client "' + client + '" is not a valid client.');

	logger.info('Launching ' + client.toUpperCase());

	manager = new ShardingManager(`src/discord/${client}/index.js`, {
		totalShards: 'auto',
		respawn: true,
		token: config.bot.discord.token
	});

	manager.on('shardCreate', shard => {
		SHARD_ID_STATUS[shard.id] = 0;
		logger.info(`Creating shard ${shard.id} [ ${shard.id + 1} of ${manager.totalShards} ]`);

		shard.on('ready', () => SHARD_ID_STATUS[shard.id] = 1);
		shard.on('death', () => SHARD_ID_STATUS[shard.id] = 0);

		shard.on('message', opts => {
			if (typeof opts == 'string') {
				if (opts == 'ready' || opts == 'update') {
					if (opts == 'ready') logger.info(`Shard [${shard.id}]: Ready`);

					shard.eval('var opts = this.guilds.cache.map(g => g.id); opts;')
					.then((opts: string[]) => {
						// TODO: Remove
						GUILD_ID_SHARD = {};

						opts.forEach(g => GUILD_ID_SHARD[g] = shard);
					})
					.catch(e => logger.error(e));
				}
			} else if (typeof opts == 'object') {
				if (opts._eval == null) {
					io.emit('send', opts);
				}// else logger.info(message);
			} else logger.info(opts);
			// else if (message.startsWith('cmd')) {
			// 	logger.info(message.slice(4));
			// } else {
			// 	// logger.info(`MSG [${shard.id}]:`, message);
			// }
		});
	});

	manager.spawn();

	initMasterLink(client);

	if (client == 'bot') botClientSetup();
}

function botClientSetup() {
	mongoose.Promise = global.Promise;
	if (config.debug) mongoose.set('debug', true);
	mongoose.connect(config.database, { useNewUrlParser: true });

	const ModelStats: mongoose.Model<mongoose.Document> = require('./models/statistics');

	interface Shardd {
		unique_user_count: number;
		total_user_count: number;
		guild_count: number;
	}

	setInterval(() => {
		manager.broadcastEval('var opts = { unique_user_count: this.users.cache.size, total_user_count: this.guilds.cache.map(g => g.memberCount).reduce((pv, cv) => pv + cv), guild_count: this.guilds.cache.size }; opts;')
		.then((shards: Shardd[]) => {
			var guild_count = 0, unique_user_count = 0, total_user_count = 0;

			shards.forEach(s => {
				guild_count += s.guild_count;
				total_user_count += s.total_user_count;
				unique_user_count += s.unique_user_count;
			});

			var date = new Date();
			date.setUTCHours(0);
			date.setUTCSeconds(0);
			date.setMinutes(0);
			date.setUTCMilliseconds(0);

			ModelStats.updateOne({
				created_at: date
			}, {
				$set: {
					guild_count: guild_count,
					unique_user_count: unique_user_count,
					total_user_count: total_user_count
				},
				$setOnInsert: {
					created_at: date
				}
			}, { upsert: true })
			.exec();
		})
		.catch(logger.error);
	}, 15 * 60 * 1000);
}

function initMasterLink(clientName: string) {
	io = socket.connect('http://localhost:' + config.shards.discord.masterPort);

	interface FromOpts {
		_guild: string;
		// ...
	}

	io.on('from', (opts: FromOpts) => {
		logger.info('from:', opts);

		var shard = GUILD_ID_SHARD[opts._guild];

		logger.info('Guild Exists: ' + (shard != null));

		if (shard != null) {
			shard.send(opts);
		}
	});

	io.on('init', () => {
		io.emit('init', clientName);
	});

	io.on('disconnect', (reason: any) => {
		logger.info('disconnect:', reason);

		if (reason === 'io server disconnect') {
			socket.connect();
		}
	});

	io.on('connect_error', (error: any) => logger.error(error));
	io.on('connect_timeout', (error: any) => logger.error(error));
}

export = {
	launch
};