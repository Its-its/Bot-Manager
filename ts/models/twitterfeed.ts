import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

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


export = (<mongoose.Model<CustomDocs.global.TwitterFeeds>>mongoose.model('feeds_twitter', RSSFeeds));