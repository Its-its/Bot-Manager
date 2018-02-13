let request = require('request');
let express = require('express');
let bodyParser = require('body-parser');
let http = require('http');

let config = require('../../app/config/config.json');


let app = express();
app.set('port', 7077);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
http.createServer(app)
.listen(app.get('port'), () => console.log('Started Discord Server Listener.'));

app.get('/authorize', (req, res) => {
	console.log(req.query);
	res.send('k');

	// {
	// 	code: 'ON6IHbeiA17HBODMfD7A2LC81QBYrq',
	// 	guild_id: '314946214523174913',
	// 	permissions: '8'
	// }
});

app.get('/send', (req, res) => {
	// Would post to /api/bot/
	let post = {
		key: '',
		type: 'discord.server',
		do: ['INTERVAL 1 reset', 'ECHO :)']
	};

	request.post('http://127.0.0.1:' + config.bot.discord.port, { form: post }, () => {});
	res.send('k');
});

// // Storing
// //  - Commands
// //  - Plugins
// //  - Enabled/Disabled Items
// //  - temp values EX: last command called, last rss request, etc.

// var clientOptions = {
// 	"plugins": {
// 		//
// 	},

// 	"disabledCommands": [
// 		"number"
// 	],

// 	"values": {
// 		"lastRSSGrab": 000000
// 	},
	
// 	"commands": [
// 		{
// 			"commandName": [
// 				"ip"
// 			],
// 			"disabled": false,
// 			"params": [
// 				{
// 					"minPerms": 0,
// 					"id": 0,
// 					"length": 0,
// 					"onCalled": "ECHO play.cosmicpvp.com"
// 				},
// 				{
// 					"minPerms": 0,
// 					"id": 1,
// 					"minLength": 1,
// 					"maxLength": -1,
// 					"paramReg": "-1",
// 					"onCalled": "SET ip 0 ECHO %1"
// 				}
// 			]
// 		},
// 		{
// 			"commandName": [
// 				"tp"
// 			],
// 			"disabled": false,
// 			"params": [
// 				{
// 					"id": 0,
// 					"onCalled": "ECHO The Texturepack is google.com",
// 					"length": 0
// 				}
// 			]
// 		}
// 	]
// }





// let fs = require('fs');

// let file = 'G:/Coding/C#/Console Client/logs/VPS.txt';
// let ignoreNext = false;

// let contains = [
// 	'check',
// 	'stfu'
// ];

// let validUsers = [
// 	'its_'
// ];

// // fs.watchFile(file, (curr, prev) => {
// // 	if (ignoreNext) return ignoreNext = false;

// // 	var lines = fs.readFileSync(file, 'utf-8').split('\n');
// // 	ignoreNext = true;
// // 	fs.writeFileSync(file, '', 'utf-8');

// // 	lines.forEach(l => doLine(l));
// // });

// doLine('Chat Its_: wtf\r');

// function doLine(line) {
// 	var splt = line.split(' ', 3);

// 	if (splt.shift().toLowerCase() == 'chat') {
// 		var user = splt.shift().slice(0, -1);
// 		var message = splt.shift().trim().toLowerCase();

// 		if (user.length == 0 || message.length == 0) return;

// 		var hasPerm = validUsers.indexOf(user.toLowerCase()) != -1;

// 		if (hasPerm) {
// 			for(var i = 0; i < contains.length; i++) {
// 				if (message.contains(contains[i])) {
// 					//
// 					break;
// 				}
// 			}
// 		}
// 	}
// }