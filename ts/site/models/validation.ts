import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Validation = new Schema({
	user_id: String,
	bot_id: String,
	listener_id: String
});


export = mongoose.model('validation', Validation);