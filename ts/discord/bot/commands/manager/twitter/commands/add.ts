import Discord = require('discord.js');
import generate = require('nanoid/generate');

import utils = require('@discord/utils');

import { Server as DiscordServer } from '@discord/bot/GuildServer';
import DiscordTwitter = require('@discord/models/twitter');

import GlobalTwitterFeeds = require('@base/models/twitterfeed');

import intervalUtils = require('@base/rssgrabber/utils');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let urlOrName = params.join(' ');

	let { items, newFeed, feed } = await intervalUtils.addTwitterFeed(urlOrName);

	if (newFeed) {
		await DiscordTwitter.updateOne(
			{ guild_id: message.guild!.id, channel_id: message.channel.id },
			{
				$addToSet: {
					feeds: {
						format: null,
						active: true,
						items: items.map(i => i.id),
						feed: feed._id
					}
				},
				$setOnInsert: {
					last_check: new Date(),
					pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32),
					active: true,
					guild_id: message.guild!.id,
					channel_id: message.channel.id
				}
			},
			{ upsert: true }
		).exec();

		message.channel.send(utils.successMsg([['Twitter', 'Sucessfully added twitter user to the channel.']]));
	} else {
		let dFeeds = await DiscordTwitter.find({ guild_id: message.guild!.id });

		for(let f = 0; f < dFeeds.length; f++) {
			let dFeed = dFeeds[f];

			for(let i = 0; i < dFeed.feeds.length; i++) {
				let ffeed = dFeed.feeds[i];

				if (ffeed.feed.toString() == feed._id.toString()) {
					await message.channel.send(utils.infoMsg([['Twitter', 'Twitter handle is already being used in the discord!']]));
					return Promise.resolve();
				}
			}
		}

		await GlobalTwitterFeeds.updateOne({ _id: feed._id }, { $inc: { sending_to: 1 } }).exec();

		await DiscordTwitter.updateOne(
			{ guild_id: message.guild!.id, channel_id: message.channel.id },
			{
				$set: {
					active: true
				},
				$addToSet: {
					feeds: {
						format: null,
						active: true,
						items: items.map(i => i.id),
						feed: feed._id
					}
				}
			}
		).exec();

		message.channel.send(utils.successMsg([['Twitter', 'Sucessfully added twitter user to the channel.']]));

		return Promise.resolve();
	}
}

export {
	call
};