import * as express from 'express';
import * as bodyParser from 'body-parser';

import * as http from 'http';

import * as mongoose from 'mongoose';
import * as Discord from 'discord.js';
import * as Events from 'events';

import cookieParse = require('cookie-parser');

import DiscordBots = require('../site/models/discord_bots');
import DiscordServers = require('../site/models/discord_servers');
import Validation = require('../site/models/validation');
import Bots = require('../site/models/bots');

// Calls
import roles = require('./calls/roles');
// import message = require('./calls/message');

// Plugins
import commandPlugin = require('./plugins/commands');

import config = require('../site/util/config');

import guildClient = require('./guildClient');
let Server = guildClient.Server;

(<any>mongoose).Promise = global.Promise;
mongoose.connect(config.database);

// TODO: Sharding
let client = new Discord.Client();
let events: NewNode = new Events();

let app = express();
app.set('port', config.bot.discord.port);
app.use(cookieParse());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.post('/', (req, res) => {
	let user = req.body.user;
	let lastCheck = parseInt(req.body.lastCheck);

	if (user != null) console.log('Checked by ' + user + ' | ' + lastCheck);
	else console.log('Last Check ' + lastCheck);

	// let guild: Discord.Guild = client.guilds['355862318132756491'];
	// if (guild == null) return res.send('nop');;

	// let chann: Discord.TextChannel = guild.channels['402062582980018196'];
	// if (chann == null) return res.send('nop');

	// if (user != null) chann.send('Buffers Checked by ' + user + '!');
	// else chann.send([
	// 	'@everyone WEE WOO WEE WOO TNT DETECTED SOUTH WEST CORNER!',
	// 	'Check the Buffers! Bedrock and above!',
	// 	'/msg VPS anything when you\'re done checking!'
	// ].join('\n'));

	// let key = "";
	// let type = "discord.server";
	// let dos = [ "INTERVAL 1 reset", "ECHO 010101010101 :)" ];

	res.send('ok');
});



client.on('ready', () => {
	console.log(' - Client ID:', client.user.id);
	console.log(' - Found ' + client.guilds.size + ' Guild(s).');
	client.guilds.forEach(g => console.log(' -  - ' + g.id +  ' | ' + g.name + ' | ' + g.region));
});


// TODO: Express-ify events
client.on('roleCreate', (role) => {
	roles.roleCreate(role, client);
});

client.on('roleDelete', (role) => {
	roles.roleDelete(role, client);
});

client.on('roleUpdate', (oldRole, newRole) => {
	roles.roleUpdate(oldRole, newRole, client);
});



client.on('message', msg => {
	var serverId = msg.member.guild.id;

	guildClient.get(serverId, server => {
		if (server == null) return;

		if (server.channelIgnored(msg.channel.id)) return;

		if (!commandPlugin.onMessage(msg, server)) {
			if (server.hasBlacklistedWord(msg.content)) {
				msg.reply('Blacklisted.');
			}
		}
	});
});


client.on('guildMemberAdd', guildMember => {
	console.log(' - guildMemberAdd');
	console.log(guildMember);
});


// Server Deleted
client.on('guildDelete', (guild) => {
	console.log('Left Server: ' + guild.name);
	// Remove from redis & save.
	// Disable in DB.
});

