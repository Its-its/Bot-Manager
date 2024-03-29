import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

let Schema = mongoose.Schema;

const Backup = new Schema({
	version: { type: Number, default: 0 },

	server_id: String,

	pid: String,

	items: [String],
	json: String,

	created_at: Date
});

export = (<mongoose.Model<CustomDocs.discord.Backup>>mongoose.model('discord_backups', Backup));