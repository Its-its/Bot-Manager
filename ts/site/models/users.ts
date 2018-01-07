import mongoose = require('mongoose');

let Schema = mongoose.Schema;


let DiscordConnSchema = new Schema({
	verified: Boolean,
	visibility: Number,
	friend_sync: Boolean,
	type: String,
	id: String,
	name: String
});

let DiscordGuildSchema = new Schema({
	owner: Boolean,
	permissions: Number,
	icon: String,
	id: String,
	name: String
});

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
		token: String,
		name: String,
		avatar: String,
		mfa_enabled: Boolean,
		// provider: String,
		discriminator: String,
		connections: [ DiscordConnSchema ],
		guilds: [ DiscordGuildSchema ]
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

User.virtual('discord_bots', {
	ref: 'discord_bots',
	localField: '_id',
	foreignField: 'user_id'
});


export = mongoose.model('users', User);