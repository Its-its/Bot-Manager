import Discord = require('discord.js');
import generate = require('nanoid/generate');


import DiscordServer = require('../../../../discordserver');
import DiscordFeeds = require('../../../../models/feed');

import RSSFeeds = require('../../../../../models/rssfeed');

import utils = require('../../../../../rssgrabber/utils');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var url = params.join(' ');
	console.log('Url: ' + url);

	utils.addNewFeed(url, null, null, (err, isNew, feedDoc, article) => {
		if (err != null) return console.error(err);

		if (isNew) {
			DiscordFeeds.updateOne(
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
					// 
				}
			);
		} else {
			RSSFeeds.updateOne({ _id: feedDoc._id }, { $inc: { sending_to: 1 } }).exec();
		}
	});
}

export {
	call
};