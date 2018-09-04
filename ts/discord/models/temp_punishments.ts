import mongoose = require('mongoose');

let Schema = mongoose.Schema;

const Punishments = new Schema({
	server_id: String,
	member_id: String,

	punishment: { ref: 'discord_punishments', type: Schema.Types.ObjectId },

	expires: Date
});

export = mongoose.model('discord_temp_punishments', Punishments);