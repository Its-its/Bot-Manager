import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Validation = new Schema({
	user_id: String,
	bot_id: String,
	listener_id: String,
	date_created: Date
});


export = mongoose.model('validation', Validation);