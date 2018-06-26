import mongoose = require('mongoose');

let Schema = mongoose.Schema;

const DiscordFeeds = new Schema({
	pid: String,

	feeds: [{ ref: 'rssfeeds', type: Schema.Types.ObjectId }]
});

export = mongoose.model('discord_feeds', DiscordFeeds);