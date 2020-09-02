import Discord = require('discord.js');
import generate = require('nanoid/generate');

import utils = require('@discord/utils');

import DiscordServer = require('@discord/bot/GuildServer');
import DiscordTwitter = require('@discord/models/twitter');

import GlobalTwitterFeeds = require('../../../../../../models/twitterfeed');

import intervalUtils = require('../../../../../../rssgrabber/utils');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var urlOrName = params.join(' ');

	intervalUtils.addTwitterFeed(urlOrName, (err, isNew, feedDoc, statues) => {
		if (err != null) {
			message.channel.send(utils.errorMsg([['Twitter', err]]));
			console.error(err);
			return;
		}

		if (isNew) {
			DiscordTwitter.updateOne(
				{ guild_id: message.guild.id, channel_id: message.channel.id },
				{
					$addToSet: {
						feeds: {
							format: null,
							active: true,
							items: statues!.map(i => i.id),
							feed: feedDoc!._id
						}
					},
					$setOnInsert: {
						last_check: new Date(),
						pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32),
						active: true,
						guild_id: message.guild.id,
						channel_id: message.channel.id
					}
				},
				{ upsert: true },
				err => {
					if (err != null) {
						message.channel.send(utils.errorMsg([['Twitter', err]]));
						console.error(err);
						return;
					}

					message.channel.send(utils.successMsg([['Twitter', 'Sucessfully added twitter user to the channel.']]));
				}
			);
		} else {
			DiscordTwitter.find({ guild_id: message.guild.id }, (err, dFeeds) => {
				if (err != null) {
					message.channel.send(utils.errorMsg([['Twitter', err]]));
					console.error(err);
					return;
				}

				for(var f = 0; f < dFeeds.length; f++) {
					var dFeed = dFeeds[f];

					for(var i = 0; i < dFeed.feeds.length; i++) {
						var feed = dFeed.feeds[i];

						if (feed.feed.toString() == feedDoc!._id.toString()) {
							return message.channel.send(utils.infoMsg([['Twitter', 'Twitter handle is already being used in the discord!']]));
						}
					}
				}

				GlobalTwitterFeeds.updateOne({ _id: feedDoc!._id }, { $inc: { sending_to: 1 } }).exec();
				DiscordTwitter.updateOne(
					{ guild_id: message.guild.id, channel_id: message.channel.id },
					{
						$set: {
							active: true
						},
						$addToSet: {
							feeds: {
								format: null,
								active: true,
								items: statues!.map(i => i.id),
								feed: feedDoc!._id
							}
						}
					},
					err => {
						if (err != null) {
							message.channel.send(utils.errorMsg([['Twitter', err]]));
							console.error(err);
							return;
						}

						message.channel.send(utils.successMsg([['Twitter', 'Sucessfully added twitter user to the channel.']]));
					}
				);
			});
		}
	});
}

export {
	call
};