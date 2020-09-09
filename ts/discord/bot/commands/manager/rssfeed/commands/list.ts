import mongoose = require('mongoose');
import Discord = require('discord.js');

import { Server as DiscordServer } from '@discord/bot/GuildServer';
import DiscordFeeds = require('@discord/models/feed');
import RSSFeeds = require('../../../../../../models/rssfeed');

import utils = require('@discord/utils');

import PERMISSIONS = require('../perms');
import { CustomDocs } from '@type-manager';

// TODO: Sort out options into respectable files.


async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.LIST)) return utils.noPermsMessage('RSS Feed');

	let singleMsg = await message.channel.send(utils.infoMsg([['RSS Feed', 'Finding all RSS Feeds in current Guild.']]));

	let guild = singleMsg.guild!;

	let feeds = await DiscordFeeds.find({ guild_id: guild.id });

	if (feeds.length == 0) {
		await singleMsg.edit(utils.infoMsg([['RSS Feed', 'No RSS Feeds found in current Guild.\nIf you\'d like to add one please use "!rss add <url>"']]));
		return Promise.resolve();
	}

	let selector = utils.createPageSelector(message.member!.id, message.channel)!;
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

		selector.addSelection(String(i + 1), `<#${feed.channel_id}> (Feeds: ${feed.feeds.length})`, async (page) => {
			let [feedPopped, err] = await utils.asyncCatch(DiscordFeeds.findOne({ guild_id: guild.id, channel_id: feed.channel_id })
				.populate('feeds.feed')
				.exec());

			if (err != null) {
				await singleMsg.edit(utils.errorMsg([['RSS Feed', 'An error occured while trying to find RSS Feed for Channel. Please try again in a few moments.']]));
				return;
			}

			return showChannel(server, message.member!, page, <any>feedPopped);
		});
	});

	await selector.display();
}

async function showChannel(server: DiscordServer, guildMember: Discord.GuildMember, page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordRssPopulated) {
	let channel = <Discord.TextChannel>page.channel;

	// const channelExists = channel.guild.channels.has(channelFeed.channel_id);

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

	// TODO: I don't remmeber why this was here.

	// if (!channelExists) {
	// 	page.addSelection('Toggle', 'Enable/Disable the feeds in the channel.', () => {
	// 		channelFeed.active = !channelFeed.active;
	// 		DiscordFeeds.updateOne({ _id: channelFeed._id }, { $set: { active: channelFeed.active } }).exec();
	// 		// TODO
	// 	});
	// }

	if (server.userHasPerm(guildMember, PERMISSIONS.MOVE)) {
		page.addSelection('Move', 'Moves the Channel Feed to a new channel.', async pageMove => {
			pageMove.setFormat([
				'Send Channel ID or # to move the feed to that channel.​',
				'',
				'{page_items}'
			]);

			await pageMove.listen(async message => moveFeedToDifferentChannel(message, channelFeed._id, page, pageMove));

			return pageMove.display();
		});
	}

	if (server.userHasPerm(guildMember, PERMISSIONS.REMOVE)) {
		page.addSelection('Delete', 'Permanently delete all Channel Feeds.', async page => {
			page.addSelection('yes', 'Yes, PERMANENTLY delete all Channel Feeds.', async () => {
				await removeMultipleFeedsFromChannel(channelFeed.feeds.map(f => mongoose.Types.ObjectId(f.feed._id)), channelFeed._id);
				await page.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);

				return Promise.resolve();
			});

			page.addSelection('no', 'No, go back to previous page.', () => page.back());

			return page.display();
		});
	}

	channelFeed.feeds.forEach((feed, i) => {
		page.addSelection(
			String(i + 1),
			'[' + (channelFeed.active ? (feed.active ? 'Active' : 'Disabled') : 'Disabled') + '] ' + feed.feed.link.slice(0, 50),
			async next => showPageFeed(server, guildMember, next, channelFeed, i)
		);
	});

	page.addSpacer();

	return page.display();
}


async function moveFeedToDifferentChannel(channelStrId: string, mongoFeedId: any, page: utils.MessagePage, pageMove: utils.MessagePage): Promise<boolean> {
	let type = utils.getIdType(channelStrId);
	if (type != null || type != 'channel') return false;

	let id = utils.strpToId(channelStrId);
	if (id == null) return false;

	let channel = (<Discord.TextChannel>page.channel).guild.channels.cache.get(id);
	if (channel == null) return false;

	await DiscordFeeds.updateOne({ _id: mongoFeedId }, { $set: { channel_id: channel.id } }).exec();

	await pageMove.temporaryMessage('Changed Feed to requested channel.', 3000);

	return true;
}

async function changeFeedTemplate(newTemplate: string, mongoFeedId: any, feedPos: number) {
	let setting: string | null;

	if (newTemplate.length == 0 || newTemplate == 'default') setting = null;
	else setting = newTemplate.replace(/\</g, '\\<').replace(/\>/g, '\\>');

	await DiscordFeeds.updateOne({ _id: mongoFeedId }, { $set: { ['feeds.' + feedPos + '.format']: setting } }).exec();

	return Promise.resolve();
}

async function removeMultipleFeedsFromChannel(mongoGlobalFeedIds: any[], mongoDiscordFeedId: any) {
	await DiscordFeeds.remove({ _id: mongoDiscordFeedId }).exec();
	// TODO! Ensure correct
	await RSSFeeds.updateMany({ _id: { $in: mongoGlobalFeedIds } }, { $inc: { sending_to: -1 } }).exec();

	return Promise.resolve();
}

async function removeFeedFromChannel(mongoGlobalFeedId: any, mongoDiscordFeedId: any) {
	await DiscordFeeds.updateOne({ _id: mongoDiscordFeedId }, { $pull: { feeds: { feed: mongoGlobalFeedId } } }).exec();
	await RSSFeeds.updateOne({ _id: mongoGlobalFeedId }, { $inc: { sending_to: -1 } }).exec();

	return Promise.resolve();
}


const DEFAULT_RSS_FORMAT = ':newspaper:  **{title}**\n\n{link}';

async function showPageFeed(server: DiscordServer, guildMember: Discord.GuildMember, page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordRssPopulated, pos: number) {
	let feed = channelFeed.feeds[pos];

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

	if (server.userHasPerm(guildMember, PERMISSIONS.EDIT_TEMPLATE)) {
		page.addSelection('Template', 'Change the feed template', async pageTemplate => {
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

			pageTemplate.listen(async value => {
				await changeFeedTemplate(value, channelFeed._id, pos);
				await pageTemplate.temporaryMessage('Changed Feed Format.', 3000);

				return true;
			});

			await pageTemplate.display();
		});
	}

	if (server.userHasPerm(guildMember, PERMISSIONS.REMOVE)) {
		page.addSelection('Remove', 'Remove the feed from the channel.', async pageRemove => {
			pageRemove.addSelection('yes', 'Yes, PERMANENTLY delete the Channel Feeds.', async () => {
				await removeFeedFromChannel(feed.feed._id, channelFeed._id);
				await pageRemove.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);

				return Promise.resolve();
			});

			pageRemove.addSelection('no', 'No, go back to previous page.', async () => pageRemove.back());

			await pageRemove.display();
		});
	}

	return page.display();
}

export {
	call
};