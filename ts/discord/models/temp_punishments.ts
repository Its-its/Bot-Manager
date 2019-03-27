import mongoose = require('mongoose');
import { CustomDocs } from '@type-manager';

let Schema = mongoose.Schema;

const Punishments = new Schema({
	server_id: String,
	member_id: String,

	punishment: { ref: 'discord_punishments', type: Schema.Types.ObjectId },

	expires: Date
});

export = (<mongoose.Model<CustomDocs.discord.TempPunishments>>mongoose.model('discord_temp_punishments', Punishments));