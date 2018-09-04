import mongoose = require('mongoose');
import * as Discord from 'discord.js';
import * as Events from 'events';

import logger = require('../logging');

import migration = require('../migration');

import DiscordServers = require('../models/servers');
import Validation = require('../../site/models/validation');
import Bots = require('../../site/models/bots');


// Plugins
import commandPlugin = require('../plugins/commands');
import logsPlugin = require('../plugins/logs');
import levelsPlugin = require('../plugins/levels');

// Commands
const BlacklistCmd = commandPlugin.defaultCommands.get('blacklist');
const PunishmentCmd = commandPlugin.defaultCommands.get('punishment');

import config = require('../../site/util/config');

import guildClient = require('../guildClient');
import Server = require('../discordserver');

mongoose.Promise = global.Promise;
if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true });

import client = require('./discord');
client.options.disabledEvents = [
	'TYPING_START'
];

let events: NewNode = new Events();

// let app = express();
// app.set('port', config.bot.discord.port);
// app.use(cookieParse());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());


// app.get('/', (req, res) => { res.send('ok'); });


// http.createServer(app)
// .listen(app.get('port'), () => logger.info('Started Discord Server Listener.'));

var finishedMigrationCheck = false;

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
		if (pos == ids.length) {
			finishedMigrationCheck = true;
			return logger.info('Finished Migration Check.');
		}

		var id = ids[pos++];

		guildClient.get(id, server => {
			migration.check(server, (ok, updated) => {
				if (updated) {
					logger.info('Finished \'' + id + '\': ' + (ok ? 'Success' : 'Errored'));
					server.save();
				}

				check();
			});
		});
	}
});


if (client.shard != null && client.shard.count != 0) {
	shardListener();
}


function shardListener() {
	process.on('message', msg => {
		if (!msg._drss) return; // Discord shard eval starts with _eval/_sEval

		console.log('[PROCESS]:', msg);
	});
}


client.on('roleDelete', role => {
	guildClient.get(role.guild.id, server => {
		if (server == null) return;

		PunishmentCmd.onRoleDelete(role, server);
		levelsPlugin.roleRemove(role, server);
	});
});


// client.on('roleCreate', (role) => {
// });

// client.on('roleUpdate', (oldRole, newRole) => {
// });



client.on('message', msg => {
	// Possible b/c of webhooks ??
	if (msg.member == null) return;

	if (!finishedMigrationCheck) return;

	try {
		guildClient.get(msg.member.guild.id, server => {
			if (server == null) return;

			if (server.channelIgnored(msg.channel.id)) return;

			if (!commandPlugin.onMessage(client.user.id, msg, server)) {
				BlacklistCmd.onMessage(msg, server);

				levelsPlugin.onMessage(msg, server);
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

		if (server.iconURL != newGuild.iconURL) {
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
	guildClient.remove(guild.id, () => {});
});

// Server joined
client.on('guildCreate', guild => {
	logger.info('Joined Server: ' + guild.name);

	try {
		Validation.findOneAndRemove({ listener_id: guild.id }, (err, validation: any) => {
			if (err != null) return logger.error(err);

			if (validation == null) {
				guild.leave()
				.catch(e => logger.error(e));
				return;
			}

			guildClient.exists(guild.id, exists => {
				if (exists) return;

				DiscordServers.findOne({ server_id: guild.id }, (err, server) => {
					if (err != null) logger.error('DiscordServers:', err);

					var newServer = (server == null);

					// Server exists? Update DB, update and add to redis.
					if (!newServer) {
						DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: false } }).exec();
						guildClient.updateServer(guild.id, () => {
							logger.info('Grabbed From DB!');
						});
					}

					Bots.findOne({ uid: validation.bot_id }, (err, item) => {
						if (err != null) logger.error('Bots:', err);

						if (newServer) {
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
						item.displayName = guild.name;

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
			});
		});
	} catch (error) {
		console.error(error);
	}
});


client.on('channelDelete', (channel) => {
	if (channel.type == 'text' || channel.type == 'category' || channel.type == 'voice') {
		guildClient.get((<Discord.GuildChannel>channel).guild.id, server => {
			BlacklistCmd.onChannelDelete(channel, server);
		});
	}
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

client.on('messageReactionAdd', (reaction, user) => {
	try {
		guildClient.get(reaction.message.guild.id, server => {
			if (server == null) return;
			levelsPlugin.onReactionAdd(user, reaction, server);
		});
	} catch (error) {
		logger.error(error);
	}
});

client.on('messageReactionRemove', (reaction, user) => {
	try {
		guildClient.get(reaction.message.guild.id, server => {
			if (server == null) return;
			levelsPlugin.onReactionRemove(user, reaction, server);
		});
	} catch (error) {
		logger.error(error);
	}
});

// client.on('guildMemberAdd', guildMember => {
// 	logsPlugin.guildMemberAdd(guildMember);
// });

client.on('guildMemberRemove', guildMember => {
	levelsPlugin.memberLeave(guildMember);
	PunishmentCmd.onGuildMemberRemove(guildMember);
	// logsPlugin.guildMemberRemove(guildMember);
});

client.on('guildMemberUpdate', (oldUser, newUser) => {
	if (oldUser.roles.size != newUser.roles.size) {
		try {
			guildClient.get(oldUser.guild.id, server => {
				if (server == null) return;

				if (newUser.roles.size < oldUser.roles.size) {
					var removed = oldUser.roles.filterArray(role => !newUser.roles.has(role.id));
					PunishmentCmd.onGuildMemberRoleRemove(newUser, removed, server);
					console.log(removed);
				} else {
					var added = newUser.roles.filterArray(role => !oldUser.roles.has(role.id));
					console.log(added);
				}
			});
		} catch (error) {
			logger.error(error);
		}
	}
});


function uniqueID(size: number): string {
	var bloc = [];

	for(var i = 0; i < size; i++)
		bloc.push(Math.floor((Math.random() + 1) * 0x10000).toString(16).substring(1));

	return bloc.join('');
}

// client.on('debug', debug => logger.info(debug));


// client.on('channelCreate', (channel) => logger.info(' - channelCreate', channel));
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
client.on('guildUnavailable', (guild) => logger.info(' - guildUnavailable', guild));
// client.on('messageReactionRemoveAll', (message) => logger.info(' - messageReactionRemoveAll', message));
client.on('reconnecting', () => logger.info(' - reconnecting'));
client.on('resume', (replayed) => logger.info(' - resume', replayed));
// client.on('userNoteUpdate', (user, oldNote, newNote) => logger.info(' - userNoteUpdate', user, oldNote, newNote));
// client.on('userUpdate', (oldUser, newUser) => logger.info(' - userUpdate', oldUser, newUser));
// client.on('warn', (info) => logger.info(' - warn', info));


client.login(config.bot.discord.token);

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