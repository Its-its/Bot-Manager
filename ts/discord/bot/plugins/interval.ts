import Discord = require('discord.js');
import { CustomDocs, DiscordBot } from '@type-manager';


import GlobalModelIntervals = require('../../../models/intervals');
import GlobalModelRSSFeed = require('../../../models/rssfeed');

import DiscordModelFeed = require('../../models/feed');




function onGuildDelete(guild: Discord.Guild) {
	DiscordModelFeed.find({ guild_id: guild.id }, (err, feeds) => {
		if (err) return console.error(err);
		if (feeds.length == 0) return;

		// TODO: dec GlobalModelRSSFeed.sending_to

		// GlobalModelRSSFeed.updateOne({  });
	});

	GlobalModelIntervals.remove({ guild_id: guild.id }).exec();
}

function onChannelDelete(channel: Discord.Channel) {
	if (channel.type == 'text') {
		// If channel has RSSFeed deactivate it and set channel_id to null.
		DiscordModelFeed.findOneAndUpdate(
			{ guild_id: (<Discord.TextChannel>channel).guild.id, channel_id: channel.id },
			{ $set: { active: false, 'feeds.items': [] }, $unset: { channel_id: 1 } },
			(err, found) => {
				if (found != null) {
					GlobalModelRSSFeed.update({ _id: { $in: found['feeds'] } }, { $inc: { sending_to: -1 } }).exec();
				}
			}
		);

		//
	}
}



function getAllFromGuild(id: string, cb: (err: any, items: CustomDocs.global.Intervals[]) => any) {
	GlobalModelIntervals.find({ $or: [ { _id: id }, { guild_id: id } ] }, (err, items) => cb(err, items));
}


function editInterval(guild_id: string, newObj: EditableInterval) {
	GlobalModelIntervals.findOneAndUpdate(
		{ $or: [ { _id: guild_id }, { guild_id: guild_id } ] },
		{ $set: newObj },
		err => err && console.error(err)
	);
}


function addInterval(params: DiscordBot.Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	var model = new GlobalModelIntervals(params);
	model.save(() => {});
	return model._id;
}


function removeInterval(id: string) {
	GlobalModelIntervals.remove({ $or: [ { _id: id }, { guild_id: id } ] }, () => {});
}


interface EditableInterval {
	pid?: string;

	guild_id?: string;
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
	getAllFromGuild,

	onGuildDelete,
	onChannelDelete
};