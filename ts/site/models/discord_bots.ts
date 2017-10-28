import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let DiscordBot = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	server_id: { type: Schema.Types.ObjectId, ref: 'discord_servers' },

	
	name: String,

	is_active: { type: Boolean, default: false },
	is_registered: { type: Boolean, default: false },

	invitee_id: String,
	confirmation_id: String,

	custom_token: { type: Boolean, default: false },
	token: String,


	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});


DiscordBot.virtual('is_disconnected').get(() => false);


export = mongoose.model('discord_bots', DiscordBot);