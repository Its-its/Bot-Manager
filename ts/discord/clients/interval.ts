import mongoose = require('mongoose');
import async = require('async');


import ModelIntervals = require('../../models/intervals');
import ModelRSSfeed = require('../../models/rssfeed');
import ModelDiscordFeed = require('../models/feed');

import Discord = require('discord.js');

import config = require('../../site/util/config');

import util = require('../../rssgrabber/utils');


mongoose.Promise = global.Promise;
if (config.debug) mongoose.set('debug', true);
// mongoose.connect(config.database, { useNewUrlParser: true });

console.log('Starting Intervals.');

let client = new Discord.Client({
	disabledEvents: [
		// 'READY',
		// 'RESUMED',

		// 'CHANNEL_PINS_UPDATE',
		// 'CHANNEL_CREATE',
		'CHANNEL_DELETE',
		// 'CHANNEL_UPDATE',
		'MESSAGE_CREATE',

		'GUILD_DELETE',
		// 'GUILD_SYNC',
		// 'GUILD_CREATE',
		// 'GUILD_UPDATE',
		// 'GUILD_MEMBER_ADD',
		// 'GUILD_MEMBER_REMOVE',
		// 'GUILD_MEMBER_UPDATE',
		// 'GUILD_MEMBERS_CHUNK',
		// 'GUILD_ROLE_CREATE',
		// 'GUILD_ROLE_DELETE',
		// 'GUILD_ROLE_UPDATE',
		// 'GUILD_BAN_ADD',
		// 'GUILD_BAN_REMOVE',

		// 'MESSAGE_DELETE',
		// 'MESSAGE_UPDATE',
		// 'MESSAGE_DELETE_BULK',
		// 'MESSAGE_REACTION_ADD',
		// 'MESSAGE_REACTION_REMOVE',
		// 'MESSAGE_REACTION_REMOVE_ALL',

		// 'USER_UPDATE',
		// 'USER_NOTE_UPDATE',
		// 'USER_SETTINGS_UPDATE',
		// 'USER_GUILD_SETTINGS_UPDATE',

		// 'PRESENCE_UPDATE',
		// 'TYPING_START',
		// 'RELATIONSHIP_ADD',
		// 'RELATIONSHIP_REMOVE',
		// 'VOICE_SERVER_UPDATE',
		// 'VOICE_STATE_UPDATE'
	]
});


client.login(config.bot.discord.token)
.then(() => {})
.catch(err => {
	if (err.message.includes('too many guilds')) {
		// shard
		console.log('Too many guilds');
	}
});

client.on('error', e => console.error(e));

client.on('guildDelete', guild => {
	ModelDiscordFeed.find({ guild_id: guild.id }, (err, feeds) => {
		if (err) return console.error(err);
		if (feeds.length == 0) return;

		// TODO: dec ModelRSSfeed.sending_to

		// ModelRSSfeed.updateOne({  });
	});
	ModelIntervals.remove({ guild_id: guild.id }).exec();
});

client.on('channelDelete', (channel: Discord.TextChannel) => {
	if (channel.type == 'text') {
		// If channel has RSSFeed deactivate it and set channel_id to null.
		ModelDiscordFeed.findOneAndUpdate(
			{ guild_id: channel.guild.id, channel_id: channel.id }, 
			{ $set: { channel_id: null, active: false, 'feeds.items': [] } },
			(err, found) => {
				if (found != null) {
					ModelRSSfeed.update({ _id: { $in: found['feeds'] } }, { $inc: { sending_to: -1 } }).exec();
				}
			}
		);

		//
	}
});

const callAgain = 1000 * 60 * 5;


interface FeedFix extends mongoose.Document {
	pid: string;
	format: string;
	active: boolean;
	guild_id: string;
	channel_id: string;
	last_check: Date;
	feeds: {
		items: string[];
		feed: any;
	}[];
}



