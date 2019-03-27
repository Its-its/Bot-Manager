import mongoose = require('mongoose');
import Discord = require('discord.js');

import DiscordServer = require('@discord/bot/GuildServer');
import DiscordTwitter = require('@discord/models/twitter');
import GlobalTwitterFeeds = require('../../../../../../models/twitterfeed');

import utils = require('@discord/utils');
import { CustomDocs, Nullable } from '@type-manager';



function call(_params: string[], _server: DiscordServer, message: Discord.Message) {
	message.channel.send(utils.infoMsg([['Twitter Feed', 'Finding all Twitter Feeds in current Guild.']]))
	.then(m => {
		var singleMsg: Discord.Message;
		if (Array.isArray(m)) singleMsg = m[0];
		else singleMsg = m;
		if (singleMsg == null) return;

		const guild = singleMsg.guild;

		DiscordTwitter.find({ guild_id: guild.id })
		.exec((err, feeds) => {
			if (err != null) {
				singleMsg.edit(utils.errorMsg([['Twitter Feed', 'An error occured while trying to find Twitter Feeds. Please try again in a few moments.']]));
				return;
			}

			if (feeds.length == 0) {
				singleMsg.edit(utils.infoMsg([['Twitter Feed', 'No Twitter Feeds found in current Guild.\nIf you\'d like to add one please use "!rss add <url>"']]));
				return;
			}

			const selector = utils.createPageSelector(message.member.id, message.channel)!;
			selector.setEditing(singleMsg);

			selector.setFormat([
				'**Feed Limit:** 0/0',
				'**Guild:** ' + guild.name,
				'',
				'You can choose a channel feed to view more info about it by typing the number before the channe name.​',
				'',
				'{page_items}',
				'',
				'Always select responsibly.'
			]);

			feeds.forEach((feed, i) => {
				// const channel = guild.channels.get(feed.channel_id);
				// TODO: Check to see if channel still exists for selection name.
				// TODO: Permission checks

				selector.addSelection(String(i + 1), `<#${feed.channel_id}> (Feeds: ${feed.feeds.length})`, (page) => {
					DiscordTwitter.findOne({ guild_id: guild.id, channel_id: feed.channel_id })
					.populate('feeds.feed')
					.exec((err, feed: CustomDocs.discord.DiscordTwitterPopulated) => {
						if (err != null) {
							singleMsg.edit(utils.errorMsg([['Twitter Feed', 'An error occured while trying to find Twitter Feed for Channel. Please try again in a few moments.']]));
							return;
						}

						showChannel(page, feed);
					});
				});
			});

			selector.display();
		});
	});
}



function showChannel(page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordTwitterPopulated) {
	var channel = <Discord.TextChannel>page.channel;

	// TODO
	// const isSameGuild = (channel.guild.id == channelFeed.guild_id);

	const channelExists = channel.guild.channels.has(channelFeed.channel_id);

	page.setFormat([
		'**Active:** ' + (channelFeed.active ? 'Yes' : 'No'),
		'**Last Checked:** ' + (channelFeed.last_check.toTimeString()),
		'**Feed Count:** ' + channelFeed.feeds.length + '/0',
		'',
		'You can choose a feed to view more info about it by typing the number before the feed Name/URL.​',
		'',
		'{page_items}',
		'',
		'Always select responsibly.'
	]);

	if (!channelExists) {
		page.addSelection('Toggle', 'Enable/Disable the feeds in the channel.', () => {
			channelFeed.active = !channelFeed.active;
			DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { active: channelFeed.active } }).exec();
			// TODO
		});
	}

	page.addSelection('Move', 'Moves the Channel Feed to a new channel.', (pageMove) => {
		pageMove.setFormat([
			'Send Channel ID or # to move the feed to that channel.​',
			'',
			'{page_items}'
		]);

		pageMove.listen(message => {
			var type = utils.getIdType(message);
			if (type != null || type != 'channel') return false;

			var id = utils.strpToId(message);
			if (id == null) return false;

			var channel = (<Discord.TextChannel>page.channel).guild.channels.get(id);
			if (channel == null) return false;

			DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { channel_id: channel.id } }).exec();

			pageMove.temporaryMessage('Changed Feed to requested channel.', 3000);

			return true;
		});

		pageMove.display();
	});

	page.addSelection('Delete', 'Permanently delete all Channel Feeds.', (page) => {
		page.addSelection('yes', 'Yes, PERMANENTLY delete all Channel Feeds.', () => {
			DiscordTwitter.remove({ _id: channelFeed._id }).exec();
			//! Ensure correct
			GlobalTwitterFeeds.updateMany({ _id: { $in: channelFeed.feeds.map(f => mongoose.Types.ObjectId(f.feed._id)) } }, { $inc: { sending_to: -1 } }).exec();
			page.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);
		});

		page.addSelection('no', 'No, go back to previous page.', () => {
			page.back();
		});

		page.display();
	});

	channelFeed.feeds.forEach((feed, i) => {
		page.addSelection(
			String(i + 1),
			`[${(channelFeed.active ? (feed.active ? 'Active' : 'Disabled') : 'Disabled')}]: https://twitter.com/${feed.feed.screenName}`,
			next => showPageFeed(next, channelFeed, i)
		);
	});

	page.addSpacer();

	page.display();
}

const DEFAULT_TWITTER_FORMAT = ':bird:  **{text}**\n\n{link}';


function showPageFeed(page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordTwitterPopulated, pos: number) {
	var feed = channelFeed.feeds[pos];

	page.setFormat([
		// '**Active**: ​' + channelFeed.active,
		// '**URL:** ' + feed.feed.url,
		// '**Template Format:**',
		// '```' + feed.format + '```',
		// '',
		'{page_items}',
		'',
		'Always select responsibly.'
	]);

	// if (!channelExists) {
	// 	page.addSelection('Toggle', 'Enable/Disable this feed.', () => {
	// 		channelFeed.active = !channelFeed.active;
	// 		DiscordFeeds.updateOne({ _id: channelFeed._id }, { $set: { active: channelFeed.active } }).exec();
	// 		// TODO
	// 	});
	// }

	page.addSelection('Template', 'Change the feed template', (pageTemplate) => {
		pageTemplate.setFormat([
			'Template currently:\n```' + (feed.format || DEFAULT_TWITTER_FORMAT) + '```',
			'Please enter the new template in chat.',
			'',
			'{page_items}',
			'',
			'Always select responsibly.'
		]);

		pageTemplate.listen(value => {
			var setting: Nullable<string>;

			if (value.length == 0 || value == 'default') setting = null;
			else setting = value.replace(/\</g, '\\<').replace(/\>/g, '\\>');

			DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { ['feeds.' + pos + '.format']: setting } }).exec();
			pageTemplate.temporaryMessage('Changed Feed Format.', 3000);

			return true;
		});

		pageTemplate.display();
	});

	page.addSelection('Remove', 'Remove the feed from the channel.', (pageRemove) => {
		pageRemove.addSelection('yes', 'Yes, PERMANENTLY delete the Channel Feeds.', () => {
			GlobalTwitterFeeds.updateOne({ _id: feed.feed._id }, { $inc: { sending_to: -1 } }).exec();
			DiscordTwitter.updateOne({ _id: channelFeed._id }, { $pull: { feeds: { feed: feed.feed._id } } }).exec();
			pageRemove.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);
		});

		pageRemove.addSelection('no', 'No, go back to previous page.', () => {
			pageRemove.back();
		});

		pageRemove.display();
	});

	page.display();
}

export {
	call
};