import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');

import utils = require('../../../utils');


const PERMS = {
	MAIN: 'commands.random',
	COLOR: 'color',
	NUMBER: 'number',
	LIST: 'list',
	REACTION: 'reaction'
};

class Random extends Command {
	constructor() {
		super('random', true, false);

		this.perms = Object.values(PERMS);

		this.description = 'A box full of random';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var item = params.shift();

		if (item == null) {
			return Command.info([
				[
					'Help - Random',
					[
						'random color',
						'random number <max>',
						'random number <min> <max>',
						'random list <lines/code block(s)>',
						'random reaction <@channel/id> <message id> <reaction>',
						// 'random user <@group/everyone>'
					].map(i => server.getPrefix() + i).join('\n')
				]
			]);
		}

		switch (item) {
			case 'color':
				if (!this.hasPerms(message.member, server, PERMS.COLOR)) return Command.noPermsMessage('Random');

				var newColor = randomColor();

				return Command.defCall(parseInt(newColor), [
					[
						'Random - Color',
						'Generated "' + newColor + '" for you.'
					]
				]);

			case 'number':
				if (!this.hasPerms(message.member, server, PERMS.NUMBER)) return Command.noPermsMessage('Random');

				// Ensure params are correct if only calling a max amount.
				if (params.length == 1) {
					params[1] = params[0];
					params[0] = null;
				}

				var minNumber = strToNumber(params[0], 0);
				var maxNumber = strToNumber(params[1], 100);

				if (minNumber >= maxNumber) {
					return Command.error([
						['Invalid Params!', 'Minimum number is larger than Maximum number'],
						['Values', 'Min: ' + minNumber + ', Max: ' + maxNumber]
					]);
				}

				return Command.success([
					[ 'Number Picked!', 'Picked ' + random(minNumber, maxNumber) ],
					[ 'Picked From', 'Min: ' + minNumber + ', Max: ' + maxNumber ]
				]);

			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Random');

				if (params.length != 0) {
					parseList(params, message.channel);
				} else {
					const selector = utils.createPageSelector(message.author.id, message.channel);

					selector.setFormat([
						'Please now paste the list of items or a pastebin URL (soon) with the items.',
						'**MAKE SURE EVERY ITEM IS ON A NEW LINE**',
						'Example:',
						'```\nitem1\nitem2\nitem3```',
						'_You can also use multiple codeblocks to use as different lists to randomly pick from._',
						'',
						'{page_items}'
					]);

					selector.listen(newMessage => {
						parseList(newMessage.split('\n'), message.channel);
						selector.close('delete');
						return true;
					});

					selector.display();
				}

				return;

			case 'reaction':
				if (!this.hasPerms(message.member, server, PERMS.REACTION)) return Command.noPermsMessage('Random');

				var discordChannelIdStr = params.shift();
				var msgIdStripped = params.shift();
				var reactionIdStripped = params.shift();

				if (reactionIdStripped == null) return Command.error([[ 'Random', 'Invalid: random reaction <channel> <message id> <emoji id>' ]]);

				var channelIdType = server.idType(discordChannelIdStr);
				if (channelIdType != null && channelIdType != 'channel') return Command.error([[ 'Random', 'Channel ID is invalid. Doesn\'t exist or not a channel.' ]]);

				var channelIdStripped = server.strpToId(discordChannelIdStr);

				var discordChannel = <Discord.TextChannel>message.guild.channels.get(channelIdStripped);
				if (discordChannel == null || discordChannel.type != 'text') return Command.error([[ 'Random', 'Message ID is invalid. Doesn\'t exist or not a text channel.' ]]);


				discordChannel.fetchMessage(msgIdStripped)
				.then(reqDiscordMessage => {
					if (reqDiscordMessage == null) return message.channel.send(Command.error([[ 'Random', 'Message not found! Invalid Message ID or not in channel.' ]]));

					var messageReaction = reqDiscordMessage.reactions.get(reactionIdStripped);

					if (messageReaction == null) return message.channel.send(Command.error([[ 'Random', 'Unable to find reaction (emoji) ID in message.' ]]));
					if (messageReaction.count == 0) return message.channel.send(Command.error([[ 'Random', 'There are no reactions affiliated with this message.' ]]));

					messageReaction.fetchUsers(1, { after: random(0, messageReaction.count - 1) })
					.then(userCollection => {
						var randomUserId = userCollection.firstKey();

						if (randomUserId != null) {
							message.channel.send(Command.success([
								[
									'Random',
									'Randomly picked <@' + randomUserId + '>'
								]
							]));
						} else {
							message.channel.send(Command.error([[ 'Random', 'Unable to grab member.' ]]));
						}
					})
					.catch(e => console.error(e));
				})
				.catch(e => console.error(e));

				return;
		}
	}
}

function random(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor(): string {
	return '0x' + Math.floor(Math.random() * 16777215).toString(16);
}

function strToNumber(reqStrNumber: string, defaultNumber: number): number {
	if (reqStrNumber == null || reqStrNumber.length == 0) return defaultNumber;
	var value = parseInt(reqStrNumber);
	return isNaN(value) ? defaultNumber : value;
}


function parseList(lines: string[], channel: Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel) {
	var codeblockCount = getCodeblockCount(lines);
	var lists: string[][] = [];

	var itemsNotCounted = 0;

	if (codeblockCount != 0) {
		// Invalid Code blocks. Not even.
		if (codeblockCount % 2 != 0) return channel.send(Command.error([[ 'Random - Lines', 'Invalid code blocks. If you\'re not using code blocks please change "``" -> "\\`\\`"' ]]));

		var currentLine: string;
		var currnetPos = 0;
		var insideCodeblocks = false;

		while((currentLine = lines[currnetPos++]) != null) {
			if (currentLine.startsWith('``')) {
				insideCodeblocks = !insideCodeblocks;
				if (insideCodeblocks) lists.push([]);
			} else if (insideCodeblocks) {
				lists[lists.length - 1].push(currentLine);
			} else {
				// Items outside of code blocks not including spaces.
				if (currentLine.trim().length != 0) itemsNotCounted++;
			}
		}
	} else {
		lists.push(lines);
	}

	var compiledLists: [string, string][] = [];
	var totalItemsFromLists = 0;

	for(var i = 0; i < lists.length; i++) {
		var list = lists[i];

		totalItemsFromLists += list.length;

		compiledLists.push([
			'Random - Pull from List #' + (i + 1),
			'Randomly picked **' + list[random(0, list.length - 1)] + '** from list'
		]);
	}

	compiledLists.push([
		'Random - List(s) Info',
		[
			'Total in all lists: ' + totalItemsFromLists + ' items',
			'Not in a list: ' + itemsNotCounted + ' items'
		].concat(lists.map((l, i) => `**List #${i + 1}:** ${l.length} items`)).join('\n')
	]);

	channel.send(Command.success(compiledLists));
}

function getCodeblockCount(lines: string[]) {
	var codeblocks = 0;

	var line: string = null;
	var pos = 0;

	while((line = lines[pos++]) != null) {
		if (line.startsWith('``')) codeblocks++;
	}

	return codeblocks;
}


export = Random;