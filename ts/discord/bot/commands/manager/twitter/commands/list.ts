import mongoose = require('mongoose');
import Discord = require('discord.js');

import DiscordServer = require('@discord/bot/GuildServer');
import DiscordTwitter = require('@discord/models/twitter');
import GlobalTwitterFeeds = require('@base/models/twitterfeed');

import utils = require('@discord/utils');
import { CustomDocs, Nullable } from '@type-manager';



async function call(_params: string[], _server: DiscordServer, message: Discord.Message) {
	let singleMsg = await message.channel.send(utils.infoMsg([['Twitter Feed', 'Finding all Twitter Feeds in current Guild.']]));

	if (singleMsg == null) return;

	let guild = singleMsg.guild!;

	let feeds = await DiscordTwitter.find({ guild_id: guild.id });

	if (feeds.length == 0) {
		await singleMsg.edit(utils.infoMsg([['Twitter Feed', 'No Twitter Feeds found in current Guild.\nIf you\'d like to add one please use "!rss add <url>"']]));
		return;
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
			let [cfeed, err] = await utils.asyncCatch(DiscordTwitter.findOne({ guild_id: guild.id, channel_id: feed.channel_id })
				.populate('feeds.feed')
				.exec());

			if (err != null) {
				await singleMsg.edit(utils.errorMsg([['Twitter Feed', 'An error occured while trying to find Twitter Feed for Channel. Please try again in a few moments.']]));
				return;
			}

			return showChannel(page, <any>cfeed);
		});
	});

	await selector.display();
}



async function showChannel(page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordTwitterPopulated) {
	let channel = <Discord.TextChannel>page.channel;

	// TODO
	// const isSameGuild = (channel.guild.id == channelFeed.guild_id);

	const channelExists = channel.guild.channels.cache.has(channelFeed.channel_id);

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
		page.addSelection('Toggle', 'Enable/Disable the feeds in the channel.', async () => {
			channelFeed.active = !channelFeed.active;
			await DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { active: channelFeed.active } }).exec();
			// TODO
			return Promise.resolve();
		});
	}

	page.addSelection('Move', 'Moves the Channel Feed to a new channel.', async pageMove => {
		pageMove.setFormat([
			'Send Channel ID or # to move the feed to that channel.​',
			'',
			'{page_items}'
		]);

		pageMove.listen(async message => {
			let type = utils.getIdType(message);
			if (type != null || type != 'channel') return false;

			let id = utils.strpToId(message);
			if (id == null) return false;

			let channel = (<Discord.TextChannel>page.channel).guild.channels.cache.get(id);
			if (channel == null) return false;

			await DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { channel_id: channel.id } }).exec();

			await pageMove.temporaryMessage('Changed Feed to requested channel.', 3000);

			return true;
		});

		return pageMove.display();
	});

	page.addSelection('Delete', 'Permanently delete all Channel Feeds.', async page => {
		page.addSelection('yes', 'Yes, PERMANENTLY delete all Channel Feeds.', async () => {
			await DiscordTwitter.remove({ _id: channelFeed._id }).exec();
			//! Ensure correct
			await GlobalTwitterFeeds.updateMany({ _id: { $in: channelFeed.feeds.map(f => mongoose.Types.ObjectId(f.feed._id)) } }, { $inc: { sending_to: -1 } }).exec();

			await page.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);

			return Promise.resolve();
		});

		page.addSelection('no', 'No, go back to previous page.', () => page.back());

		return page.display();
	});

	channelFeed.feeds.forEach((feed, i) => {
		page.addSelection(
			String(i + 1),
			`[${(channelFeed.active ? (feed.active ? 'Active' : 'Disabled') : 'Disabled')}]: https://twitter.com/${feed.feed.screenName}`,
			async next => showPageFeed(next, channelFeed, i)
		);
	});

	page.addSpacer();

	return page.display();
}

const DEFAULT_TWITTER_FORMAT = ':bird:  **{text}**\n\n{link}';


async function showPageFeed(page: utils.MessagePage, channelFeed: CustomDocs.discord.DiscordTwitterPopulated, pos: number) {
	let feed = channelFeed.feeds[pos];

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

	page.addSelection('Template', 'Change the feed template', async pageTemplate => {
		pageTemplate.setFormat([
			'Template currently:\n```' + (feed.format || DEFAULT_TWITTER_FORMAT) + '```',
			'Please enter the new template in chat.',
			'',
			'{page_items}',
			'',
			'Always select responsibly.'
		]);

		pageTemplate.listen(async value => {
			let setting: Nullable<string>;

			if (value.length == 0 || value == 'default') setting = null;
			else setting = value.replace(/\</g, '\\<').replace(/\>/g, '\\>');

			await DiscordTwitter.updateOne({ _id: channelFeed._id }, { $set: { ['feeds.' + pos + '.format']: setting } }).exec();
			await pageTemplate.temporaryMessage('Changed Feed Format.', 3000);

			return true;
		});

		await pageTemplate.display();
	});

	page.addSelection('Remove', 'Remove the feed from the channel.', async pageRemove => {
		pageRemove.addSelection('yes', 'Yes, PERMANENTLY delete the Channel Feeds.', async () => {
			await GlobalTwitterFeeds.updateOne({ _id: feed.feed._id }, { $inc: { sending_to: -1 } }).exec();
			await DiscordTwitter.updateOne({ _id: channelFeed._id }, { $pull: { feeds: { feed: feed.feed._id } } }).exec();
			await pageRemove.temporaryMessage(`Deleted <#${channelFeed.channel_id}> Channel Feeds`, 3000);

			return Promise.resolve();
		});

		pageRemove.addSelection('no', 'No, go back to previous page.', () => pageRemove.back());

		return pageRemove.display();
	});

	return page.display();
}

export {
	call
};