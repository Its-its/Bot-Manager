import Discord = require('discord.js');
import generate = require('nanoid/generate');

import utils = require('@discord/utils');

import DiscordServer = require('@discord/bot/GuildServer');
import DiscordRSSFeeds = require('@discord/models/feed');

import GlobalRSSFeeds = require('../../../../../../models/rssfeed');

import intervalUtils = require('../../../../../../rssgrabber/utils');

import PERMISSIONS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.ADD)) return utils.noPermsMessage('RSS Feed');

	let url = params.join(' ');

	intervalUtils.addNewFeed(url, null, null, (err, isNew, feedDoc, article) => {
		if (err != null) {
			message.channel.send(utils.errorMsg([['RSS Feed', err]]));
			console.error(err);
			return;
		}

		if (isNew) {
			DiscordRSSFeeds.updateOne(
				{ guild_id: message.guild!.id, channel_id: message.channel.id },
				{
					$addToSet: {
						feeds: {
							format: null,
							active: true,
							items: article!.items.map(i => i.id),
							feed: feedDoc!._id
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
				err => {
					if (err != null) {
						message.channel.send(utils.errorMsg([['RSS Feed', err]]));
						console.error(err);
						return;
					}

					message.channel.send(utils.successMsg([['RSS Feed', 'Sucessfully added rss feed to the channel.']]));
				}
			);
		} else {
			DiscordRSSFeeds.find({ guild_id: message.guild!.id }, (err, dFeeds) => {
				if (err != null) {
					message.channel.send(utils.errorMsg([['RSS Feed', err]]));
					console.error(err);
					return;
				}

				for(let f = 0; f < dFeeds.length; f++) {
					let dFeed = dFeeds[f];

					for(let i = 0; i < dFeed.feeds.length; i++) {
						let feed = dFeed.feeds[i];

						if (feed.feed.toString() == feedDoc!._id.toString()) {
							return message.channel.send(utils.infoMsg([['RSS Feed', 'RSS Feed url is already being used in the discord!']]));
						}
					}
				}


				GlobalRSSFeeds.updateOne({ _id: feedDoc!._id }, { $inc: { sending_to: 1 } }).exec();
				DiscordRSSFeeds.updateOne(
					{ guild_id: message.guild!.id, channel_id: message.channel.id },
					{
						$set: {
							active: true
						},
						$addToSet: {
							feeds: {
								format: null,
								active: true,
								items: article!.items.map(i => i.id),
								feed: feedDoc!._id
							}
						}
					},
					err => {
						if (err != null) {
							message.channel.send(utils.errorMsg([['RSS Feed', err]]));
							console.error(err);
							return;
						}

						message.channel.send(utils.successMsg([['RSS Feed', 'Sucessfully added rss feed to the channel.']]));
					}
				);
			});
		}
	});
}

export {
	call
};