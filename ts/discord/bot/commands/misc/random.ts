import Discord = require('discord.js');

import { Server as DiscordServer }  from '../../GuildServer';

import { Command } from '@discord/bot/command';

import utils = require('../../../utils');
import { Optional } from '@type-manager';


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

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		let item = params.shift();

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
			case 'color': {
				if (!this.hasPerms(message.member!, server, PERMS.COLOR)) return Command.noPermsMessage('Random');

				let newColor = randomColor();

				return Command.defCall(parseInt(newColor), [
					[
						'Random - Color',
						'Generated "' + newColor + '" for you.'
					]
				]);
			}

			case 'number': {
				if (!this.hasPerms(message.member!, server, PERMS.NUMBER)) return Command.noPermsMessage('Random');

				// Ensure params are correct if only calling a max amount.
				if (params.length == 1) {
					params[1] = params[0];
					// @ts-ignore
					params[0] = null;
				}

				let minNumber = strToNumber(params[0], 0);
				let maxNumber = strToNumber(params[1], 100);

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
			}

			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMS.LIST)) return Command.noPermsMessage('Random');

				if (params.length != 0) {
					await parseList(params, message.channel);
				} else {
					let selector = utils.createPageSelector(message.author.id, message.channel)!;

					selector.setFormat([
						'Please now paste the list of items or a pastebin URL (soon) with the items.',
						'**MAKE SURE EVERY ITEM IS ON A NEW LINE**',
						'Example:',
						'```\nitem1\nitem2\nitem3```',
						'_You can also use multiple codeblocks to use as different lists to randomly pick from._',
						'',
						'{page_items}'
					]);

					selector.listen(async newMessage => {
						await parseList(newMessage.split('\n'), message.channel);
						await selector.close('delete');

						return true;
					});

					await selector.display();
				}

				break;
			}

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

				await outputRandom(messageReaction, message);

				break;
			}
		}

		return Promise.resolve();
	}
}

async function outputRandom(messageReaction: Discord.MessageReaction, message: Discord.Message) {
	let sent_message = await message.channel.send(Command.success([
		[
			'Random',
			`Grabbing the list of users whom reacted to this.\nThis will take at least ${Math.floor((messageReaction.count!/100)/2)} second(s)`
		]
	]));

	// TODO: Verify user is still in guild before sending message.

	let userCollection = await fetchAllUsers(messageReaction);

	let randomUser = userCollection.random();

	if (randomUser != null) {
		await sent_message.edit(Command.success([
			[
				'Random',
				`Randomly picked ${randomUser.toString()} (${randomUser.tag})\nRan Against ${userCollection.size}/${messageReaction.count} u/r`
			]
		]));
	} else {
		await sent_message.edit(Command.error([[ 'Random', 'Unable to grab member.' ]]));
	}
}

async function fetchAllUsers(messageReaction: Discord.MessageReaction): Promise<Discord.Collection<string, Discord.User>> {
	await utils.asyncTimeout(250);

	let users = await messageReaction.users.fetch({ limit: 100 });
	let lastId: Optional<string> = undefined;

	for(;;) {
		await utils.asyncTimeout(500);

		let userColl = await messageReaction.users.fetch({
			limit: 100,
			after: lastId
		});

		users = users.concat(userColl);

		if (userColl.size != 100) {
			break;
		}

		lastId = users.lastKey();
	}


	return users;
}

function random(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor(): string {
	return '0x' + Math.floor(Math.random() * 16777215).toString(16);
}

function strToNumber(reqStrNumber: string, defaultNumber: number): number {
	if (reqStrNumber == null || reqStrNumber.length == 0) return defaultNumber;
	let value = parseInt(reqStrNumber);
	return isNaN(value) ? defaultNumber : value;
}


async function parseList(lines: string[], channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel) {
	let codeblockCount = getCodeblockCount(lines);
	let lists: string[][] = [];

	let itemsNotCounted = 0;

	if (codeblockCount != 0) {
		// Invalid Code blocks. Not even.
		if (codeblockCount % 2 != 0) return channel.send(Command.error([[ 'Random - Lines', 'Invalid code blocks. If you\'re not using code blocks please change "``" -> "\\`\\`"' ]]));

		let currentLine: string;
		let currnetPos = 0;
		let insideCodeblocks = false;

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

	let compiledLists: [string, string][] = [];
	let totalItemsFromLists = 0;

	for(let i = 0; i < lists.length; i++) {
		let list = lists[i];

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

	return channel.send(Command.success(compiledLists));
}

function getCodeblockCount(lines: string[]) {
	let codeblocks = 0;

	let line: string;
	let pos = 0;

	while((line = lines[pos++]) != null) {
		if (line.startsWith('``')) codeblocks++;
	}

	return codeblocks;
}


export = Random;