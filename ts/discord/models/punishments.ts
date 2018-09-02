import mongoose = require('mongoose');

let Schema = mongoose.Schema;

const Punishments = new Schema({
	server_id: String,

	member_id: String,

	punisher_id: String,

	type: Number, // warn, mute, tempmute, ban, tempban
	length: Number,

	reason: String,

	//
}, {
	timestamps: {
		createdAt: 'created_at',
		updatedAt: false
	}
});

export = mongoose.model('discord_punishments', Punishments);