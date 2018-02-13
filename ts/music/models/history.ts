import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let History = new Schema({
	played_at: Date,
	server_id: String,
	song: { type: Schema.Types.ObjectId, ref: 'music_songs' }
});


export = mongoose.model('music_history', History);