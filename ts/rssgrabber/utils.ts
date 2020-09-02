import { Document } from 'mongoose';

import crypto = require('crypto');
import Twit = require('twit');

import request = require('request');
import FeedParser = require('feedparser');

import RSSFeeds = require('../models/rssfeed');
import TwitterFeeds = require('../models/twitterfeed');

import cheerio = require('cheerio');

import { URL } from 'url';
import { CustomDocs } from '@type-manager';

const DEFAULT_RSS_FORMAT = ':newspaper:  **{title}**\n\n{link}';
const DEFAULT_TWITTER_FORMAT = ':bird:  **{text}**\n\n{link}';



// TWITTER

const twitter = new Twit({
	consumer_key:         'dZwMAukw0gd1U3detHh38XvK8',
	consumer_secret:      'elh1y4iZoqUutXKA86HvfB1yX6xj6vqdAC8c9HBU6ryNxLrmVY',
	access_token:         '358512140-4r97ewMT0IUOETldmcsEBS3ew0vrPbhKbOBBqkGt',
	access_token_secret:  'sEk54lu8YyNtxz8IzI3lBLUXl2P4XeTQNig2JMoCOvNxm',
	timeout_ms:           60 * 1000,
	strictSSL:            true
});

interface TwitterFeedFix extends Document {
	user_id: string;

	displayName: string;
	screenName: string;

	sending_to: number;

	last_called: Date;

	items: {
		id: string;

		text: string;
		link: string;
	}[];
}

function addTwitterFeed(urlOrScreenName: string, cb: (err?: string, newFeed?: boolean, feed?: TwitterFeedFix, items?: TwitterStatusesDB[]) => any) {
	var urlRegex = new RegExp('twitter.com/(\\w+)', 'i');

	if (urlRegex.test(urlOrScreenName)) {
		var exec = urlRegex.exec(urlOrScreenName);
		if (exec != null) urlOrScreenName = exec[1];
	}

	// @ts-ignore
	twitter.get('users/lookup', { screen_name: urlOrScreenName }, (err, res: Twit.Twitter.User[]) => {
		if (err != null) return cb(err.toString());

		if (res.length == 0) return cb("User cannot be found!");

		const user = res[0];

		TwitterFeeds.findOne({ user_id: user.id_str }, (err, feed) => {
			if (err != null) return cb(err);

			// @ts-ignore
			twitter.get('statuses/user_timeline', { id: user.id_str, count: 10, include_rts: true }, (err, statuses: Twit.Twitter.Status[]) => {
				if (err != null) return cb(err.toString());

				var feedItems = twitterStatusesToDB(statuses);

				// Exists already? Return with statuses
				if (feed != null) return cb(undefined, false, feed, feedItems);

				new TwitterFeeds({
					user_id: user.id_str,
					screenName: user.screen_name,
					displayName: user.name,

					sending_to: 1,

					items: feedItems
				})
				.save((err, feed) => {
					if (err != null) return cb(err);
					cb(undefined, true, feed, feedItems);
				});
			});
		});
	});
}


interface TwitterStatusesDB {
	id: string;
	text: string;
	link: string;
}

function twitterStatusesToDB(items: Twit.Twitter.Status[]): TwitterStatusesDB[] {
	return items.map(i => {
		return {
			id: i.id_str,
			text: '' + (i.full_text || i.text),
			link: `https://twitter.com/${i.user.screen_name}/status/${i.id_str}`
		};
	});
}


// RSS

interface ArticleDB {
	url: string;
    xmlUrl: string;
    link: string;
    sending_to: number;
    items: CustomDocs.global.RSSFeedsItem[];
};

