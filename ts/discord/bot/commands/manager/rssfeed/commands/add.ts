import Discord = require('discord.js');
import generate = require('nanoid/generate');

import utils = require('@discord/utils');

import { Server as DiscordServer } from '@discord/bot/GuildServer';
import DiscordRSSFeeds = require('@discord/models/feed');

import GlobalRSSFeeds = require('@base/models/rssfeed');

import intervalUtils = require('@base/rssgrabber/utils');

import PERMISSIONS = require('../perms');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.ADD)) return utils.noPermsMessage('RSS Feed');

	let url = params.join(' ');

	let { newFeed, feed, article } = await intervalUtils.addNewFeed(url, null);

	if (newFeed) {
		await DiscordRSSFeeds.updateOne(
			{ guild_id: message.guild!.id, channel_id: message.channel.id },
			{
				$addToSet: {
					feeds: {
						format: null,
						active: true,
						items: article.items.map(i => i.id),
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
			{ upsert: true },
		).exec();

		await message.channel.send(utils.successMsg([['RSS Feed', 'Sucessfully added rss feed to the channel.']]));
	} else {
		let dFeeds = await DiscordRSSFeeds.find({ guild_id: message.guild!.id });

		for(let f = 0; f < dFeeds.length; f++) {
			let dFeed = dFeeds[f];

			for(let i = 0; i < dFeed.feeds.length; i++) {
				let ffeed = dFeed.feeds[i];

				if (ffeed.feed.toString() == feed._id.toString()) {
					await message.channel.send(utils.infoMsg([['RSS Feed', 'RSS Feed url is already being used in the discord!']]));

					return Promise.resolve();
				}
			}
		}


		await GlobalRSSFeeds.updateOne({ _id: feed._id }, { $inc: { sending_to: 1 } }).exec();

		await DiscordRSSFeeds.updateOne(
			{ guild_id: message.guild!.id, channel_id: message.channel.id },
			{
				$set: {
					active: true
				},
				$addToSet: {
					feeds: {
						format: null,
						active: true,
						items: article.items.map(i => i.id),
						feed: feed._id
					}
				}
			}
		).exec();

		await message.channel.send(utils.successMsg([['RSS Feed', 'Sucessfully added rss feed to the channel.']]));
	}

	return Promise.resolve();
}

export {
	call
};