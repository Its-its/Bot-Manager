import { Shard, ShardingManager } from 'discord.js';

import config = require('../config');


const SHARD_ID_STATUS: { [guild_id: string]: number } = {};
const GUILD_ID_SHARD: { [guild_id: string]: Shard } = {};


const clients = [
	'bot',
	'interval',
	'music'
];

let manager: ShardingManager;

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

	manager.on('message', (shard, message) => {
		if (message == 'ready') {
			console.log(`Shard [${shard.id}]: Ready`);

			shard.eval('var opts = { status: this.status, guild_ids: this.guilds.map(g => g.id) }; opts;')
			.then(opts => {
				SHARD_ID_STATUS[shard.id] = opts.status;
				opts.guild_ids.forEach(g => GUILD_ID_SHARD[g] = shard);
			})
			.catch(e => console.error(e));
		} else {
			// console.log(`MSG [${shard.id}]:`, message);
		}
	});

	setInterval(() => {
		manager.broadcastEval('var opts = { id: this.shard.id, status: this.status }; opts;')
		.then(shards => {
			shards.forEach(s => SHARD_ID_STATUS[s.id] = s.status);
		})
		.catch(e => console.error(e));
	}, 1000 * 60 * 5);

	manager.spawn();

	// if (client == 'bot') botCreated();
}

function botCreated() {
	const http = require('http');
	const express = require('express');
	const bodyParser = require('body-parser');
	const RateLimit = require('express-rate-limit');

	const app = express();
	const server = http.createServer(app);

	app.set('port', config.bot.discord.port);

	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	app.post('/message',
	new RateLimit({
		windowMs: 1000 * 60 * 5,
		max: 1,
		delayMs: 0,
		message: 'Sending message requests too quickly. 1 per 5 minutes. Attempting to abuse this will result in being removed from the service.',
		// keyGenerator: req => req['cf-ip']
	}), (req, res) => {
		var { gid, cid, message } = req.body;

		if (!gid || !cid || !message) return res.send('error');

		manager.broadcastEval(`
			var guild = this.guilds.get('${gid}');

			if (guild != null) {
				var channel = guild.channels.get('${cid}');

				if (channel != null) {
					channel.send(\`${(<string>message).slice(0, 200).replace('\`', '\\\`')} - \\\`\\\`Sent from API\\\`\\\`\`)
					.catch(e => console.error(e));
					return true;
				}
			}

			return false;
		`).catch(c => console.error(c));

		console.log(gid + ' - ' + cid);
		console.log(message);

		res.send('ok');
	});

	app.post('/:gid/:cid/:mid', (req, res) => {
		var { gid, cid, mid } = req.body;

		console.log(gid + ' - ' + cid + ' - ' + mid);
	});

	server.listen(app.get('port'), () => console.log('Started server.'));
}

export = {
	launch
};