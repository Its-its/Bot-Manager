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

import { asyncFnWrapper, asyncCatch, asyncCatchError } from '../utils';


commandPlugin.defaultCommands.initCommands();

// Commands
const BlacklistCmd =  commandPlugin.defaultCommands.get('blacklist')!;
const PunishmentCmd = commandPlugin.defaultCommands.get('punishment')!;
const EventsCmd = commandPlugin.defaultCommands.get('events')!;


if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

import client = require('../client');


let statistics = defaultStats();

function defaultStats() {
	return {
		guild_user_chat_count: 0,
		guild_bot_command_count: 0
	};
}



client.on('ready', asyncFnWrapper(
	async () => {
		logger.info(' - Client ID:' + client.user!.id);
		logger.info(' - Found ' + client.guilds.cache.size + ' Guild(s).');

		client.guilds.cache.forEach(g => logger.info(' - - ' + g.id +  ' | ' + g.region + ' | ' + g.name));

		await client.user!.setActivity({
			name: 'my surroundings...',
			type: 'WATCHING'
		});

		setInterval(() => {
			logger.info('Statistics');

			let statistics_copy = Object.assign({}, statistics);

			// Reset stats since we now have a copy of it and it gets added to the doc.
			statistics = defaultStats();


			let date = new Date();
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

		if (client.shard != null) {
			await client.shard.send('ready');
		}
	},
	async (err) => {
		logger.error(err);
		process.abort();
	}
));


if (client.shard != null && client.shard.count != 0) shardListener();


function shardListener() {
	process.on('message', msg => {
		if (msg._eval || msg._sEval) return; // Discord shard eval starts with _eval/_sEval

		logger.info(`[SHARD ${client.shard!.count}]:`, msg);
	});
}


client.on('roleDelete', asyncFnWrapper(
	async role => {
		let server = await guildClient.get(role.guild.id);

		if (server == null) return;

		await PunishmentCmd.onRoleDelete(role, server);
		levelsPlugin.roleRemove(role, server);
	},
	async async_err => {
		logger.error(async_err);
	}
));


// client.on('roleCreate', (role) => {
// });

// client.on('roleUpdate', (oldRole, newRole) => {
// });


client.on('rateLimit', rateLimit => {
	console.log('Rate Limit:', rateLimit);
});


client.on('message', asyncFnWrapper(
	async msg => {
		// Possible b/c of webhooks ??
		if (msg.member == null) return;

		// TODO: Temp. Only allow the bot to respond in guilds.
		if (msg.guild == null) return;

		// Bot?
		if (msg.member.user == null || msg.member.user.bot) return;

		// Only look at text channels for now.
		if (msg.channel.type != 'text') return;

		let server = await guildClient.get(msg.guild!.id);

		if (server == null) {
			server = new Server(msg.guild!.id, {
				region: msg.guild!.region,
				name: msg.guild!.name,
				iconURL: msg.guild!.iconURL() || '',
				createdAt: msg.guild!.createdTimestamp,
				memberCount: msg.guild!.memberCount,
				ownerID: msg.guild!.ownerID
			});

			await server.save();
		}

		if (server.moderation.channelIgnored(msg.channel.id)) return;

		let calledCommand = await commandPlugin.onDidCallCommand(client.user!.id, msg, server);

		if (calledCommand) {
			statistics.guild_bot_command_count++;
		} else {
			statistics.guild_user_chat_count++;

			await BlacklistCmd.onMessage(msg, server);
			await EventsCmd.onMessage(msg, server);

			levelsPlugin.onMessage(msg, server);
		}
	},
	async (async_err, msg) => {
		logger.error(async_err);

		msg.channel.send('An Error Occured: ' + async_err);
	}
));

client.on('guildUpdate', asyncFnWrapper(
	async (oldGuild, newGuild) => {
		let server = await guildClient.get(newGuild.id);

		if (server == null) return;

		let edited = false;

		if (server.region.length != newGuild.region.length || server.region != newGuild.region) {
			server.region = newGuild.region;
			edited = true;
		}

		if (server.name.length != newGuild.name.length || server.name != newGuild.name) {
			server.name = newGuild.name;
			edited = true;
		}

		let icon_url = newGuild.iconURL();
		if (icon_url != null && server.iconURL != icon_url) {
			server.iconURL = icon_url;
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

		if (edited) {
			await server.save();
		}
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('guildDelete', asyncFnWrapper(
	async guild => {
		logger.info('Left Server: ' + guild.name);

		await client.shard!.send('update');

		let server = await guildClient.get(guild.id);
		if (server == null) return;


		limits.guildDelete(guild.id);

		intervalPlugin.onGuildDelete(guild);
		await PunishmentCmd.onGuildRemove(guild, server);

		await DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: true } }).exec();
		await guildClient.removeFromCache(guild.id);
	},
	async async_err => {
		logger.error(async_err);
	}
));

// Server joined
client.on('guildCreate', asyncFnWrapper(
	async guild => {
		await client.shard!.send('update');

		logger.info('Joined Server: ' + guild.name);

		let validation: any = await Validation.findOneAndRemove({ listener_id: guild.id });
		// if (validation == null) {
		// 	guild.leave()
		// 	.catch(e => logger.error(e));
		// 	return;
		// }

		let exists = await guildClient.existsInCache(guild.id);

		if (exists) return;

		let [server, err] = await asyncCatch(DiscordServers.findOne({ server_id: guild.id }).exec());

		if (err != null) logger.error('DiscordServers:', err);

		let newServer = (server == null);

		// Server exists? Update DB, update and add to redis.
		if (!newServer) {
			await DiscordServers.updateOne({ server_id: guild.id }, { $set: { removed: false } }).exec();
			await guildClient.updateServerFromDB(guild.id);
		}

		if (validation != null) {
			let [item, err1] = await asyncCatch(Bots.findOne({ uid: validation.bot_id }).exec());

			if (err1 != null) logger.error('Bots:', err1);
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

			item.botType = Bots.appName('discord');
			item.botId = server!.id;
			item.displayName = guild.name;

			let err2 = await asyncCatchError(item.save());

			if (err2 != null) logger.error('Bots.save:', err);

			if (newServer) {
				let err3 = await asyncCatchError(server!.save());

				if (err3 != null) logger.error('DiscordServers.save:', err3);

				let model = new Server(guild.id, {
					region: guild.region,
					name: guild.name,
					iconURL: guild.iconURL() || '',
					createdAt: guild.createdTimestamp,
					memberCount: guild.memberCount,
					ownerID: guild.ownerID
				});

				await model.save();
			}
		} else {
			if (newServer) {
				server = new DiscordServers({
					// user_id: validation.user_id,
					// bot_id: item.id,
					server_id: guild.id,
					key: uniqueID(16)
				});

				let err = await asyncCatchError(server!.save());

				if (err != null) logger.error('DiscordServers.save:', err);

				let model = new Server(guild.id, {
					region: guild.region,
					name: guild.name,
					iconURL: guild.iconURL() || '',
					createdAt: guild.createdTimestamp,
					memberCount: guild.memberCount,
					ownerID: guild.ownerID
				});

				await model.save();
			}
		}
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('channelDelete', asyncFnWrapper(
	async channel => {
		intervalPlugin.onChannelDelete(channel);

		if (channel.type == 'text' || channel.type == 'category' || channel.type == 'voice') {
			let server = await guildClient.get((<Discord.GuildChannel>channel).guild.id);

			if (server == null) return;

			await BlacklistCmd.onChannelDelete(<Discord.GuildChannel>channel, server);

			let needsSaving = false;

			if (server.moderation.channelIgnored(channel.id)) {
				server.moderation.removeIgnore('channel', channel.id);
				needsSaving = true;
			}

			if (needsSaving) {
				await server.save();
			}
		}
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('channelCreate', asyncFnWrapper(
	async channel => {
		if (channel.type == 'text' || channel.type == 'category' || channel.type == 'voice') {
			let server = await guildClient.get((<Discord.GuildChannel>channel).guild.id);

			if (server == null) return;

			await PunishmentCmd.onChannelCreate(<Discord.GuildChannel>channel, server);
		}
	},
	async async_err => {
		logger.error(async_err);
	}
));


client.on('messageDelete', asyncFnWrapper(
	async message => {
		await logsPlugin.messageDelete(message);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('messageDeleteBulk', asyncFnWrapper(
	async message => {
		await logsPlugin.messageDeleteBulk(message);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('messageUpdate', asyncFnWrapper(
	async (oldMessage, newMessage) => {
		await logsPlugin.messageUpdate(oldMessage, newMessage);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('messageReactionAdd', asyncFnWrapper(
	async (reaction, user) => {
		if (reaction.message.guild == null) return;

		let server = await guildClient.get(reaction.message.guild.id);

		if (server == null) return;

		await levelsPlugin.onReactionAdd(user, reaction, server);

		await EventsCmd.onReactionAdd(reaction, user, server);
	},
	async async_err => {
		console.log(async_err);
	}
));

client.on('messageReactionRemove', asyncFnWrapper(
	async (reaction, user) => {
		let server = await guildClient.get(reaction.message.guild!.id);

		if (server == null) return;

		await levelsPlugin.onReactionRemove(user, reaction, server);

		await EventsCmd.onReactionRemove(reaction, user, server);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('guildMemberAdd', asyncFnWrapper(
	async guildMember => {
		let server = await guildClient.get(guildMember.guild.id);
		if (server == null) return;

		await EventsCmd.onGuildMemberAdd(guildMember, server);
		// logsPlugin.guildMemberAdd(guildMember);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('guildMemberRemove', asyncFnWrapper(
	async guildMember => {
		levelsPlugin.memberLeave(guildMember);

		let server = await guildClient.get(guildMember.guild.id);
		if (server == null) return;

		await PunishmentCmd.onGuildMemberRemove(guildMember, server);

		await EventsCmd.onGuildMemberRemove(guildMember, server);
		// logsPlugin.guildMemberRemove(guildMember);
	},
	async async_err => {
		logger.error(async_err);
	}
));

client.on('guildMemberUpdate', asyncFnWrapper(
	async (oldUser, newUser) => {
		if (oldUser.roles.cache.size != newUser.roles.cache.size) {
			let server = await guildClient.get(oldUser.guild.id);

			if (server == null) return;

			if (newUser.roles.cache.size < oldUser.roles.cache.size) {
				let removed = oldUser.roles.cache.filter(role => !newUser.roles.cache.has(role.id));
				await PunishmentCmd.onGuildMemberRoleRemove(newUser, removed.array(), server);
				// logger.info(removed);
			} else {
				let added = newUser.roles.cache.filter(role => !oldUser.roles.cache.has(role.id));
				// logger.info(added);
			}
		}
	},
	async async_err => {
		logger.error(async_err);
	}
));


function uniqueID(size: number): string {
	let bloc = [];

	for(let i = 0; i < size; i++)
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


import async = require('async');
import util = require('../../rssgrabber/utils');

import GlobalModelIntervals = require('../../models/intervals');

import DiscordModelFeed = require('../models/feed');
import DiscordModelTwitter = require('../models/twitter');
import { CustomDocs } from '@type-manager';



const CALL_EVERY = 1000 * 60 * 5;




// Twitter Feeds
setInterval(() => {
	DiscordModelTwitter.find({ active: true, last_check: { $lte: new Date(Date.now() - CALL_EVERY) } })
	.populate('feeds.feed')
	.exec((err, feedDocs: CustomDocs.discord.DiscordTwitterPopulated[]) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');


		async.eachLimit(feedDocs, 10, (doc, cbEach) => {
			// No feeds? Mark as inactive.
			if (doc.feeds.length == 0) {
				DiscordModelTwitter.updateOne({ _id: doc._id }, { $set: { active: false } })
				.exec(() => cbEach());
				return;
			}

			let newFeeds: {
				feed: CustomDocs.discord.DiscordTwitterFeeds<CustomDocs.global.TwitterFeeds>,
				item: CustomDocs.global.TwitterFeedsItem
			}[] = [];

			let feedItems: { [name: string]: any } = {};

			for(let i = 0; i < doc.feeds.length; i++) {
				let feeds = doc.feeds[i];

				feeds.feed.items.forEach(item => {
					if (feeds.items.indexOf(item.id) == -1) {
						newFeeds.push({
							feed: feeds,
							item: item
						});
					}
				});

				// Saved discord feeds is usually a different length than the Global Feeds.
				if (feeds.items.length != feeds.feed.items.length || newFeeds.length != 0) {
					feedItems['feeds.' + i + '.items'] = feeds.feed.items.map(i => i.id);
				}
			}

			if (newFeeds.length != 0) {
				let guild = client.guilds.cache.get(doc.guild_id);

				if (guild == null) {
					// Remove
					DiscordModelTwitter.find({ guild_id: doc.guild_id }, (err, feeds) => {
						let rssIds: string[] = [];

						feeds.map(f => f.feeds.map(f => f.feed))
						.forEach(f => rssIds = rssIds.concat(f.map(o => o.toHexString())));

						// TODO: Remove dupes

						DiscordModelTwitter.remove({ guild_id: doc.guild_id }).exec();
					});

					console.error('Guild doesn\'t exist anymore.')
					return;
				}

				let channel = <Discord.TextChannel>guild.channels.cache.get(doc.channel_id);

				if (channel == null) {
					// TODO: Disable
					console.error('Channel doesn\'t exist anymore.');
					return;
				}

				newFeeds.reverse().forEach(opts => {
					let { item, feed } = opts;
					channel.send(util.compileFormat(feed.format == null ? util.DEFAULT_TWITTER_FORMAT : feed.format, {
						text: item.text,
						link: item.link
					}))
					.catch(e => console.error(e));
				});
			}

			if (Object.keys(feedItems).length != 0) {
				DiscordModelTwitter.updateOne({ _id: doc._id }, { $set: feedItems }).exec();
			}

			cbEach();
		});
	});
}, 1000 * 60);


// RSS Feeds
setInterval(() => {
	DiscordModelFeed.find({ active: true, last_check: { $lte: new Date(Date.now() - CALL_EVERY) } })
	.populate('feeds.feed')
	.exec((err, feedDocs: CustomDocs.discord.DiscordRssPopulated[]) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');


		async.eachLimit(feedDocs, 10, (doc, cbEach) => {
			// No feeds? Mark as inactive.
			if (doc.feeds.length == 0) {
				DiscordModelFeed.updateOne({ _id: doc._id }, { $set: { active: false } })
				.exec(() => cbEach());
				return;
			}

			let newFeeds: {
				feed: CustomDocs.discord.DiscordRssFeeds<CustomDocs.global.RSSFeeds>,
				item: CustomDocs.global.RSSFeedsItem
			}[] = [];

			let feedItems: { [name: string]: any } = {};

			for(let i = 0; i < doc.feeds.length; i++) {
				let feeds = doc.feeds[i];

				feeds.feed.items.forEach(item => {
					if (feeds.items.indexOf(item.id) == -1) {
						newFeeds.push({
							feed: feeds,
							item: item
						});
					}
				});

				// Saved discord feeds is a different length than the RSS Feeds.
				if (feeds.items.length != feeds.feed.items.length || newFeeds.length != 0) {
					feedItems['feeds.' + i + '.items'] = feeds.feed.items.map(i => i.id);
				}
			}

			if (newFeeds.length != 0) {
				let guild = client.guilds.cache.get(doc.guild_id);

				if (guild == null) {
					// Remove
					DiscordModelFeed.find({ guild_id: doc.guild_id }, (err, feeds) => {
						let rssIds: string[] = [];

						feeds.map(f => f.feeds.map(f => f.feed))
						.forEach(f => rssIds = rssIds.concat(f.map(o => o.toHexString())));

						// TODO: Remove dupes

						DiscordModelFeed.remove({ guild_id: doc.guild_id }).exec();
					});

					console.error('Guild doesn\'t exist anymore.')
					return;
				}

				let channel = <Discord.TextChannel>guild.channels.cache.get(doc.channel_id);

				if (channel == null) {
					// TODO: Disable
					console.error('Channel doesn\'t exist anymore.');
					return;
				}

				newFeeds.reverse()
				.forEach(opts => {
					let { item, feed } = opts;
					channel.send(util.compileFormat(feed.format == null ? util.DEFAULT_RSS_FORMAT : feed.format, {
						title: item.title,
						date: item.date.toString(),
						author: item.author,
						description: item.description,
						link: item.link,
						guid: item.guid
						// tags: feed.tags
					}))
					.catch(e => console.error(e));
				});
			}

			if (Object.keys(feedItems).length != 0) {
				DiscordModelFeed.updateOne({ _id: doc._id }, { $set: feedItems }).exec();
			}

			cbEach();
		});
	});
}, 1000 * 60);


// Intervals
setInterval(() => {
	GlobalModelIntervals.find({ active: true, nextCall: { $lt: Date.now() } })
	.then(items => {
		if (items.length == 0) return;

		console.log('Calling ' + items.length + ' intervals.');

		async.every(items, (item, cb) => {
			let guild = client.guilds.cache.get(item.guild_id);

			if (guild != null) {
				let channel = <Discord.TextChannel>guild.channels.cache.get(item.channel_id);

				if (channel != null) {
					// try {
						// if (item.events.onCall) {
						// 	let ret = Function(item.events.onCall)
						// 	.call({
						// 		message: item.message,
						// 		nextCall: item.nextCall,
						// 		send: (msg) => channel.send(msg)
						// 	});

						// 	if (ret === false) return;
						// } else {
							channel.send(item.message);
						// }

						item.nextCall = Date.now() + (item.every * 1000);
						item.save();

						return cb();
					// } catch (error) {
					// 	console.error(error);
					// 	channel.send('Error with Interval ' + error);
					// 	cb();
					// }
				}
			}

			item.active = false;
			item.save();

			cb();
		});
	}, e => console.error(e));
}, 1000 * 60);


export {
	client
};