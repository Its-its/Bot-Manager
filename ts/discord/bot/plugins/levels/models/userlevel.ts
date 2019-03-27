import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

let Schema = mongoose.Schema;

const UserLevel = new Schema({
	server_id: String,
	member_id: String,

	xp: { type: Number, default: 0 },
	level: { type: Number, default: 0 }
});

export = (<mongoose.Model<CustomDocs.discord.UserLevel>>mongoose.model('discord_levels_user', UserLevel));