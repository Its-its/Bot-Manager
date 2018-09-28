import mongoose = require('mongoose');
import async = require('async');

import config = require('../config');

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


		async.everyLimit(feedDocs, 10, (doc, cbEvery) => {
			utils.getFeedItems(doc.url, null, (err, items) => {
				if (err != null) return console.error(err);

				var newItems = utils.articleItemsToDB(items);
				var oldIds = doc.items.map(i => i.id);

				var hasNew = false;

				for(var i = 0; i < newItems.length; i++) {
					var index = oldIds.indexOf(newItems[i].id);
					// TODO: Ensure correct.
					if (index == -1 && newItems[i].date >= doc.last_called.getTime() - (1000 * 60 * 60)/*Date.now() * TWO_DAYS*/) {
						hasNew = true;
						break;
					}
				}

				if (hasNew) doc.items = <any>newItems;

				doc.last_called = <any>Date.now();

				doc.save(() => cbEvery());
			});
		});
	});
}, 1000 * 60);