interface RSSFeedFix extends Document {
	url: string;
	link: string;
	xmlUrl: string;

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

function getFeedItems(url: string, cookies: any, cb: (err?: Error, items?: FeedParser.Item[]) => any) {
	var cbCalled = false;

	function callback(err?: Error, items?: FeedParser.Item[]) {
		if (cbCalled) return;
		cbCalled = true;

		cb(err, items);
	}

	const feedparser = new FeedParser({});

	const req = request.get(url, { strictSSL: false });

	req.on('error', err => {
		callback(err);
	});

	// if (cookies != null) {
	// 	var j = request.jar();

	// 	var cookie = request.cookie('');
	// 	j.setCookie(cookie, '');

	// 	req.jar(j);
	// }

	req.pipe(feedparser);


	var feedItems: FeedParser.Item[] = [];


	feedparser.on('error', (err: any) => {
		callback(err);
	});

	feedparser.on('readable', function(this: FeedParser) {
		var item: FeedParser.Item;
		while(item = this.read()) {
			feedItems.push(item);
		}
	});

	feedparser.on('end', () => {
		callback(undefined, feedItems);
	});
}


function addNewFeed(uri: string, cookies: any, title: string | null, cb: (err?: string, newFeed?: boolean, feed?: RSSFeedFix, article?: ArticleDB) => any) {
	// Find db from url
	//   - Not found? Get items, Check again with one of the items xml urls (usually more proper) if not found, register as new.

	if (!uri.startsWith('http')) uri = 'http://' + uri;

	try {
		new URL(uri);
	} catch(e) {
		return cb('Invalid URL.');
	}

	// TODO: Check if links are the same (https/http) | I believe I did it partially.

	RSSFeeds.findOne({ $or: [ { xmlUrl: uri }, { link: uri } ] }, (err, feed) => {
		if (err != null) return cb(err);

		getFeedItems(uri, cookies, (err, items) => {
			if (err != null || items == null) return cb('An error occured while trying to grab Feed Items.');

			// Feed already exist? No need to continue and create it.
			if (feed != null) return cb(undefined, false, feed, articlesToDB(uri, items));


			var fItem = items[0];

			if (fItem == null) return cb('XML page didn\'t have any items on it.');

			if (fItem.meta != null && fItem.meta.xmlurl != null && fItem.meta.xmlurl.toLowerCase() != uri.toLowerCase()) {
				uri = fItem.meta.xmlurl;

				if (fItem.meta.link == null || fItem.meta.link.length == 0) {
					fItem.meta.link = fItem.meta.xmlurl;
				}

				// Check DB again for xmlurl this time.
				RSSFeeds.findOne({ $or: [ { xmlUrl: uri }, { link: fItem.meta.link.replace(/https?:\/\//i, '') } ] }, (err, feed) => {
					if (err != null) return cb('Error contacting DB. Please try again in a minute.');

					if (feed != null) cb(undefined, false, feed);
					else createFeed();
				});
			} else createFeed();


			function createFeed() {
				var articles = articlesToDB(uri, <FeedParser.Item[]>items);

				new RSSFeeds(articles)
				.save((err, feed) => {
					if (err != null) return cb(err);
					cb(undefined, true, feed, articles);
				});
			}

			// console.log(JSON.stringify(items[0], null, 2));

			// for(var i = 0; i < items.length; i++) {
			// 	console.log('ID: ' + getArticleId(items[i], items));
			// }
		});
	});
}

function articlesToDB(url: string, items: FeedParser.Item[]): ArticleDB {
	var fItem = items[0];

	if (fItem.meta.link == null || fItem.meta.link.length == 0) {
		fItem.meta.link = fItem.meta.xmlurl;
	}

	return {
		url: url,
		xmlUrl: fItem.meta.xmlurl,
		link: fItem.meta.link.replace(/https?:\/\//i, ''),

		sending_to: 1,

		items: articleItemsToDB(items)
	};
}

function articleItemsToDB(items: FeedParser.Item[]): CustomDocs.global.RSSFeedsItem[] {
	return items.map(i => {
		if (i.meta == null) (<any>i.meta) = {};

		return {
			id: crypto.createHash('md5').update(getArticleId(i, items)).digest('hex'),
			title: i.title,
			description: cheerio.load(i.description).root().text(), // TODO: HTML -> String
			date: i.date == null ? new Date(0) : i.date,
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

function returnArticlesAfter(last_item_id: string, savedArticles: CustomDocs.global.RSSFeedsItem[]): CustomDocs.global.RSSFeedsItem[] {
	if (last_item_id == null) return savedArticles;

	var articles: CustomDocs.global.RSSFeedsItem[] = [];

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

type Obj = { [name: string]: string };

function compileFormat(format: string, opts: Obj) {
	for (const key in opts) {
		format = format.replace(new RegExp(`{${key}}`, 'gi'), opts[key]);
	}

	return format;
}


export = {
	DEFAULT_RSS_FORMAT,
	DEFAULT_TWITTER_FORMAT,
	returnArticlesAfter,
	articleItemsToDB,
	articlesToDB,
	addNewFeed,
	getFeedItems,
	getArticleId,
	compileFormat,

	addTwitterFeed,
	twitterStatusesToDB
};