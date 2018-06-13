import * as express from 'express';
import * as bodyParser from 'body-parser';

import * as http from 'http';

import * as mongoose from 'mongoose';
import * as Discord from 'discord.js';
import * as Events from 'events';

import logger = require('../logging');

import migration = require('../migration');

import cookieParse = require('cookie-parser');

import DiscordServers = require('../models/servers');
import Validation = require('../../site/models/validation');
import Bots = require('../../site/models/bots');

// Calls
import roles = require('../calls/roles');
// import message = require('./calls/message');

// Plugins
import commandPlugin = require('../plugins/commands');
import logsPlugin = require('../plugins/logs');

import config = require('../../site/util/config');

import guildClient = require('../guildClient');
import Server = require('../discordserver');

(<any>mongoose).Promise = global.Promise;
mongoose.set('debug', true);
mongoose.connect(config.database);

// TODO: Sharding
let client = new Discord.Client();
let events: NewNode = new Events();

let app = express();
app.set('port', config.bot.discord.port);
app.use(cookieParse());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/', (req, res) => { res.send('ok'); });

app.post('/', (req, res) => {
	let user = req.body.user;
	let lastCheck = parseInt(req.body.lastCheck);

	if (user != null) logger.info('Checked by ' + user + ' | ' + lastCheck);
	else logger.info('Last Check ' + lastCheck);

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
	logger.info(' - Client ID:' + client.user.id);
	logger.info(' - Found ' + client.guilds.size + ' Guild(s).');
	client.guilds.forEach(g => logger.info(' - - ' + g.id +  ' | ' + g.region + ' | ' + g.name));
	client.user.setActivity('the spacetime continuum', { type: 'LISTENING' });

	// Migration Check
	var ids = client.guilds.map(g => g.id);
	var pos = 0;

	check();
	function check() {
		if (pos == ids.length) return logger.info('Finished Migration Check.');
		var id = ids[pos++];

		guildClient.get(id, server => {
			migration.check(server, ok => {
				logger.info('Finished \'' + id + '\': ' + (ok ? 'Success' : 'Errored'));
				server.save();
				check();
			});
		});
	}
});


// TODO: Express-ify events?
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
	if (msg.member == null) logger.error(msg);

	try {
		var serverId = msg.member.guild.id;

		guildClient.get(serverId, server => {
			if (server == null) return;

			if (server.channelIgnored(msg.channel.id)) return;

			if (!commandPlugin.onMessage(client.user.id, msg, server)) {
				if (server.hasBlacklistedWord(msg.content)) {
					msg.reply('Blacklisted.');
				}
			}
		});
	} catch (error) {
		logger.error(error);
	}
});

client.on('guildUpdate', (oldGuild, newGuild) => {
	guildClient.get(newGuild.id, server => {
		if (server == null) return;

		var edited = false;

		if (server.region.length != newGuild.region.length || server.region != newGuild.region) {
			server.region = newGuild.region;
			edited = true;
		}

		if (server.name.length != newGuild.name.length || server.name != newGuild.name) {
			server.name = newGuild.name;
			edited = true;
		}

		if (server.iconURL.length != newGuild.iconURL.length || server.iconURL != newGuild.iconURL) {
			server.iconURL = newGuild.iconURL;
			edited = true;
		}

		if (server.memberCount != newGuild.memberCount) {
			server.memberCount = newGuild.memberCount;
			edited = true;
		}

		if (server.ownerID != newGuild.ownerID) {
			server.ownerID = newGuild.ownerID;
			edited = true;
		}

		if (server.createdAt != newGuild.createdTimestamp) {
			server.createdAt = newGuild.createdTimestamp;
			edited = true;
		}

		if (edited) server.save();
	});
});

// Server Deleted
client.on('guildDelete', (guild) => {
	logger.info('Left Server: ' + guild.name);
	DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: true } }).exec();
	// TODO: Remove from redis & save.
});

