import mongoose = require('mongoose');

let Schema = mongoose.Schema;

const Backup = new Schema({
	server_id: String,

	pid: String,

	items: [String],
	json: String,

	created_at: Date
});

export = mongoose.model('discord_backups', Backup);