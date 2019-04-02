import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

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

const Member = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },

	did: String,
	name: String,
	avatar: String,
	locale: String,
	flags: Number,
	premium_type: Number,
	mfa_enabled: Boolean,
	// provider: String,
	discriminator: String,

	connections: [ { type: Schema.Types.Mixed } ],
	guilds: [ { type: Schema.Types.Mixed } ],

	updated_guilds_at: { type: Date, default: Date.now },

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

export = (<mongoose.Model<CustomDocs.discord.Member>>mongoose.model('discord_members', Member));