import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let DiscordIntervals = new Schema({
	server_id: String,
	channel_id: String,

	displayName: String,
	message: String,
	active: Boolean,

	every: Number,
	nextCall: Number,

	events: {
		onCall: String
		// afterCall: String,
		// beforeCall: String
	},

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});


export = mongoose.model('discord_intervals', DiscordIntervals);