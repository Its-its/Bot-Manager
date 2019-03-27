import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

let Schema = mongoose.Schema;

let DiscordServer = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	bot_id: { type: Schema.Types.ObjectId, ref: 'bots' },

	server_id: String,
	key: String,

	removed: { type: Boolean, default: false },

	command_ids: [{ type: Schema.Types.ObjectId, ref: 'commands' }],
	phrase_ids: [{ type: Schema.Types.ObjectId, ref: 'phrases' }],
	interval_ids: [{ type: Schema.Types.ObjectId, ref: 'discord_intervals' }],

	// TODO: Change to string.
	server: Schema.Types.Mixed,

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

export = (<mongoose.Model<CustomDocs.discord.ServersDocument>>mongoose.model('discord_servers', DiscordServer));