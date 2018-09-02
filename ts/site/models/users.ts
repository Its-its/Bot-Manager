import mongoose = require('mongoose');

const Schema = mongoose.Schema;

const User = new Schema({
	is_active: Boolean,

	admin: { type: Boolean, default: false },

	bots: {
		amount: { type: Number, default: 0 },
		twitch_amount: { type: Number, default: 0 },
		youtube_amount: { type: Number, default: 0 },
		discord_amount: { type: Number, default: 0 }
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


// User.virtual('twitch_bots', {
// 	ref: 'twitch_bots',
// 	localField: '_id',
// 	foreignField: 'user_id'
// });


// User.virtual('youtube_bots', {
// 	ref: 'youtube_bots',
// 	localField: '_id',
// 	foreignField: 'user_id'
// });


export = mongoose.model('users', User);