import mongoose = require('mongoose');

let Schema = mongoose.Schema;

let PlaylistItem = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'users' },
	playlist: { type: Schema.Types.ObjectId, ref: 'music_playlists' },
	song: { type: Schema.Types.ObjectId, ref: 'music_song' },

	added: Date,
	plays: Number
});


export = mongoose.model('music_playlist_items', PlaylistItem);