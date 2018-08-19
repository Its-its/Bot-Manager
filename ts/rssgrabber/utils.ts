import { Document } from 'mongoose';

import crypto = require('crypto');
import request = require('request');
import FeedParser = require('feedparser');

import RSSFeeds = require('../models/rssfeed');

import cheerio = require('cheerio');


interface ArticleDB {
	url: string;
    xmlUrl: string;
    link: string;
    sending_to: number;
    items: ArticleItemDB[];
};

interface ArticleItemDB {
	id: string;
	title: string;
	description: any;
	date: number;
	link: string;
	guid: string;
	author: string;
	generator: string;
	categories: string[];
};


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

function addNewFeed(url: string, cookies: any, title: string, cb: (err?: Error, newFeed?: boolean, feed?: Document, article?: ArticleDB) => any) {
	// Find db from url
	//   - Not found? Get items, Check again with one of the items xml urls (usually more proper) if not found, register as new.


	RSSFeeds.findOne({ $or: [ { xmlUrl: url }, { link: url } ] }, (err, feed) => {
		if (err != null) return cb(err);

		if (feed != null) {
			RSSFeeds.updateOne({ _id: feed['id'] }, { $set: { active: true }, $inc: { sending_to: 1 } }).exec();
			cb(null, false, feed);
		} else {
			getFeedItems(url, cookies, (err, items) => {
				if (err != null) return cb(err);

				var fItem = items[0];

				if (fItem != null) {
					if (fItem.meta != null && fItem.meta.xmlurl != null && fItem.meta.xmlurl.toLowerCase() != url.toLowerCase()) {
						// Check DB again for xmlurl this time.
						RSSFeeds.findOne({ xmlUrl: fItem.meta.xmlurl }, (err, feed) => {
							if (err != null) return cb(err);

							if (feed != null) {
								RSSFeeds.updateOne({ _id: feed['id'] }, { $set: { active: true }, $inc: { sending_to: 1 } }).exec();
								cb(null, false, feed);
							} else createFeed();
						});
					} else createFeed();
				} else cb(new Error('XML page didn\'t have any items on it.'));
				

				function createFeed() {
					var articles = articlesToDB(url, items);

					new RSSFeeds(articles)
					.save((err, feed) => {
						if (err != null) return cb(err);
						cb(null, true, feed, articles);
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

function articlesToDB(url: string, items: FeedParser.Item[]): ArticleDB {
	var fItem = items[0];

	return {
		url: url,
		xmlUrl: fItem.meta.xmlurl,
		link: fItem.meta.link,

		sending_to: 1,

		items: articleItemsToDB(items)
	};
}

function articleItemsToDB(items: FeedParser.Item[]): ArticleItemDB[] {
	return items.map(i => {
		if (i.meta == null) (<any>i.meta) = {};

		return {
			id: crypto.createHash('md5').update(getArticleId(i, items)).digest('hex'),
			title: i.title,
			description: cheerio.load(i.description).root().text(), // TODO: HTML -> String
			date: i.date.getTime(),
			link: i.link,
			guid: i.guid,
			author: i.author,
			generator: i.meta.generator,
			categories: i.meta.categories
		};
	});
}

function getArticleId(article: FeedParser.Item, articles: FeedParser.Item[]) {
	var equalGuids = (articles.length != 1);

	if (equalGuids && articles[0].guid) {
		for (var i = 1; i < articles.length; i++) {
			if (articles[i].guid !== articles[i - 1].guid) equalGuids = false;
		}
	}

	if (!article.guid || equalGuids) {
		if (article.title != null) return article.title;
		if (!article.title && article.pubdate && article.pubdate.toString() !== 'Invalid Date') {
			return article.pubdate.toISOString();
		}
	}

	return article.guid;
}

function returnArticlesAfter(last_item_id: string, savedArticles: ArticleItemDB[]): ArticleItemDB[] {
	if (last_item_id == null) return savedArticles;

	var articles: ArticleItemDB[] = [];

	for(var i = 0; i < savedArticles.length; i++) {
		var article = savedArticles[i];
		if (article.id == last_item_id) break;
		articles.push(article);
	}

	return articles;
}


interface FormatOpts {
	date: Date | number;
	title: string;
	author: string;
	// summary: string;
	link: string;
	description: string;
	// tags: string;
	guid: string;
}


function compileFormat(format: string, opts: FormatOpts) {
	return format.replace(/{date}/gi, typeof opts.date == 'number' ? '' : '')
		.replace(/{title}/gi, opts.title)
		.replace(/{author}/gi, opts.author)
		// .replace(/{summary}/gi, opts.summary)
		// .replace(/{subscriptions}/gi, opts.subscriptions)
		.replace(/{link}/gi, opts.link)
		.replace(/{description}/gi, opts.description)
		// .replace(/{tags}/gi, opts.tags)
		.replace(/{guid}/gi, opts.guid)
}


export = {
	returnArticlesAfter,
	articleItemsToDB,
	articlesToDB,
	addNewFeed,
	getFeedItems,
	getArticleId,
	compileFormat
};