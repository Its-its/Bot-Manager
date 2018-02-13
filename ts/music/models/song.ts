import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Song = new Schema({
	type: String,

	// Song Info
	uid: String,
	title: String,
	length: Number,
	uploaded: Date,
	thumb: String,

	// Song Channel
	uploader_id: String
});


export = mongoose.model('music_songs', Song);