function asdf() {

// RSS Feed
setInterval(() => {
	ModelDiscordFeed.find({ active: true, last_check: { $lte: Date.now() - callAgain } })
	.populate('feeds.feed')
	.exec((err, feedDocs) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');

		// Split into groups of 10.
		var grouped: FeedFix[][] = [];

		var count = Math.ceil(feedDocs.length/10);		

		for(var i = 0; i < count; i++) {
			grouped.push(feedDocs.splice(0, 10));
		}

		async.every(grouped, (docs, cbEvery) => {
			// Execute simultaneously.
			async.each(docs, (doc: any, cbEach) => {
				if (doc.feeds.length == 0) {
					ModelDiscordFeed.updateOne({ _id: doc._id }, { $set: { active: false } })
					.exec(() => cbEach());
					return;
				}

				var newFeeds = [];

				var feedItems = {};

				for(var i = 0; i < doc.feeds.length; i++) {
					var feeds = doc.feeds[i];

					feeds.feed.items.forEach(item => {
						if (feeds.items.indexOf(item.id) == -1) {
							newFeeds.push(item);
						}
					});

					// Saved discord feeds is a different length than the RSS Feeds.
					if (feeds.items.length != feeds.feed.items.length || newFeeds.length != 0) {
						feedItems['feeds.' + i + '.items'] = feeds.feed.items.map(i => i.id);
					}
				}

				if (newFeeds.length != 0) {
					var guild = client.guilds.get(doc.guild_id);

					if (guild == null) {
						// Remove
						ModelDiscordFeed.find({ guild_id: doc.guild_id }, (err, feeds) => {
							var rssIds: string[] = [];

							feeds.map(f => f.feeds.map(f => f.feed))
							.forEach(f => rssIds = rssIds.concat(f));

							// TODO: Remove dupes

							ModelDiscordFeed.remove({ guild_id: doc.guild_id }).exec();
						});

						console.error('Guild doesn\'t exist anymore.')
						return;
					}
					
					var channel = <Discord.TextChannel>guild.channels.get(doc.channel_id);

					if (channel == null) {
						// Disable
						console.error('Channel doesn\'t exist anymore.');
						return;
					}				

					newFeeds.forEach(feed => {
						channel.send(util.compileFormat(doc.format == null ? ':newspaper:  **{title}**\n\n{link}' : doc.format, {
							title: feed.title,
							date: feed.date,
							author: feed.author,
							description: feed.description,
							link: feed.link,
							guid: feed.guid
							// tags: feed.tags
						}))
						.catch(e => console.error(e));
					});
				}
				
				if (Object.keys(feedItems).length != 0) {
					ModelDiscordFeed.updateOne({ _id: doc._id }, { $set: feedItems }).exec();
				}

				// console.log(feedItems);

				// console.log(JSON.stringify(doc, null, 4));

				cbEach();
			}, () => cbEvery());
		});
	});
}, 1000 * 60);

// Intervals
setInterval(() => {
	ModelIntervals.find({ active: true, nextCall: { $lt: Date.now() } })
	.then(items => {
		if (items.length == 0) return;

		console.log('Calling ' + items.length + ' intervals.');

		async.every(items, (item, cb) => {
			var guild = client.guilds.get(item['guild_id']);

			if (guild != null) {
				var channel = <Discord.TextChannel>guild.channels.get(item['channel_id']);

				if (channel != null) {
					// try {
						// if (item.events.onCall) {
						// 	var ret = Function(item.events.onCall)
						// 	.call({
						// 		message: item.message,
						// 		nextCall: item.nextCall,
						// 		send: (msg) => channel.send(msg)
						// 	});

						// 	if (ret === false) return;
						// } else {
							channel.send(item['message']);
						// }

						item['nextCall'] = Date.now() + (item['every'] * 1000);
						item.save();
						return cb();
					// } catch (error) {
					// 	console.error(error);
					// 	channel.send('Error with Interval ' + error);
					// 	cb();
					// }
				}
			}

			item['active'] = false;
			item.save();
			cb();
		});
	}, e => console.error(e));
}, 1000 * 60);

}