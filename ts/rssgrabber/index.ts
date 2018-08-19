import mongoose = require('mongoose');
import async = require('async');

import config = require('../site/util/config');

import RSSFeed = require('../models/rssfeed');

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

const callAgain = 1000 * 60 * 10;

setInterval(() => {
	RSSFeed.find({ sending_to: { $gt: 0 }, last_called: { $lte: Date.now() - callAgain } }, (err, feedDocs) => {
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
			async.each(docs, (doc, cbEach) => {
				utils.getFeedItems(doc.url, null, (err, items) => {
					if (err != null) return console.error(err);
				
					var newItems = utils.articleItemsToDB(items);
					var oldIds = doc.items.map(i => i.id);

					var hasNew = false;

					for(var i = 0; i < newItems.length; i++) {
						var index = oldIds.indexOf(newItems[i].id);
						if (index == -1) {
							hasNew = true;
							break;
						}
					}

					if (hasNew) doc.items = <any>newItems;

					doc.last_called = <any>Date.now();

					doc.save(() => cbEach());
				});
			}, () => cbEvery());
		});
	});
}, 1000 * 60);