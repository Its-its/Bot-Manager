import Discord = require('discord.js');
import DiscordServer = require('../../../../discordserver');

import DiscordFeeds = require('../../../../models/feed');

import chatUtils = require('../../../../utils/chat'); 

import utils = require('../../../../utils');


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	message.channel.send(utils.infoMsg([['RSS Feed', 'Finding all RSS Feeds in current Guild.']]))
	.then((m: Discord.Message) => {
		const guild = m.guild;

		DiscordFeeds.find({ guild_id: guild.id })
		.exec((err, feeds) => {
			if (err != null) {
				m.edit(utils.errorMsg([['RSS Feed', 'An error occured while trying to find RSS Feeds. Please try again in a few moments.']]));
				return;
			}

			if (feeds.length == 0) {
				m.edit(utils.infoMsg([['RSS Feed', 'No RSS Feeds found in current Guild.']]));
				return;
			}

			const selector = chatUtils.createPageSelector(message.member.id, message.channel);
			selector.setEditing(m);

			selector.setFormat([
				'**Server Limit:** 0/0',
				'**Guild:** ' + guild.name,
				'',
				'You can choose a channel feed to view more info about it by typing the number before the channe name.​',
				'',
				'{page_items}',
				'',
				'Always select responsibly.'
			]);

			feeds.forEach((feed, i) => {
				const channel = guild.channels.get(feed.channel_id);

				if (channel != null) {
					selector.addSelection(String(i + 1), channel.name + ' (Feeds: ' + feed.feeds.length + ')', (page, display) => {
						DiscordFeeds.findOne({ guild_id: guild.id, channel_id: feed.channel_id })
						.populate('feeds.feed')
						.exec((err, feed) => {
							// Edit DiscordFeed
						});
					});
				}
			});
		});
	});
}

export {
	call
};