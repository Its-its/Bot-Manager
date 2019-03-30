import mongoose = require('mongoose');
import async = require('async');
import Twit = require('twit');

import config = require('@config');

import RSSFeed = require('../models/rssfeed');
import TwitterFeed = require('../models/twitterfeed');

import utils = require('./utils');

interface FeedFix extends mongoose.Document {
	url: string;
	xmlUrl: string;
	link: string;
	sending_to: number;
	items: {
		id: string;
		title: string;
		description: string;
		date: Date;
		link: string;
		guid: string;
		author: string;
		generator: string;
		categories: string[];
	}[];
	last_called: Date;
}

if (config.debug) mongoose.set('debug', true);
mongoose.Promise = global.Promise;
mongoose.connect(config.database, { useNewUrlParser: true });

const twitter = new Twit({
	consumer_key:         'dZwMAukw0gd1U3detHh38XvK8',
	consumer_secret:      'elh1y4iZoqUutXKA86HvfB1yX6xj6vqdAC8c9HBU6ryNxLrmVY',
	access_token:         '358512140-4r97ewMT0IUOETldmcsEBS3ew0vrPbhKbOBBqkGt',
	access_token_secret:  'sEk54lu8YyNtxz8IzI3lBLUXl2P4XeTQNig2JMoCOvNxm',
	timeout_ms:           60*1000,
	strictSSL:            true
});

const callAgain = 1000 * 60 * 10;

// Twitter
setInterval(() => {
	TwitterFeed.find({ sending_to: { $gt: 0 }, last_called: { $lte: Date.now() - callAgain } }, (err, feedDocs) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');


		async.everyLimit(feedDocs, 10, (doc, cbEvery) => {
			twitter.get(
				'statuses/user_timeline',
				{
					id: doc.user_id,
					count: 10,
					include_rts: true
				},
				// @ts-ignore
				function(err, data: Twit.Twitter.Status[]) {
					if (err != null) return console.error(err);

					var newItems = utils.twitterStatusesToDB(data);
					var oldIds = doc.items.map(i => i.id);

					var hasNew = false;

					for(var i = 0; i < newItems.length; i++) {
						var index = oldIds.indexOf(newItems[i].id);
						// TODO: Ensure correct.
						if (index == -1) {
							hasNew = true;
							break;
						}
					}

					console.log(doc.displayName + ': ' + hasNew);

					if (hasNew) doc.items = newItems;

					doc.last_called = new Date();

					doc.save(() => cbEvery());
				}
			);
		});
	});
}, 1000 * 60);

// RSS
setInterval(() => {
	RSSFeed.find({ sending_to: { $gt: 0 }, last_called: { $lte: Date.now() - callAgain } }, (err, feedDocs) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');


		async.everyLimit(feedDocs, 10, (doc, cbEvery) => {
			utils.getFeedItems(doc.url, null, (err, items) => {
				if (err != null || items == null) return console.error(err);

				var newItems = utils.articleItemsToDB(items);
				var oldIds = doc.items.map(i => i.id);

				var hasNew = false;

				for(var i = 0; i < newItems.length; i++) {
					var index = oldIds.indexOf(newItems[i].id);
					// TODO: Ensure correct.
					if (index == -1 && newItems[i].date.getTime() >= doc.last_called.getTime() - (1000 * 60 * 60)/*Date.now() * TWO_DAYS*/) {
						hasNew = true;
						break;
					}
				}

				if (hasNew) doc.items = newItems;

				doc.last_called = new Date();

				doc.save(() => cbEvery());
			});
		});
	});
}, 1000 * 60);