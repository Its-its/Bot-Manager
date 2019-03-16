import Discord = require('discord.js');
import generate = require('nanoid/generate');

import utils = require('../../../../../utils');

import DiscordServer = require('../../../../GuildServer');
import DiscordRSSFeeds = require('../../../../../models/feed');

import GlobalRSSFeeds = require('../../../../../../models/rssfeed');

import intervalUtils = require('../../../../../../rssgrabber/utils');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var url = params.join(' ');

	intervalUtils.addNewFeed(url, null, null, (err, isNew, feedDoc, article) => {
		if (err != null) {
			message.channel.send(utils.errorMsg([['RSS Feed', err]]));
			console.error(err);
			return;
		}

		if (isNew) {
			DiscordRSSFeeds.updateOne(
				{ guild_id: message.guild.id, channel_id: message.channel.id },
				{
					$addToSet: {
						feeds: [
							{
								items: article.items.map(i => i.id),
								feed: feedDoc._id
							}
						]
					},
					$setOnInsert: {
						last_check: Date.now(),
						pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32),
						active: true,
						guild_id: message.guild.id,
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
			DiscordRSSFeeds.find({ guild_id: message.guild.id }, (err, dFeeds) => {
				if (err != null) {
					message.channel.send(utils.errorMsg([['RSS Feed', err]]));
					console.error(err);
					return;
				}

				for(var f = 0; f < dFeeds.length; f++) {
					var dFeed = dFeeds[f];

					for(var i = 0; i < dFeed.feeds.length; i++) {
						var feed = dFeed.feeds[i];

						if (feed.feed.toString() == feedDoc._id.toString()) {
							return message.channel.send(utils.infoMsg([['RSS Feed', 'RSS Feed url is already being used in the discord!']]));
						}
					}
				}


				GlobalRSSFeeds.updateOne({ _id: feedDoc._id }, { $inc: { sending_to: 1 } }).exec();
				DiscordRSSFeeds.updateOne(
					{ guild_id: message.guild.id, channel_id: message.channel.id },
					{
						$set: {
							active: true
						},
						$addToSet: {
							feeds: [
								{
									items: article.items.map(i => i.id),
									feed: feedDoc._id
								}
							]
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