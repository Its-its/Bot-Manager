import * as mongoose from 'mongoose';


import ModelIntervals = require('../../models/intervals');
import async = require('async');

import Discord = require('discord.js');

import config = require('../../site/util/config');


(<any>mongoose).Promise = global.Promise;
mongoose.set('debug', true);
mongoose.connect(config.database);



let client = new Discord.Client({
	disabledEvents: [
		'READY',
		'RESUMED',
		// 'GUILD_SYNC',
		// 'GUILD_CREATE',
		// 'VOICE_SERVER_UPDATE',
		// 'VOICE_STATE_UPDATE',
		// 'CHANNEL_CREATE',
		// 'CHANNEL_DELETE',
		// 'CHANNEL_UPDATE',
		'MESSAGE_CREATE',
		// 'GUILD_DELETE',
		// 'GUILD_UPDATE',
		// 'GUILD_MEMBER_ADD',
		// 'GUILD_MEMBER_REMOVE',
		// 'GUILD_MEMBER_UPDATE',
		// 'GUILD_MEMBERS_CHUNK',
		// 'GUILD_ROLE_CREATE',
		// 'GUILD_ROLE_DELETE',
		// 'GUILD_ROLE_UPDATE',
		// 'GUILD_BAN_ADD',
		// 'GUILD_BAN_REMOVE',
		// 'CHANNEL_PINS_UPDATE',
		// 'MESSAGE_DELETE',
		// 'MESSAGE_UPDATE',
		// 'MESSAGE_DELETE_BULK',
		// 'MESSAGE_REACTION_ADD',
		// 'MESSAGE_REACTION_REMOVE',
		// 'MESSAGE_REACTION_REMOVE_ALL',
		// 'USER_UPDATE',
		// 'USER_NOTE_UPDATE',
		// 'USER_SETTINGS_UPDATE',
		// 'USER_GUILD_SETTINGS_UPDATE',
		// 'PRESENCE_UPDATE',
		// 'TYPING_START',
		// 'RELATIONSHIP_ADD',
		// 'RELATIONSHIP_REMOVE'
	]
});


client.login(config.bot.discord.token);

setInterval(() => {
	ModelIntervals.find({ active: true, nextCall: { $lt: Date.now() } })
	.then(items => {
		async.every(items, (item: any, cb) => {
			var guild = client.guilds.get(item.server_id);

			if (guild != null) {
				var channel = <Discord.TextChannel>guild.channels.get(item.channel_id);
				if (channel != null) {
					// try {
						// if (item.events.onCall) {
						// 	var ret = Function(item.events.onCall)
						// 	.call({
						// 		message: item.message,
						// 		nextCall: item.nextCall,
						// 		send: (msg) => channel.send(msg)
						// 	});

						// 	if (ret === false) return;
						// } else {
							channel.send(item.message);
						// }

						item.nextCall = Date.now() + (item.every * 1000);
						item.save();
						cb();
					// } catch (error) {
					// 	console.error(error);
					// 	channel.send('Error with Interval ' + error);
					// 	cb();
					// }
				} else {
					item.active = false;
					item.save();
					cb();
				}
			} else {
				item.active = false;
				item.save();
				cb();
			}
		});
	}, e => console.error(e))
	.catch(err => console.error(err));
}, 1000 * 60);