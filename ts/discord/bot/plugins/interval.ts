import Discord = require('discord.js');
import { CustomDocs } from '@type-manager';


import async = require('async');

import client = require('../../client');
import util = require('../../../rssgrabber/utils');

import GlobalModelIntervals = require('../../../models/intervals');
import GlobalModelRSSFeed = require('../../../models/rssfeed');

import DiscordModelFeed = require('../../models/feed');
import DiscordModelTwitter = require('../../models/twitter');



const CALL_EVERY = 1000 * 60 * 5;


function onGuildDelete(guild: Discord.Guild) {
	DiscordModelFeed.find({ guild_id: guild.id }, (err, feeds) => {
		if (err) return console.error(err);
		if (feeds.length == 0) return;

		// TODO: dec GlobalModelRSSFeed.sending_to

		// GlobalModelRSSFeed.updateOne({  });
	});

	GlobalModelIntervals.remove({ guild_id: guild.id }).exec();
}

function onChannelDelete(channel: Discord.Channel) {
	if (channel.type == 'text') {
		// If channel has RSSFeed deactivate it and set channel_id to null.
		DiscordModelFeed.findOneAndUpdate(
			{ guild_id: (<Discord.TextChannel>channel).guild.id, channel_id: channel.id },
			{ $set: { channel_id: null, active: false, 'feeds.items': [] } },
			(err, found) => {
				if (found != null) {
					GlobalModelRSSFeed.update({ _id: { $in: found['feeds'] } }, { $inc: { sending_to: -1 } }).exec();
				}
			}
		);

		//
	}
}


// Twitter Feeds
setInterval(() => {
	DiscordModelTwitter.find({ active: true, last_check: { $lte: Date.now() - CALL_EVERY } })
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
				item: CustomDocs.global.TwitterFeedsItem
			}[] = [];

			var feedItems: { [name: string]: any } = {};

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



// RSS Feeds
setInterval(() => {
	DiscordModelFeed.find({ active: true, last_check: { $lte: Date.now() - CALL_EVERY } })
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
				feed: CustomDocs.discord.DiscordRssFeeds<CustomDocs.global.RSSFeeds>,
				item: CustomDocs.global.RSSFeedsItem
			}[] = [];

			var feedItems: { [name: string]: any } = {};

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


function getAllFromGuild(id: string, cb: (err: any, items: CustomDocs.global.Intervals[]) => any) {
	GlobalModelIntervals.find({ $or: [ { _id: id }, { guild_id: id } ] }, (err, items) => cb(err, items));
}


function editInterval(guild_id: string, newObj: Interval) {
	GlobalModelIntervals.findOneAndUpdate(
		{ $or: [ { _id: guild_id }, { guild_id: guild_id } ] },
		{ $set: newObj },
		err => err && console.error(err)
	);
}


function addInterval(params: Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	var model = new GlobalModelIntervals(params);
	model.save(() => {});
	return model._id;
}


function removeInterval(id: string) {
	GlobalModelIntervals.remove({ $or: [ { _id: id }, { guild_id: id } ] }, () => {});
}


interface Interval {
	_id?: string;

	pid?: string;

	guild_id?: string;
	channel_id?: string;

	displayName?: string;
	message?: string;
	active?: boolean;

	every?: number;
	nextCall?: number; // Only exists if it's active.

	events?: {
		onCall?: string;
		onReset?: string;
	};
}

export = {
	addInterval,
	editInterval,
	removeInterval,
	getAllFromGuild,

	onGuildDelete,
	onChannelDelete
};