import mongoose = require('mongoose');
import asy = require('async');

let Schema = mongoose.Schema;


let Bots = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	uid: String,

	app: {
		name: String,
		uid: String
	},

	displayName: String,
	is_active: { type: Boolean, default: false },

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

Bots.method('getApp', cb => {
	mongoose.model(appName(this.app.name))
	.findOne({ 'uid': this.app.uid }, (err, res) => cb(err, res));
});


function appName(name) {
	if (name == 'disc') return 'discord_servers';
	if (name == 'yt') return 'youtube_channels';
	if (name == 'ttv') return 'twitch_channels';
	return null;
}

export = mongoose.model('bots', Bots);