import socketIO = require('socket.io');
import config = require('../../config');

interface SocketExt extends socketIO.Socket {
	port: number;
}


let BOTS: { [type: string]: SocketExt } = {
	// 'bot_type': port
};

// Process
// Start: Master -> Bot, interval, etcc.
// Then: Bot, etc. call master with list of guilds and port.


const io = socketIO.listen(config.shards.discord.masterPort);


io.on('connection', (socket: SocketExt) => {
	console.log('Connection: ' + socket.id);

	let botType: string = null;

	socket.on('init', type => {
		socket.port = config.shards.discord[type + 'Port'];
		console.log(`init: ${type} - ${socket.port}`);

		botType = type;
		BOTS[type] = socket;
	});


	socket.on('send', opts => {
		console.log(`send: ${opts.from} -> ${opts.to}`);
		BOTS[opts.to].emit('from', opts);
	});

	socket.emit('init');
});