// Server joined
client.on('guildCreate', guild => {
	logger.info('Joined Server: ' + guild.name);

	Validation.findOneAndRemove({ listener_id: guild.id }, (err, validation: any) => {
		if (err) return logger.error(err);
		if (validation == null) {
			guild.leave()
			.then(v => {}, e => logger.error(e))
			.catch(e => logger.error(e));
			return;
		}

		guildClient.exists(guild.id, exist => {
			if (!exist) {
				DiscordServers.findOne({ server_id: guild.id }, (err, server) => {
					if (err != null) logger.error('DiscordServers:', err);

					var newServer = (server == null);

					if (!newServer) {
						DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: false } }).exec();
						guildClient.updateServer(guild.id, () => {
							logger.log('Grabbed From DB!');
						});
					}

					Bots.findOne({ uid: validation.bot_id }, (err, item) => {
						if (err != null) logger.error('Bots:', err);

						if (server == null) {
							server = new DiscordServers({
								user_id: validation.user_id,
								bot_id: item.id,
								server_id: validation.listener_id,
								key: uniqueID(16)
							});
						}

						item.is_active = true;

						item.botType = (<any>Bots).appName('discord');
						item.botId = server.id;

						item.save((err) => {
							if (err != null) logger.error('Bots.save:', err);

							if (newServer) {
								server.save(err => {
									if (err != null) logger.error('DiscordServers.save:', err);
									new Server(guild.id, {
										region: guild.region,
										name: guild.name,
										iconURL: guild.iconURL,
										createdAt: guild.createdTimestamp,
										memberCount: guild.memberCount,
										ownerID: guild.ownerID
									}).save();
								});
							}
						});
					});
				});
			}
		});
	});
});



client.on('messageDelete', (message) => {
	logsPlugin.messageDelete(message);
});

client.on('messageDeleteBulk', (messages) => {
	logsPlugin.messageDeleteBulk(messages);
});

client.on('messageUpdate', (oldMessage, newMessage) => {
	logsPlugin.messageUpdate(oldMessage, newMessage);
});

// client.on('guildMemberAdd', guildMember => {
// 	logsPlugin.guildMemberAdd(guildMember);
// });

// client.on('guildMemberRemove', guildMember => {
// 	logsPlugin.guildMemberRemove(guildMember);
// });


function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

// client.on('debug', debug => logger.info(debug));


// client.on('channelCreate', (channel) => logger.info(' - channelCreate', channel));
// client.on('channelDelete', (channel) => logger.info(' - channelDelete', channel));
// client.on('channelPinsUpdate', (channel, time) => logger.info(' - channelPinsUpdate', channel, time));
// client.on('channelUpdate', (oldChannel, newChannel) => logger.info(' - channelUpdate', oldChannel, newChannel));
// client.on('clientUserGuildSettingsUpdate', (settings) => logger.info(' - clientUserGuildSettingsUpdate', settings));
// client.on('clientUserSettingsUpdate', (settings) => logger.info(' - clientUserSettingsUpdate', settings));
client.on('disconnect', (event) => logger.info(' - disconnect', event));
client.on('error', (error) => logger.info(' - error', error));
// client.on('guildBanAdd', (guild, user) => logger.info(' - guildBanAdd', guild, user));
// client.on('guildBanRemove', (guild, user) => logger.info(' - guildBanRemove', guild, user));
// client.on('guildMemberAvailable', (user) => logger.info(' - guildMemberAvailable', user));
// client.on('guildMembersChunk', (members, guild) => logger.info(' - guildMembersChunk', members, guild));
// client.on('guildMemberSpeaking', (user, speaking) => logger.info(' - guildMemberSpeaking', speaking, user));
// client.on('guildMemberUpdate', (oldUser, newUser) => logger.info(' - guildMemberUpdate', oldUser, newUser));
client.on('guildUnavailable', (guild) => logger.info(' - guildUnavailable', guild));
// client.on('messageReactionAdd', (reaction, user) => logger.info(' - messageReactionAdd', reaction, user));
// client.on('messageReactionRemove', (reaction, user) => logger.info(' - messageReactionRemove', reaction, user));
// client.on('messageReactionRemoveAll', (message) => logger.info(' - messageReactionRemoveAll', message));
client.on('reconnecting', () => logger.info(' - reconnecting'));
client.on('resume', (replayed) => logger.info(' - resume', replayed));
// client.on('userNoteUpdate', (user, oldNote, newNote) => logger.info(' - userNoteUpdate', user, oldNote, newNote));
// client.on('userUpdate', (oldUser, newUser) => logger.info(' - userUpdate', oldUser, newUser));
// client.on('warn', (info) => logger.info(' - warn', info));


client.login(config.bot.discord.token);


http.createServer(app)
.listen(app.get('port'), () => logger.info('Started Discord Server Listener.'));

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
	on(event: 'message', listener: (message: Discord.Message, userOptions: Server) => void): this;
}