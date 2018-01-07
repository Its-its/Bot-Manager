import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let DiscordServer = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	bot_id: { type: Schema.Types.ObjectId, ref: 'bots' },

	removed: { type: Boolean, default: false },
	
	server_id: String,
	permissions: Number,
	
	server: {
		region: String,
		groups: [],
		members: [],
		channels: []
	},

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});


DiscordServer.method('validateOptions', (opts) => {
	//
});


export = mongoose.model('discord_servers', DiscordServer);