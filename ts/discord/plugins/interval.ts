import ModelIntervals = require('../models/interval');
import discordClient = require('../index');
import async = require('async');

import Discord = require('discord.js');

setInterval(() => {
	ModelIntervals.find({ active: true, nextCall: { $lt: Date.now() } })
	.then(items => {
		async.every(items, (item: any, cb) => {
			var guild = discordClient.client.guilds.get(item.server_id);

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


function getAllFromGuild(id: string, cb: (err, items) => any) {
	ModelIntervals.find({ server_id: id }, (err, items) => cb(err, items));
}

function editInterval(server_id: string, newObj: Interval) {
	ModelIntervals.findOneAndUpdate({ _id: server_id }, { $set: newObj }, err => err && console.error(err));
}

function addInterval(params: Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	var model = new ModelIntervals(params);
	model.save((err, item) => {});
	return model._id;
}

function removeInterval(id: string) {
	ModelIntervals.remove({ _id: id }, () => {});
}


interface Interval {
	_id?: string;

	server_id?: string;
	channel_id?: string;

	displayName?: string;
	message?: string;
	active?: boolean;

	every?: number;
	nextCall?: number; // Only exists if it's active.

	events?: {
		onCall?: string;
		onReset?: string;
	};
}

export = {
	addInterval,
	editInterval,
	removeInterval,
	getAllFromGuild
};