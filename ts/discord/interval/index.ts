import mongoose = require('mongoose');
import async = require('async');


import GlobalModelIntervals = require('../../models/intervals');
import GlobalModelRSSFeed = require('../../models/rssfeed');
import GlobalModelTwitterFeed = require('../../models/twitterfeed');


import DiscordModelFeed = require('../models/feed');
import DiscordModelTwitter = require('../models/twitter');

import Twit = require('twit');
import Discord = require('discord.js');

import config = require('../../config');

import util = require('../../rssgrabber/utils');

import client = require('../client');
import { CustomDocs } from '../../../typings/manager';

mongoose.Promise = global.Promise;
if (config.debug) mongoose.set('debug', true);
mongoose.connect(config.database, { useNewUrlParser: true });

var twitter = new Twit({
	consumer_key:         'dZwMAukw0gd1U3detHh38XvK8',
	consumer_secret:      'elh1y4iZoqUutXKA86HvfB1yX6xj6vqdAC8c9HBU6ryNxLrmVY',
	access_token:         '358512140-4r97ewMT0IUOETldmcsEBS3ew0vrPbhKbOBBqkGt',
	access_token_secret:  'sEk54lu8YyNtxz8IzI3lBLUXl2P4XeTQNig2JMoCOvNxm',
	timeout_ms:           60*1000,
	strictSSL:            true
});


client.options.disabledEvents = [
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
];


client.login(config.bot.discord.token);+

client.on('error', e => console.error(e));

client.on('guildDelete', guild => {
	DiscordModelFeed.find({ guild_id: guild.id }, (err, feeds) => {
		if (err) return console.error(err);
		if (feeds.length == 0) return;

		// TODO: dec GlobalModelRSSFeed.sending_to

		// GlobalModelRSSFeed.updateOne({  });
	});
	GlobalModelIntervals.remove({ guild_id: guild.id }).exec();
});

client.on('channelDelete', (channel: Discord.TextChannel) => {
	if (channel.type == 'text') {
		// If channel has RSSFeed deactivate it and set channel_id to null.
		DiscordModelFeed.findOneAndUpdate(
			{ guild_id: channel.guild.id, channel_id: channel.id },
			{ $set: { channel_id: null, active: false, 'feeds.items': [] } },
			(err, found) => {
				if (found != null) {
					GlobalModelRSSFeed.update({ _id: { $in: found['feeds'] } }, { $inc: { sending_to: -1 } }).exec();
				}
			}
		);

		//
	}
});

const CALL_AGAIN = 1000 * 60 * 5;



interface TwitterFeedItem {
	id: string;
	text: string;
	link: string;
}

interface TwitterFeed extends mongoose.Document {
	url: string;
	link: string;
	xmlUrl: string;

	sending_to: number;

	items: TwitterFeedItem[];

	last_called: Date;
}

interface ChannelTwitterFeedItem {
	format: string;
	active: boolean;
	items: string[];
	feed: TwitterFeed;
};

// Twitter Feeds
setInterval(() => {
	DiscordModelTwitter.find({ active: true, last_check: { $lte: Date.now() - CALL_AGAIN } })
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

			var newFeeds: {
				feed: CustomDocs.discord.DiscordTwitterFeeds<CustomDocs.global.TwitterFeeds>,
				item: TwitterFeedItem
			}[] = [];

			var feedItems = {};

			for(var i = 0; i < doc.feeds.length; i++) {
				var feeds = doc.feeds[i];

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
					// @ts-ignore
					feedItems['feeds.' + i + '.items'] = feeds.feed.items.map(i => i.id);
				}
			}

			if (newFeeds.length != 0) {
				var guild = client.guilds.get(doc.guild_id);

				if (guild == null) {
					// Remove
					DiscordModelTwitter.find({ guild_id: doc.guild_id }, (err, feeds) => {
						var rssIds: string[] = [];

						feeds.map(f => f.feeds.map(f => f.feed))
						.forEach(f => rssIds = rssIds.concat(f));

						// TODO: Remove dupes

						DiscordModelTwitter.remove({ guild_id: doc.guild_id }).exec();
					});

					console.error('Guild doesn\'t exist anymore.')
					return;
				}

				var channel = <Discord.TextChannel>guild.channels.get(doc.channel_id);

				if (channel == null) {
					// TODO: Disable
					console.error('Channel doesn\'t exist anymore.');
					return;
				}

				newFeeds.reverse().forEach(opts => {
					var { item, feed } = opts;
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



// RSS Feed

interface RSSFeedItem {
	id: string;
	title: string;
	description: string;
	date: Date;
	link: string;
	guid: string;
	author: string;
	generator: string;
	categories: string[];
};

interface RSSFeed extends mongoose.Document {
	url: string;
	link: string;
	xmlUrl: string;

	sending_to: number;

	items: RSSFeedItem[];

	last_called: Date;
}

interface ChannelRSSFeedItem {
	format: string;
	active: boolean;
	items: string[];
	feed: RSSFeed;
};

setInterval(() => {
	DiscordModelFeed.find({ active: true, last_check: { $lte: Date.now() - CALL_AGAIN } })
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

			var newFeeds: {
				feed: ChannelRSSFeedItem,
				item: RSSFeedItem
			}[] = [];

			var feedItems = {};

			for(var i = 0; i < doc.feeds.length; i++) {
				var feeds = doc.feeds[i];

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
					// @ts-ignore
					feedItems['feeds.' + i + '.items'] = feeds.feed.items.map(i => i.id);
				}
			}

			if (newFeeds.length != 0) {
				var guild = client.guilds.get(doc.guild_id);

				if (guild == null) {
					// Remove
					DiscordModelFeed.find({ guild_id: doc.guild_id }, (err, feeds) => {
						var rssIds: string[] = [];

						feeds.map(f => f.feeds.map(f => f.feed))
						.forEach(f => rssIds = rssIds.concat(f));

						// TODO: Remove dupes

						DiscordModelFeed.remove({ guild_id: doc.guild_id }).exec();
					});

					console.error('Guild doesn\'t exist anymore.')
					return;
				}

				var channel = <Discord.TextChannel>guild.channels.get(doc.channel_id);

				if (channel == null) {
					// TODO: Disable
					console.error('Channel doesn\'t exist anymore.');
					return;
				}

				newFeeds.reverse()
				.forEach(opts => {
					var { item, feed } = opts;
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
			var guild = client.guilds.get(item.guild_id);

			if (guild != null) {
				var channel = <Discord.TextChannel>guild.channels.get(item.channel_id);

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