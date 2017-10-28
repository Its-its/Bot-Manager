import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let DiscordServer = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	bot_id: { type: Schema.Types.ObjectId, ref: 'discord_bots' },
	
	server_id: String,
	
	server: {
		//
	},

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});


export = mongoose.model('discord_servers', DiscordServer);