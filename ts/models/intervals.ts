import mongoose = require('mongoose');
import { CustomDocs } from '../../typings/manager';

let Schema = mongoose.Schema;

let DiscordIntervals = new Schema({
	guild_id: String,
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


export = (<mongoose.Model<CustomDocs.global.Intervals>>mongoose.model('discord_intervals', DiscordIntervals));