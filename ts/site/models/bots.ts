import mongoose = require('mongoose');

let Schema = mongoose.Schema;


let Bots = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	uid: String,

	app: {
		name: String,
		id: Schema.Types.ObjectId
	},

	displayName: String,
	is_active: { type: Boolean, default: false },

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

Bots.method('setApp', (name: string, uid: string) => {
	//
})

Bots.method('getApp', function(cb) {
	if (this.app == null || this.app.name == null || this.app.id == null)
		return cb(new Error('No App Exists.'), null);
	
	mongoose.connection.collection(this.app.name)
	.findOne({ '_id': this.app.id }, (err, res) => {
		if (res != null)
			res.type = collectionToName(this.app.name).toLowerCase();
		cb(err, res);
	});
});

Bots.static('appName', appName);


function appName(name: string) {
	switch (name) {
		case 'disc':
		case 'discord':
			return 'discord_servers';
		case 'yt':
		case 'youtube':
			return 'youtube_channels';
		case 'ttv':
		case 'twitch':
		case 'twitchtv':
			return 'twitch_channels';
	}
	throw new Error('Unknown APP Name: ' + name);
}

function collectionToName(collection: string) {
	if (collection == 'discord_servers') return 'Discord';
	if (collection == 'youtube_channels') return 'Youtube';
	if (collection == 'twitch_channels') return 'Twitch';
	return 'Unknown';
}

export = mongoose.model('bots', Bots);