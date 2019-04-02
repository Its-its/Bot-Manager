import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

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

		token: String,
		refreshToken: String,
		tokenExpires: Number
	},

	created_at: { type: Date, default: Date.now }
});

User.virtual('bot_listeners', {
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


export = (<mongoose.Model<CustomDocs.web.UsersDocument>>mongoose.model('users', User));