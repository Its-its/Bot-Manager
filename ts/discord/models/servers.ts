import mongoose = require('mongoose');

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

	server: {
		region: String,
		name: String,
		iconURL: String,
		createdAt: Number,
		memberCount: Number,
		ownerID: String,

		commandPrefix: String,

		aliasList: [],

		permissions: {},
		intervals: [{ type: Schema.Types.ObjectId, ref: 'discord_intervals' }],
		ranks: [],
		roles: [],
		plugins: {},
		values: {},
		moderation: {
			blacklisted: [],
			whitelisted: [],
			ignoredChannels: [],
			ignoredUsers: [],
			disabledDefaultCommands: [],
			disabledCustomCommands: []
		},


		// Added by populate()
		commands: [],
		phrases: []
	},

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

interface MongooseDoc extends mongoose.Document {
	user_id: string;
	bot_id: string;

	server_id: string;
	key: string;

	removed: boolean;

	command_ids: string[];
	interval_ids: string[];
	phrase_ids: string[];

	server: {
		version: number;

		region: string;
		name: string;
		iconURL: string;
		createdAt: string;
		memberCount: string;
		ownerID: string;

		commandPrefix: string;

		aliasList: any[];

		permissions: {};
		intervals: string[];
		ranks: any[];

		commands?: any[];
		phrases?: any[];

		plugins: {};
		values: {};

		moderation: DiscordBot.Moderation;
	}

	created_at: Date;
	edited_at: Date;
}

let model: mongoose.Model<MongooseDoc> = mongoose.model('discord_servers', DiscordServer);

export = model;