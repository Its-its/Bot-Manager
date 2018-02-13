import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let DiscordServer = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	bot_id: { type: Schema.Types.ObjectId, ref: 'bots' },
	server_id: String,
	key: String,

	removed: { type: Boolean, default: false },

	server: {
		region: String,
		permissions: Number,
		intervals: [{ type: Schema.Types.ObjectId, ref: 'discord_intervals' }],
		ranks: [],
		commands: [],
		phrases: [],
		roles: [],
		plugins: {},
		values: {},
		moderation: {
			blacklisted: [],
			whitelisted: [],
			ignoredChannels: [],
			ignoredUsers: [],
			disabledCommands: []
		}
	},

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});


DiscordServer.method('validateOptions', (opts) => {
	//
});


export = mongoose.model('discord_servers', DiscordServer);