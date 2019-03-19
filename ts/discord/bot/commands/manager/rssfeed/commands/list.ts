import mongoose = require('mongoose');
import Discord = require('discord.js');

import DiscordServer = require('../../../../GuildServer');
import DiscordFeeds = require('../../../../../models/feed');
import RSSFeeds = require('../../../../../../models/rssfeed');

import utils = require('../../../../../utils');

import PERMISSIONS = require('../perms');

// TODO: Sort out options into respectable files.


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!this.hasPerms(message.member, server, PERMISSIONS.LIST)) return utils.noPermsMessage('RSS Feed');

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
				m.edit(utils.infoMsg([['RSS Feed', 'No RSS Feeds found in current Guild.\nIf you\'d like to add one please use "!rss add <url>"']]));
				return;
			}

			const selector = utils.createPageSelector(message.member.id, message.channel);
			selector.setEditing(m);

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
					DiscordFeeds.findOne({ guild_id: guild.id, channel_id: feed.channel_id })
					.populate('feeds.feed')
					.exec((err, feed) => {
						if (err != null) {
							m.edit(utils.errorMsg([['RSS Feed', 'An error occured while trying to find RSS Feed for Channel. Please try again in a few moments.']]));
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

interface Feed extends mongoose.Document {
	url: string;
	link: string;
	xmlUrl: string;

	sending_to: number;

	items: {
		id: string;
		title: string;
		description: string;
		date: Date;
		link: string;
		guid: string;
		author: string;
		generator: string;
		categories: string[];
	}[];

	last_called: Date;
}

interface ChannelFeedItem {
	format: string;
	active: boolean;
	items: string[];
	feed: Feed;
};

interface ChannelFeed extends mongoose.Document {
	pid: string;
	active: boolean;
	guild_id: string;
	channel_id: string;
	last_check: Date;

	feeds: ChannelFeedItem[];
}

function showChannel(page: utils.MessagePage, channelFeed: ChannelFeed) {
	var channel = <Discord.TextChannel>page.channel;

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
			DiscordFeeds.updateOne({ _id: channelFeed._id }, { $set: { active: channelFeed.active } }).exec();
			// TODO
		});
	}

	page.addSelection('Move', 'Moves the Channel Feed to a new channel.', (pageMove) => {
		pageMove.setFormat([
			'Send Channel ID or # to move the feed to that channel.​',
			'',
			'{page_items}'
		]);

		pageMove.listen(message => moveFeedToDifferentChannel(message, channelFeed._id, page, pageMove));

		pageMove.display();
	});

	page.addSelection('Delete', 'Permanently delete all Channel Feeds.', (page) => {
		page.addSelection('yes', 'Yes, PERMANENTLY delete all Channel Feeds.', () => {
			removeMultipleFeedsFromChannel(channelFeed.feeds.map(f => mongoose.Types.ObjectId(f.feed._id)), channelFeed._id);
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
			'[' + (channelFeed.active ? (feed.active ? 'Active' : 'Disabled') : 'Disabled') + '] ' + feed.feed.link.slice(0, 50),
			next => showPageFeed(next, channelFeed, i)
		);
	});

	page.addSpacer();

	page.display();
}


function moveFeedToDifferentChannel(channelStrId: string, mongoFeedId: any, page: utils.MessagePage, pageMove: utils.MessagePage): boolean {
	var type = utils.getIdType(channelStrId);
	if (type != null || type != 'channel') return false;

	var id = utils.strpToId(channelStrId);
	if (id == null) return false;

	var channel = (<Discord.TextChannel>page.channel).guild.channels.get(id);
	if (channel == null) return false;

	DiscordFeeds.updateOne({ _id: mongoFeedId }, { $set: { channel_id: channel.id } }).exec();

	pageMove.temporaryMessage('Changed Feed to requested channel.', 3000);

	return true;
}

function changeFeedTemplate(newTemplate: string, mongoFeedId: any, feedPos: number) {
	if (newTemplate.length == 0 || newTemplate == 'default') newTemplate = null;
	else newTemplate = newTemplate.replace(/\</g, '\\<').replace(/\>/g, '\\>');

	DiscordFeeds.updateOne({ _id: mongoFeedId }, { $set: { ['feeds.' + feedPos + '.format']: newTemplate } }).exec();
}

function removeMultipleFeedsFromChannel(mongoGlobalFeedIds: any[], mongoDiscordFeedId: any) {
	DiscordFeeds.remove({ _id: mongoDiscordFeedId }).exec();
	// TODO! Ensure correct
	RSSFeeds.updateMany({ _id: { $in: mongoGlobalFeedIds } }, { $inc: { sending_to: -1 } }).exec();
}

function removeFeedFromChannel(mongoGlobalFeedId: any, mongoDiscordFeedId: any) {
	DiscordFeeds.updateOne({ _id: mongoDiscordFeedId }, { $pull: { feeds: { feed: mongoGlobalFeedId } } }).exec();
	RSSFeeds.updateOne({ _id: mongoGlobalFeedId }, { $inc: { sending_to: -1 } }).exec();
}


const DEFAULT_RSS_FORMAT = ':newspaper:  **{title}**\n\n{link}';

function showPageFeed(page: utils.MessagePage, channelFeed: ChannelFeed, pos: number) {
	var feed = channelFeed.feeds[pos];

	page.setFormat([
		'**Active**: ​' + channelFeed.active,
		'**URL:** ' + feed.feed.url,
		'**Link:** ' + feed.feed.link,
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
			'Template currently:',
			'```' + (feed.format || DEFAULT_RSS_FORMAT) + '```',
			'Please enter the new template in chat.',
			'Values: ``{title}, {link}, more to be added...``',
			'',
			'{page_items}',
			'',
			'Always select responsibly.'
		]);

		pageTemplate.listen(value => {
			changeFeedTemplate(value, channelFeed._id, pos);
			pageTemplate.temporaryMessage('Changed Feed Format.', 3000);
			return true;
		});

		pageTemplate.display();
	});

	page.addSelection('Remove', 'Remove the feed from the channel.', (pageRemove) => {
		pageRemove.addSelection('yes', 'Yes, PERMANENTLY delete the Channel Feeds.', () => {
			removeFeedFromChannel(feed.feed._id, channelFeed._id);
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