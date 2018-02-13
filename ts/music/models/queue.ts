import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let QueueItem = new Schema({
	addedBy: String,
	song: { type: Schema.Types.ObjectId, ref: 'music_songs' }
}, { _id: false });


let Queue = new Schema({
	server_id: String,
	
	items: [ QueueItem ]
});

export = mongoose.model('music_queue', Queue);