import socket = require('socket.io-client');

let io = socket.connect('http://localhost:6743');

io.on('init', () => {
	console.log('init');
	io.emit('init', 'bot', 8081);
});

io.on('connect_error', (error: any) => console.error(error));
io.on('connect_timeout', (error: any) => console.error(error));

console.log('Start');