import { Document } from 'mongoose';


import request = require('request');

import FeedParser = require('feedparser');

import RSSFeeds = require('../../../../models/rssfeed');

function getFeedItems(url: string, cookies: any, cb: (err?: Error, items?: FeedParser.Item[]) => any) {
	const feedparser = new FeedParser({});
	const req = request.get(url);

	// if (cookies != null) {
	// 	var j = request.jar();

	// 	var cookie = request.cookie('');
	// 	j.setCookie(cookie, '');

	// 	req.jar(j);
	// }

	req.pipe(feedparser);

	var errored = false;

	var feedItems: FeedParser.Item[] = [];


	feedparser.on('error', (err) => {
		if (errored) return;
		errored = true;
		cb(err);
	});

	feedparser.on('readable', function() {
		var item: FeedParser.Item;
		while(item = this.read()) {
			feedItems.push(item);
		}
	});

	feedparser.on('end', () => {
		if (errored) return;

		cb(null, feedItems);
	});
}

function addNewFeed(url: string, cookies: any, title: string, cb: (err?: Error, feed?: Document) => any) {
	// Find db from url
	//   - Not found? Get items, Check again with one of the items xml urls (usually more proper) if not found, register as new.


	RSSFeeds.findOne({ $or: [ { xmlUrl: url }, { link: url } ] }, (err, feed: any) => {
		if (err != null) return cb(err);

		if (feed != null) {
			RSSFeeds.updateOne({ _id: feed.id }, { $set: { active: true }, $inc: { sending_to: 1 } }).exec();
			cb(null, feed);
		} else {
			getFeedItems(url, cookies, (err, items) => {
				if (err != null) return cb(err);

				var item = items[0];

				if (item != null) {
					if (item.meta != null && item.meta.xmlurl != null && item.meta.xmlurl.toLowerCase() != url.toLowerCase()) {
						// Check DB again for xmlurl this time.
						RSSFeeds.findOne({ xmlUrl: item.meta.xmlurl }, (err, feed: any) => {
							if (err != null) return cb(err);

							if (feed != null) {
								RSSFeeds.updateOne({ _id: feed.id }, { $set: { active: true }, $inc: { sending_to: 1 } }).exec();
								cb(null, feed);
							} else createFeed();
						});
					} else createFeed();
				} else cb(new Error('XML page didn\'t have any items on it.'));
				

				function createFeed() {
					new RSSFeeds({
						xmlUrl: item.meta.xmlurl,
						link: item.meta.link,
	
						sending_to: 1,
	
						items: items.map(i => {
							if (i.meta == null) (<any>i.meta) = {};
	
							return {
								title: i.title,
								description: i.description, // TODO
								date: i.date,
								link: i.link,
								guid: i.guid,
								author: i.author,
								generator: i.meta.generator,
								categories: i.meta.categories
							};
						})
					})
					.save((err, feed) => {
						if (err != null) return cb(err);
						cb(null, feed);
					});
				}

				// console.log(JSON.stringify(items[0], null, 2));
		
				// for(var i = 0; i < items.length; i++) {
				// 	console.log('ID: ' + getArticleId(items[i], items));
				// }
			}); 
		}
	});
}

function getArticleId(article: FeedParser.Item, articles: FeedParser.Item[]) {
	var equalGuids = (articles.length > 1);

	if (equalGuids && articles[0].guid) {
		for (var i = 1; i < articles.length; i++) {
			if (articles[i].guid !== articles[i - 1].guid) equalGuids = false;
		}
	}

	if ((!article.guid || equalGuids) && article.title) return article.title;
	if ((!article.guid || equalGuids) && !article.title && article.pubdate && article.pubdate.toString() !== 'Invalid Date') return article.pubdate;

	return article.guid;
}


export = {
	addNewFeed,

	getArticleId
};