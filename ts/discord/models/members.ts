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

let Member = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },

	did: String,
	name: String,
	avatar: String,
	mfa_enabled: Boolean,
	// provider: String,
	discriminator: String,

	connections: [ { type: Schema.Types.Mixed } ],
	guilds: [ { type: Schema.Types.Mixed } ],

	created_at: Date
});

export = mongoose.model('discord_members', Member);