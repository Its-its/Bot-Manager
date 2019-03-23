import mongoose = require('mongoose');
import { CustomDocs } from '../../../typings/manager';

let Schema = mongoose.Schema;

const Punishments = new Schema({
	server_id: String,
	member_id: String,
	creator_id: String,

	pid: String,

	type: String, // warn, mute, tempmute, ban, tempban
	length: Number,

	reason: String,

	expires: Date
}, {
	timestamps: {
		createdAt: 'created_at',
		updatedAt: false
	}
});

export = (<mongoose.Model<CustomDocs.discord.Punishments>>mongoose.model('discord_punishments', Punishments));