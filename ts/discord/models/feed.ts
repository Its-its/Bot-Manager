import mongoose = require('mongoose');

const Schema = mongoose.Schema;

const DiscordFeeds = new Schema({
	pid: String,

	active: { type: Boolean, default: true },

	guild_id: String,
	channel_id: String,

	last_check: Date,

	feeds: [
		{
			format: String,
			active: { type: Boolean, default: true },
			items: [ String ],
			feed: { ref: 'rssfeeds', type: Schema.Types.ObjectId }
		}
	]
});

interface FeedFix extends mongoose.Document {
	pid: string;
	active: boolean;
	guild_id: string;
	channel_id: string;
	last_check: Date;
	
	feeds: {
		format: string;
		active: boolean;
		items: string[];
		feed: any;
	}[];
}


const adsf: mongoose.Model<FeedFix> = mongoose.model('discord_feeds', DiscordFeeds);

export = adsf;