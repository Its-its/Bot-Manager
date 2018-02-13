import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let Playlist = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },

	type: String, // default, custom, generated

	public_id: String,
	plays: Number,
	views: Number,

	title: String,
	description: String,
	thumb: String,

	deleting: Boolean
}, {
	timestamps: {
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	}
});


export = mongoose.model('music_playlists', Playlist);