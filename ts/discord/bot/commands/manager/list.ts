import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';
import utils = require('@discord/utils');
import { Nullable, Optional } from '@type-manager';

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
				if (!this.hasPerms(message.member!, server, PERMS.REACTION)) return Command.noPermsMessage('List');

				let discordChannelIdStr = params.shift()!;
				let msgIdStripped = params.shift()!;
				let reactionIdStripped = params.shift()!;

				if (reactionIdStripped == null) {
					return Command.error([[ 'List Reaction', 'Invalid: random reaction <channel> <message id> <emoji id>' ]]);
				}

				let channelIdType = server.idType(discordChannelIdStr);
				if (channelIdType != null && channelIdType != 'channel') {
					return Command.error([[ 'List Reaction', 'Channel ID is invalid. Doesn\'t exist or not a channel.' ]]);
				}

				let channelIdStripped = server.strpToId(discordChannelIdStr)!;

				let discordChannel = <Discord.TextChannel>message.guild!.channels.cache.get(channelIdStripped);
				if (discordChannel == null || discordChannel.type != 'text') {
					return Command.error([[ 'List Reaction', 'Message ID is invalid. Doesn\'t exist or not a text channel.' ]]);
				}


				let reqDiscordMessage = await discordChannel.messages.fetch(msgIdStripped);

				let messageReaction = reqDiscordMessage.reactions.cache.get(reactionIdStripped);

				if (messageReaction == null) {
					await message.channel.send(Command.error([[ 'List Reaction', 'Unable to find reaction (emoji) ID in message.' ]]));
					return Promise.resolve();
				}

				if (messageReaction.count == null || messageReaction.count == 0) {
					await message.channel.send(Command.error([[ 'List Reaction', 'There are no reactions affiliated with this message.' ]]));
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
	let sent_message = await message.channel.send(Command.success([
		[
			'List Reactions',
			`Grabbing the list of users whom reacted to this.\nThis will take at least ${Math.floor(messageReaction.count!/100)} second(s)`
		]
	]));

	let users = await fetchAllUsers(messageReaction);

	await sent_message.edit(Command.success([
		[
			'List Reactions',
			`Reaction: ${messageReaction.emoji.name}\nFound: ${users.length}/${messageReaction.count}\n:arrow_down: Outputting Below :arrow_down:`
		]
	]));

	let messageCache = '';

	for (const user of users.values()) {
		messageCache += `${user.tag} (${user.toString()})\n`;

		if (messageCache.length >= 1850) {
			await message.channel.send(messageCache);
			messageCache = '';

			await utils.asyncTimeout(500);
		}
	}

	await message.channel.send(Command.success([
		[
			'List Reactions',
			`Completed output.`
		]
	]));
}

async function fetchAllUsers(messageReaction: Discord.MessageReaction): Promise<Discord.User[]> {
	let users: Discord.User[] = [];
	let lastId: Optional<string> = undefined;

	for(;;) {
		let userColl = await messageReaction.users.fetch({
			limit: 100,
			after: lastId
		});

		userColl.forEach(u => users.push(u));

		if (userColl.size != 100) {
			break;
		}

		lastId = users[users.length - 1].id;

		await utils.asyncTimeout(500);
	}


	return users;
}

export = Message;