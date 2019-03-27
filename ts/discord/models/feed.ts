import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

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


export = (<mongoose.Model<CustomDocs.discord.DiscordRss>>mongoose.model('discord_feeds', DiscordFeeds));