import mongoose = require('mongoose');

let Schema = mongoose.Schema;


let Bots = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: 'users' },
	uid: String,

	botType: String,
	botId: Schema.Types.ObjectId,

	displayName: String,
	is_active: { type: Boolean, default: false },

	created_at: { type: Date, default: Date.now },
	edited_at: { type: Date, default: Date.now }
});

Bots.method('getBot', function(cb) {
	if (this.botType == null || this.botId == null)
		return cb(new Error('No App Exists.'), null);
	
	mongoose.connection.collection(this.botType)
	.findOne({ '_id': this.botId }, (err, res) => {
		if (res != null) res.type = collectionToName(this.botType).toLowerCase();
		cb(err, res);
	});
});

Bots.static('appName', appName);
Bots.static('collectionToName', collectionToName);


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

interface MongooseDoc extends mongoose.Document {
	getBot: (cb: (err, res: mongoose.Document) => any) => any;
	appName: (str: string) => string;

	user_id: string;
	uid: string;

	botType: string;
	botId: string;
	
	displayName: string;

	is_active: boolean;

	created_at: Date;
	edited_at: Date;
}

let model: mongoose.Model<MongooseDoc> = mongoose.model('bots', Bots);

export = model;