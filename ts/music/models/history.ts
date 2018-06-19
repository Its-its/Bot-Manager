import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let History = new Schema({
	server_id: String,
	song_count: Number,
	songs: []
});


interface Song {
	played_at: number;
	song_id: string;
}

interface MongooseDoc extends mongoose.Document {
	server_id: String;

	songs: Song[];
	song_count: number;
}

let model: mongoose.Model<MongooseDoc> = mongoose.model('music_history', History);

export = model;