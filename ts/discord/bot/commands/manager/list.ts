import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';
import utils = require('@discord/utils');
import { Nullable } from '@type-manager';

const PERMS = {
	MAIN: 'commands.list',
	REACTION: 'reaction'
};


class Message extends Command {
	constructor() {
		super('list');

		this.perms = Object.values(PERMS);

		this.description = 'Made for ypperin. Not complete.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		let usage = params.shift();

		if (usage == null) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					'reaction <@channel/id> <message id> <reaction>'
				]
			]);
		}

		switch(usage.toLowerCase()) {
			case 'reaction': {
				if (!this.hasPerms(message.member!, server, PERMS.REACTION)) return Command.noPermsMessage('Random');

				let discordChannelIdStr = params.shift()!;
				let msgIdStripped = params.shift()!;
				let reactionIdStripped = params.shift()!;

				if (reactionIdStripped == null) return Command.error([[ 'Random', 'Invalid: random reaction <channel> <message id> <emoji id>' ]]);

				let channelIdType = server.idType(discordChannelIdStr);
				if (channelIdType != null && channelIdType != 'channel') return Command.error([[ 'Random', 'Channel ID is invalid. Doesn\'t exist or not a channel.' ]]);

				let channelIdStripped = server.strpToId(discordChannelIdStr)!;

				let discordChannel = <Discord.TextChannel>message.guild!.channels.cache.get(channelIdStripped);
				if (discordChannel == null || discordChannel.type != 'text') return Command.error([[ 'Random', 'Message ID is invalid. Doesn\'t exist or not a text channel.' ]]);


				let reqDiscordMessage = await discordChannel.messages.fetch(msgIdStripped);

				let messageReaction = reqDiscordMessage.reactions.cache.get(reactionIdStripped);

				if (messageReaction == null) {
					await message.channel.send(Command.error([[ 'Random', 'Unable to find reaction (emoji) ID in message.' ]]));
					return Promise.resolve();
				}

				if (messageReaction.count == null || messageReaction.count == 0) {
					await message.channel.send(Command.error([[ 'Random', 'There are no reactions affiliated with this message.' ]]));
					return Promise.resolve();
				}

				await outputReactionList(messageReaction, message);

				break;
			}
		}

		return Promise.resolve();
	}
}


async function outputReactionList(messageReaction: Discord.MessageReaction, message: Discord.Message) {
	// TODO: Verify user is still in guild before sending message.
	let users: Discord.Collection<string, Discord.User>;

	if (messageReaction.count == messageReaction.users.cache.size) {
		// Use cache if we already have it filled.
		users = messageReaction.users.cache;
	} else {
		// Fetch all the users if cache wasn't filled.
		users = await messageReaction.users.fetch();
	}

	await message.channel.send(Command.success([
		[
			'List Reactions',
			`Reaction: ${messageReaction.emoji.name}\nFound: ${users.size}`
		]
	]));

	let messageCache = '';

	for (const user of users.values()) {
		messageCache += `${user.tag} (${user.toString()})\n`;

		await message.channel.send(messageCache);

		messageCache = '';
	}
}

export = Message;