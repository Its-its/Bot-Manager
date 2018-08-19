import mongoose = require('mongoose');

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

const adsf: mongoose.Model<FeedFix> = mongoose.model('rssfeeds', RSSFeeds);

export = adsf;