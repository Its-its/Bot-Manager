import mongoose = require('mongoose');
import { CustomDocs } from '../../typings/manager';

let Schema = mongoose.Schema;

const Item = new Schema({
	id: String,
	title: String,
	description: String,
	date: Date,
	link: String,
	guid: String,
	author: String,
	generator: String,
	categories: [ String ]
}, { _id: false, id: false });

const RSSFeeds = new Schema({
	url: String,
	// cookies: String,

	xmlUrl: String,
	link: String,

	// active: { type: Boolean, default: true },
	sending_to: { type: Number, default: 0 },

	items: [ Item ],

	last_called: { type: Date, default: Date.now }
});

export = (<mongoose.Model<CustomDocs.global.RSSFeeds>>mongoose.model('rssfeeds', RSSFeeds));