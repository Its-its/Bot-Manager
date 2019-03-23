import mongoose = require('mongoose');
import { CustomDocs } from '../../../typings/manager';

let Schema = mongoose.Schema;

let QueueItem = new Schema({
	addedBy: String,
	// type: String,
	id: String
}, { _id: false });


let Queue = new Schema({
	server_id: String,

	items: [ QueueItem ]
});

export = (<mongoose.Model<CustomDocs.music.Queue>>mongoose.model('music_queue', Queue));