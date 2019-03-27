import logging = require('@logging');

logging.info('Master Started');

import socketIO = require('socket.io');
import config = require('@config');

import { Nullable } from '@type-manager';

interface SocketExt extends socketIO.Socket {
	port: number;
}


const BOTS: { [type: string]: SocketExt } = {
	// 'bot_type': port
};

// Process
// Start: Master -> Bot, interval, etcc.
// Then: Bot, etc. call master with list of guilds and port.


const io = socketIO.listen(config.shards.discord.masterPort);


io.on('connection', (socket: SocketExt) => {
	logging.info('Connection: ' + socket.id);

	let botType: Nullable<string> = null;

	socket.on('init', type => {
		socket.port = config.shards.discord[type + 'Port'];
		logging.info(`init: ${type} - ${socket.port}`);

		botType = type;
		BOTS[type] = socket;
	});


	socket.on('send', opts => {
		logging.info(`send: ${opts.from} -> ${opts.to}`);
		BOTS[opts.to].emit('from', opts);
	});

	socket.emit('init');
});