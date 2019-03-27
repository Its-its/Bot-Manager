import { CustomDocs } from '@type-manager';

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



export = (<mongoose.Model<CustomDocs.music.Playlists>>mongoose.model('music_playlists', Playlist));