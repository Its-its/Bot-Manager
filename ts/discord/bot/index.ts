import logger = require('@logging');

logger.info('DISCORD: BOT');


import mongoose = require('mongoose');
import * as Discord from 'discord.js';


import DiscordServers = require('../models/servers');
import Validation = require('@site/models/validation');
import Bots = require('@site/models/bots');

import ModelStats = require('../models/statistics');


// Plugins
import commandPlugin = require('./plugins/commands');
import logsPlugin = require('./plugins/logs');
import levelsPlugin = require('./plugins/levels');
import intervalPlugin = require('./plugins/interval');


import config = require('@config');

import guildClient = require('../guildClient');
import Server = require('./GuildServer');

import limits = require('../limits');


commandPlugin.defaultCommands.initCommands();

// Commands
const BlacklistCmd =  commandPlugin.defaultCommands.get('blacklist')!;
const PunishmentCmd = commandPlugin.defaultCommands.get('punishment')!;


mongoose.Promise = global.Promise;
if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true });

import client = require('../client');

client.options.disabledEvents = [
	'TYPING_START'
];



// const DISCORD_EVENTS = [
// 	'channelCreate',
// 	'channelDelete',
// 	'channelPinsUpdate',
// 	'channelUpdate',
// 	'clientUserGuildSettingsUpdate',
// 	'clientUserSettingsUpdate',
// 	'debug',
// 	'disconnect',
// 	'emojiCreate',
// 	'emojiDelete',
// 	'emojiUpdate',
// 	'error',
// 	'guildBanAdd',
// 	'guildBanRemove',
// 	'guildCreate',
// 	'guildDelete',
// 	'guildMemberAdd',
// 	'guildMemberAvailable',
// 	'guildMemberRemove',
// 	'guildMembersChunk',
// 	'guildMemberSpeaking',
// 	'guildMemberUpdate',
// 	'guildUnavailable',
// 	'guildUpdate',
// 	'message',
// 	'messageDelete',
// 	'messageDeleteBulk',
// 	'messageReactionAdd',
// 	'messageReactionRemove',
// 	'messageReactionRemoveAll',
// 	'messageUpdate',
// 	'presenceUpdate',
// 	'rateLimit',
// 	'ready',
// 	'reconnecting',
// 	'resume',
// 	'roleCreate',
// 	'roleDelete',
// 	'roleUpdate',
// 	'typingStart',
// 	'typingStop',
// 	'userNoteUpdate',
// 	'userUpdate',
// 	'voiceStateUpdate',
// 	'warn'
// ];


let statistics = defaultStats();

function defaultStats() {
	return {
		guild_user_chat_count: 0,
		guild_bot_command_count: 0
	};
}



client.on('ready', () => {
	logger.info(' - Client ID:' + client.user.id);
	logger.info(' - Found ' + client.guilds.size + ' Guild(s).');

	// client.guilds.forEach(g => logger.info(' - - ' + g.id +  ' | ' + g.region + ' | ' + g.name));
	client.user.setActivity('the spacetime continuum', { type: 'LISTENING' });


	setInterval(() => {
		logger.info('Statistics');

		var statistics_copy = statistics;

		// Reset stats since we now have a copy of it and it gets added to the doc.
		statistics = defaultStats();


		var date = new Date();
		date.setUTCHours(0);
		date.setUTCSeconds(0);
		date.setUTCMinutes(0);
		date.setUTCMilliseconds(0);

		ModelStats.updateOne({
			created_at: date
		}, {
			$inc: statistics_copy,
			$setOnInsert: {
				created_at: date
			}
		}, { upsert: true }).exec();
	}, 9 * 60 * 1000);

	if (client.shard != null) client.shard.send('ready');
});


if (client.shard != null && client.shard.count != 0) shardListener();


function shardListener() {
	process.on('message', msg => {
		if (msg._eval || msg._sEval) return; // Discord shard eval starts with _eval/_sEval

		logger.info(`[SHARD ${client.shard.id}]:`, msg);
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


client.on('rateLimit', rateLimit => {
	logger.info('Rate Limit:', rateLimit);
});


client.on('message', msg => {
	// Possible b/c of webhooks ??
	if (msg.member == null) return;

	// Bot?
	if (msg.member.user == null || msg.member.user.bot) return;

	try {
		guildClient.get(msg.guild.id, server => {
			if (server == null) {
				server = new Server(msg.guild.id, {
					region: msg.guild.region,
					name: msg.guild.name,
					iconURL: msg.guild.iconURL,
					createdAt: msg.guild.createdTimestamp,
					memberCount: msg.guild.memberCount,
					ownerID: msg.guild.ownerID
				});

				server.save();
			}

			if (server.channelIgnored(msg.channel.id)) return;

			if (commandPlugin.onDidCallCommand(client.user.id, msg, server)) {
				statistics.guild_bot_command_count++;
			} else {
				statistics.guild_user_chat_count++;

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

client.on('guildDelete', (guild) => {
	client.shard.send('update');

	logger.info('Left Server: ' + guild.name);

	limits.guildDelete(guild.id);

	intervalPlugin.onGuildDelete(guild);
	PunishmentCmd.onGuildRemove(guild);

	DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: true } }).exec();
	guildClient.remove(guild.id, () => {});
});

// Server joined
client.on('guildCreate', guild => {
	client.shard.send('update');

	logger.info('Joined Server: ' + guild.name);

	try {
		Validation.findOneAndRemove({ listener_id: guild.id }, (err, validation: any) => {
			if (err != null) return logger.error(err);

			// if (validation == null) {
			// 	guild.leave()
			// 	.catch(e => logger.error(e));
			// 	return;
			// }

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

					if (validation != null) {
						Bots.findOne({ uid: validation.bot_id }, (err, item) => {
							if (err != null) logger.error('Bots:', err);
							if (item == null) return // TODO: Create without bot.

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
							item.botId = server!.id;
							item.displayName = guild.name;

							item.save((err) => {
								if (err != null) logger.error('Bots.save:', err);

								if (newServer) {
									server!.save(err => {
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
					} else {
						if (newServer) {
							server = new DiscordServers({
								// user_id: validation.user_id,
								// bot_id: item.id,
								server_id: guild.id,
								key: uniqueID(16)
							});

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
					}
				});
			});
		});
	} catch (error) {
		logger.error(error);
	}
});

client.on('channelDelete', channel => {
	intervalPlugin.onChannelDelete(channel);

	if (channel.type != 'dm' && channel.type != 'group') {
		guildClient.get((<Discord.GuildChannel>channel).guild.id, server => {
			if (server == null) return;

			BlacklistCmd.onChannelDelete(<Discord.GuildChannel>channel, server);

			var needsSaving = false;

			if (server.channelIgnored(channel.id)) {
				server.removeIgnore('channel', channel.id);
				needsSaving = true;
			}

			if (needsSaving) server.save();
		});
	}
});

client.on('channelCreate', channel => {
	if (channel.type != 'dm' && channel.type != 'group') {
		guildClient.get((<Discord.GuildChannel>channel).guild.id, server => {
			if (server == null) return;
			PunishmentCmd.onChannelCreate(<Discord.GuildChannel>channel, server);
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
					// logger.info(removed);
				} else {
					var added = newUser.roles.filterArray(role => !oldUser.roles.has(role.id));
					// logger.info(added);
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
	client
};