// Server joined
client.on('guildCreate', guild => {
	console.log('Joined Server: ' + guild.name);
	
	Validation.findOne({ listener_id: guild.id }, (err, validation: any) => {
		if (err) return console.error(err);
		if (validation == null) {
			guild.leave()
			.then(v => {}, e => console.error(e))
			.catch(e => console.error(e));
			return;
		}

		validation.remove(() => {});

		guildClient.exists(guild.id, exist => {
			if (!exist) {
				DiscordServers.findOne({ server_id: guild.id }, (err, discServer: any) => {
					if (err != null) console.error('DiscordServers:', err);

					if (discServer != null) {
						guildClient.put(guild.id, discServer.server, () => {
							console.log('Grabbed from DB.');
						});
					} else {
						Bots.findOne({ uid: validation.bot_id }, (err, item: any) => {
							if (err != null) console.error('Bots:', err);

							var server = new DiscordServers({
								user_id: validation.user_id,
								bot_id: item.id,
								server_id: validation.listener_id,
								key: uniqueID(16)
							});

							item.is_active = true;

							item.app = {
								name: (<any>Bots).appName('discord'),
								id: server.id
							};

							item.save((err) => {
								if (err != null) console.error('Bots.save:', err);

								server.save(err => {
									if (err != null) console.error('DiscordServers.save:', err);
									new Server(guild.id, {
										region: guild.region
									}).save(() => {
										console.log('Added to redis.');
									});
								});
							});
						});
					}
				});
			}
		});
	});
});


function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

// client.on('debug', debug => console.log(debug));


client.on('channelCreate', (channel) => console.log(' - channelCreate', channel));
client.on('channelDelete', (channel) => console.log(' - channelDelete', channel));
client.on('channelPinsUpdate', (channel, time) => console.log(' - channelPinsUpdate', channel, time));
client.on('channelUpdate', (oldChannel, newChannel) => console.log(' - channelUpdate', oldChannel, newChannel));
client.on('clientUserGuildSettingsUpdate', (settings) => console.log(' - clientUserGuildSettingsUpdate', settings));
client.on('clientUserSettingsUpdate', (settings) => console.log(' - clientUserSettingsUpdate', settings));
client.on('disconnect', (event) => console.log(' - disconnect', event));
client.on('error', (error) => console.log(' - error', error));
client.on('guildBanAdd', (guild, user) => console.log(' - guildBanAdd', guild, user));
client.on('guildBanRemove', (guild, user) => console.log(' - guildBanRemove', guild, user));
client.on('guildMemberAvailable', (user) => console.log(' - guildMemberAvailable', user));
client.on('guildMembersChunk', (members, guild) => console.log(' - guildMembersChunk', members, guild));
// client.on('guildMemberSpeaking', (user, speaking) => console.log(' - guildMemberSpeaking', speaking, user));
// client.on('guildMemberUpdate', (oldUser, newUser) => console.log(' - guildMemberUpdate', oldUser, newUser));
client.on('guildUnavailable', (guild) => console.log(' - guildUnavailable', guild));
client.on('messageDelete', (message) => console.log(' - messageDelete', message));
client.on('messageDeleteBulk', (messages) => console.log(' - messageDeleteBulk', messages));
client.on('messageReactionAdd', (reaction, user) => console.log(' - messageReactionAdd', reaction, user));
client.on('messageReactionRemove', (reaction, user) => console.log(' - messageReactionRemove', reaction, user));
client.on('messageReactionRemoveAll', (message) => console.log(' - messageReactionRemoveAll', message));
client.on('messageUpdate', (oldMessage, newMessage) => console.log(' - messageUpdate'));
client.on('reconnecting', () => console.log(' - reconnecting'));
client.on('resume', (replayed) => console.log(' - resume', replayed));
client.on('userNoteUpdate', (user, oldNote, newNote) => console.log(' - userNoteUpdate', user, oldNote, newNote));
client.on('userUpdate', (oldUser, newUser) => console.log(' - userUpdate', oldUser, newUser));
client.on('warn', (info) => console.log(' - warn', info));


client.login(config.bot.discord.token);


http.createServer(app)
.listen(app.get('port'), () => console.log('Started Discord Server Listener.'));

// Kicked from server (events in order)
// - roleDelete
// - guildMemberRemove
// - guildDelete

// Invited to server
// - channelCreate
// - guildCreate
// - roleCreate
// - guildMemberUpdate

export {
	client,
	events
};

interface NewNode extends NodeJS.EventEmitter {
	on(event: 'message', listener: (message: Discord.Message, userOptions: guildClient.Server) => void): this;
}