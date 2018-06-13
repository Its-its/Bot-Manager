import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let User = new Schema({
	is_active: Boolean,

	bots: {
		amount: Number,
		twitch_amount: Number,
		youtube_amount: Number,
		discord_amount: Number
	},

	twitch: {
		id: String,
		token: String,
		email: String,
		name: String
	},

	youtube: {
		id: String,
		token: String,
		email: String,
		name: String
	},

	discord: {
		id: String,
		token: String
	},

	created_at: { type: Date, default: Date.now }
});

User.virtual('listeners', {
	ref: 'bots',
	localField: '_id',
	foreignField: 'user_id'
});


User.virtual('twitch_bots', {
	ref: 'twitch_bots',
	localField: '_id',
	foreignField: 'user_id'
});


User.virtual('youtube_bots', {
	ref: 'youtube_bots',
	localField: '_id',
	foreignField: 'user_id'
});


export = mongoose.model('users', User);