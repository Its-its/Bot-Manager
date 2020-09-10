import Discord = require('discord.js');
import { DiscordBot } from '@type-manager';


import GlobalModelIntervals = require('../../../models/intervals');
import GlobalModelRSSFeed = require('../../../models/rssfeed');

import DiscordModelFeed = require('../../models/feed');




async function onGuildDelete(guild: Discord.Guild) {
	let feeds = await DiscordModelFeed.find({ guild_id: guild.id }).exec();

	await GlobalModelIntervals.remove({ guild_id: guild.id }).exec();

	return Promise.resolve();
}

async function onChannelDelete(channel: Discord.Channel) {
	if (channel.type == 'text') {
		// If channel has RSSFeed deactivate it and set channel_id to null.
		let found = await DiscordModelFeed.findOneAndUpdate(
			{ guild_id: (<Discord.TextChannel>channel).guild.id, channel_id: channel.id },
			{ $set: { active: false, 'feeds.items': [] }, $unset: { channel_id: 1 } }
		).exec();

		if (found != null) {
			await GlobalModelRSSFeed.update({ _id: { $in: found['feeds'] } }, { $inc: { sending_to: -1 } }).exec();
		}

		//
	}

	return Promise.resolve();
}



async function getAllFromGuild(id: string) {
	return GlobalModelIntervals.find({ $or: [ { _id: id }, { guild_id: id } ] }).exec();
}


async function editInterval(guild_id: string, newObj: EditableInterval) {
	await GlobalModelIntervals.findOneAndUpdate(
		{ $or: [ { _id: guild_id }, { guild_id: guild_id } ] },
		{ $set: newObj }
	).exec();

	return Promise.resolve();
}


async function addInterval(params: DiscordBot.Interval) {
	if (params.active && params.nextCall == null && params.every != null) {
		params.nextCall = Date.now() * (params.every * 1000);
	}

	let model = new GlobalModelIntervals(params);

	await model.save();

	return model._id;
}


async function removeInterval(id: string) {
	await GlobalModelIntervals.remove({ $or: [ { _id: id }, { guild_id: id } ] }).exec();
	return Promise.resolve();
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