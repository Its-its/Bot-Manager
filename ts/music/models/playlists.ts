import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Playlist = new Schema({
	creator: Schema.Types.ObjectId,
	creator_id: String,

	type: Number,
	visibility: Number,
	permissions: Number,

	public_id: String,
	plays: { type: Number, default: 0 },
	views: { type: Number, default: 0 },

	title: String,
	description: String,
	thumb: String,

	songs: [],
	song_count: { type: Number, default: 0 },

	// markedForDeletion: Boolean
}, {
	timestamps: {
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	}
});


interface MongooseDoc extends mongoose.Document {
	creator: string;

	type: number; // default, custom, generated
	visibility: number; // public, private, hidden
	permissions: number;

	public_id: string;
	plays: number;
	views: number;

	title: string;

	description: string;
	thumb: string;

	// markedForDeletion: boolean;

	songs: any[];
	song_count: number;

	created_at: Date;
	updated_at: Date;
}

let model: mongoose.Model<MongooseDoc> = mongoose.model('music_playlists', Playlist);

export = model;