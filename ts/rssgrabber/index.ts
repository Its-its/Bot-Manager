import mongoose = require('mongoose');
import async = require('async');
import Twit = require('twit');

import config = require('@config');

import RSSFeed = require('../models/rssfeed');
import TwitterFeed = require('../models/twitterfeed');

import utils = require('./utils');

const twitter = utils.twitter;

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
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true });

const callAgain = 1000 * 60 * 10;

// Twitter
setInterval(() => {
	TwitterFeed.find({ sending_to: { $gt: 0 }, last_called: { $lte: new Date(Date.now() - callAgain) } }, (err, feedDocs) => {
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

					let newItems = utils.twitterStatusesToDB(data);
					let oldIds = doc.items.map(i => i.id);

					let hasNew = false;

					for(let i = 0; i < newItems.length; i++) {
						let index = oldIds.indexOf(newItems[i].id);
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
	RSSFeed.find({ sending_to: { $gt: 0 }, last_called: { $lte: new Date(Date.now() - callAgain) } }, (err, feedDocs) => {
		if (err != null) return console.error(err);
		if (feedDocs.length == 0) return console.log('None.');


		async.everyLimit(feedDocs, 10, (doc, cbEvery) => {
			console.log('Getting Items: ' + doc.url);

			utils.getFeedItems(doc.url, null)
			.then(items => {
				let newItems = utils.articleItemsToDB(items);
				let oldIds = doc.items.map(i => i.id);

				console.log(doc.url + ' - ' + newItems.length + '/' + items.length);

				let hasNew = false;

				for(let i = 0; i < newItems.length; i++) {
					let index = oldIds.indexOf(newItems[i].id);
					// TODO: Ensure correct.
					if (index == -1 && newItems[i].date.getTime() >= doc.last_called.getTime() - (1000 * 60 * 60)/*Date.now() * TWO_DAYS*/) {
						hasNew = true;
						break;
					}
				}

				if (hasNew) doc.items = newItems;

				doc.last_called = new Date();

				doc.save(() => cbEvery());
			})
			.catch(err => console.error(err));
		});
	});
}, 1000 * 60);