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

				shard.eval('var opts = { status: this.status, guild_ids: this.guilds.map(g => g.id) }; opts;')
				.then(opts => {
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
		.catch(e => console.error(e));
	}, 1000 * 60 * 5);

	manager.spawn();

	initLink(client);
}

function initLink(botType: string) {
	io = socket.connect('http://localhost:' + config.shards.discord.masterPort);

	io.on('from', opts => {
		console.log('from:', opts);

		var shard = GUILD_ID_SHARD[opts._guild];

		console.log('Guild Exists: ' + (shard != null));

		if (shard != null) {
			shard.send(opts);
		}
	});

	io.on('init', () => {
		io.emit('init', botType);
	});

	io.on('disconnect', reason => {
		console.log('disconnect:', reason);

		if (reason === 'io server disconnect') {
			socket.connect();
		}
	});

	io.on('connect_error', error => console.error(error));
	io.on('connect_timeout', error => console.error(error));
}

export = {
	launch
};