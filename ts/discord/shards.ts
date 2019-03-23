import {Model, Document} from 'mongoose';

import { Shard, ShardingManager } from 'discord.js';
import socket = require('socket.io-client');

import config = require('../config');


const SHARD_ID_STATUS: { [guild_id: string]: number } = {};
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

	console.log('Launching ' + client.toUpperCase());


	manager = new ShardingManager(`src/discord/${client}/index.js`, {
		totalShards: 'auto',
		respawn: true,
		token: config.bot.discord.token
	});

	manager.on('launch', shard => {
		SHARD_ID_STATUS[shard.id] = 0;
		console.log(`Creating shard ${shard.id} [ ${shard.id + 1} of ${manager.totalShards} ]`);
	});

	manager.on('message', (shard, opts) => {
		if (typeof opts == 'string') {
			if (opts == 'ready' || opts == 'update') {
				if (opts == 'ready') console.log(`Shard [${shard.id}]: Ready`);

				interface EvalOpts {
					status: number;
					guild_ids: string[];
				}

				shard.eval('var opts = { status: this.status, guild_ids: this.guilds.map(g => g.id) }; opts;')
				.then((opts: EvalOpts) => {
					GUILD_ID_SHARD = {};

					SHARD_ID_STATUS[shard.id] = opts.status;
					opts.guild_ids.forEach(g => GUILD_ID_SHARD[g] = shard);
				})
				.catch(e => console.error(e));
			}
		} else if (typeof opts == 'object') {
			if (opts._eval == null) {
				io.emit('send', opts);
			}// else console.log(message);
		} else console.log(opts);
		// else if (message.startsWith('cmd')) {
		// 	console.log(message.slice(4));
		// } else {
		// 	// console.log(`MSG [${shard.id}]:`, message);
		// }
	});

	setInterval(() => {
		manager.broadcastEval('var opts = { id: this.shard.id, status: this.status }; opts;')
		.then(shards => {
			shards.forEach(s => SHARD_ID_STATUS[s.id] = s.status);
		})
		.catch(console.error);
	}, 1000 * 60 * 5);

	manager.spawn();

	initMasterLink(client);

	if (client == 'bot') botClientSetup();
}

function botClientSetup() {
	const ModelStats: Model<Document> = require('./models/statistics');

	setInterval(() => {
		manager.broadcastEval('var opts = { user_count: this.users.size, guild_count: this.guilds.size }; opts;')
		.then(shards => {
			var guild_count = 0, user_count = 0;

			shards.forEach(s => {
				guild_count += s.guild_count;
				user_count += s.user_count;
			});

			var date = new Date();
			date.setUTCHours(0);
			date.setUTCSeconds(0);
			date.setUTCMilliseconds(0);

			ModelStats.updateOne({
				created_at: date
			}, {
				$set: {
					guild_count: guild_count,
					user_count: user_count
				},
				$setOnInsert: {
					created_at: date
				}
			}, { upsert: true })
			.exec();
		})
		.catch(console.error);
	}, 30 * 60 * 60 * 1000);
}

function initMasterLink(clientName: string) {
	io = socket.connect('http://localhost:' + config.shards.discord.masterPort);

	interface FromOpts {
		_guild: string;
		// ...
	}

	io.on('from', (opts: FromOpts) => {
		console.log('from:', opts);

		var shard = GUILD_ID_SHARD[opts._guild];

		console.log('Guild Exists: ' + (shard != null));

		if (shard != null) {
			shard.send(opts);
		}
	});

	io.on('init', () => {
		io.emit('init', clientName);
	});

	io.on('disconnect', (reason: any) => {
		console.log('disconnect:', reason);

		if (reason === 'io server disconnect') {
			socket.connect();
		}
	});

	io.on('connect_error', (error: any) => console.error(error));
	io.on('connect_timeout', (error: any) => console.error(error));
}

export = {
	launch
};