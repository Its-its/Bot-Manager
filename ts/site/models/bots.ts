import { CustomDocs } from '../../../typings/manager';


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

Bots.method('getBot', function(this: CustomDocs.web.BotsDocument, cb: (err?: Error, res?: any) => any) {
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


function appName(name: string): string {
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

function collectionToName(collection?: string): string {
	if (collection == 'discord_servers') return 'Discord';
	if (collection == 'youtube_channels') return 'Youtube';
	if (collection == 'twitch_channels') return 'Twitch';
	return 'Unknown';
}

interface Model extends mongoose.Model<CustomDocs.web.BotsDocument> {
	collectionToName: (collection: string) => string;
	appName: (bot: string) => string;
}

export = (<Model>mongoose.model('bots', Bots));