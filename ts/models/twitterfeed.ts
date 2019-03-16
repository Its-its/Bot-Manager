import mongoose = require('mongoose');

let Schema = mongoose.Schema;

// should be the same as rssgrabber.utils.TwitterStatusesDB
const Item = new Schema({
	id: String,

	text: String,
	link: String
}, { _id: false, id: false });

const RSSFeeds = new Schema({
	user_id: String,

	displayName: String,
	screenName: String,

	// active: { type: Boolean, default: true },
	sending_to: { type: Number, default: 0 },

	last_called: { type: Date, default: Date.now },

	items: [ Item ]
});


interface FeedFix extends mongoose.Document {
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

const adsf: mongoose.Model<FeedFix> = mongoose.model('feeds_twitter', RSSFeeds);

export = adsf;