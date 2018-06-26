import mongoose = require('mongoose');

let Schema = mongoose.Schema;

const Item = new Schema({
	title: String,
	description: String,
	date: Date,
	link: String,
	guid: String,
	author: String,
	generator: String,
	categories: [ String ]
});

const RSSFeeds = new Schema({
	xmlUrl: String,
	link: String,

	active: { type: Boolean, default: true },
	sending_to: { type: Number, default: 0 },

	items: [ Item ],

	last_called: { type: Date, default: Date.now }
});

export = mongoose.model('rssfeeds', RSSFeeds);