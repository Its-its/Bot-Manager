import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');

import chatUtil = require('../../utils/chat');


const PERMS = {
	MAIN: 'commands.random'
};

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('');


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
				var color = randomColor();

				return Command.defCall(parseInt(color), [
					[
						'Random - Color',
						'I\'ve generated "' + color + '" for you.'
					]
				]);
			case 'number':
				if (params.length == 1) {
					params[1] = params[0];
					params[0] = null;
				}

				var min = strToNumber(params[0], 0);
				var max = strToNumber(params[1], 100);

				if (min >= max) {
					return Command.error([
						['Invalid Params!', 'Minimum number is larger than Maximum number'],
						['Values', 'Min: ' + min + ', Max: ' + max]
					]);
				}

				return Command.success([
					[ 'Number Picked!', 'Picked ' + random(min, max) ],
					[ 'Picked From', 'Min: ' + min + ', Max: ' + max ]
				]);
			case 'list':
				if (params.length != 0) {
					parseList(params);
				} else {
					const selector = chatUtil.createPageSelector(message.author.id, message.channel);

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
						parseList(newMessage.split('\n'));
						selector.close('delete');
						return true;
					});

					selector.display();
				}

				function parseList(lines: string[]) {
					var codeblockCount = getCodeblockCount();
					var lists: string[][] = [];

					var notCounted = 0;

					if (codeblockCount != 0) {
						if (codeblockCount % 2 != 0) return message.channel.send(Command.error([[ 'Random - Lines', 'Invalid code blocks. If you\'re not using code blocks please change "``" -> "\\`\\`"' ]])); // Invalid Code blocks. Not even.

						var line: string;
						var pos = 0;
						var inCodeblock = false;

						while((line = lines[pos++]) != null) {
							if (line.startsWith('``')) {
								inCodeblock = !inCodeblock;
								if (inCodeblock) lists.push([]);
							} else if (inCodeblock) {
								lists[lists.length - 1].push(line);
							} else {
								// Items outside of code blocks not including spaces.
								if (line.trim().length != 0) notCounted++;
							}
						}
					} else {
						lists.push(lines);
					}

					var compiled: [string, string][] = [];
					var total = 0;

					for(var i = 0; i < lists.length; i++) {
						var list = lists[i];

						total += list.length;

						compiled.push([
							'Random - Pull from List #' + (i + 1),
							'Randomly picked **' + list[random(0, list.length - 1)] + '** from list'
						]);
					}

					compiled.push([
						'Random - List(s) Info',
						[
							'Total in all lists: ' + total + ' items',
							'Not in a list: ' + notCounted + ' items'
						].concat(lists.map((l, i) => `**List #${i + 1}:** ${l.length} items`)).join('\n')
					]);

					message.channel.send(Command.success(compiled));

					function getCodeblockCount() {
						var codeblocks = 0;

						var line: string = null;
						var pos = 0;

						while((line = lines[pos++]) != null) {
							if (line.startsWith('``')) codeblocks++;
						}

						return codeblocks;
					}
				}
				return;
			case 'reaction':
				var msg_chann_id = params.shift();
				var msg_id = params.shift();
				var reaction_id = params.shift();

				if (reaction_id == null) return Command.error([[ 'Random - Reaction', 'Invalid: random reaction <channel> <message id> <emoji id>' ]]);

				var type_chann = server.idType(msg_chann_id);
				if (type_chann != null && type_chann != 'channel') return Command.error([[ 'Random - Reaction', 'Channel ID is invalid. Doesn\'t exist or not a channel.' ]]);

				var channel_id = server.strpToId(msg_chann_id);
				var channel = <Discord.TextChannel>message.guild.channels.get(channel_id);
				if (channel == null || channel.type != 'text') return Command.error([[ 'Random - Reaction', 'Message ID is invalid. Doesn\'t exist or not a text channel.' ]]);


				channel.fetchMessage(msg_id)
				.then(msg => {
					if (msg == null) return message.channel.send(Command.error([[ 'Random - Reaction', 'Message not found! Invalid Message ID or not in channel.' ]]));

					var reaction = msg.reactions.get(reaction_id);

					if (reaction == null) return message.channel.send(Command.error([[ 'Random - Reaction', 'Unable to find emoji ID in message.' ]]));
					if (reaction.count == 0) return message.channel.send(Command.error([[ 'Random - Reaction', 'Emoji count equals 0' ]]));

					reaction.fetchUsers(1, { after: random(0, reaction.count - 1) })
					.then(coll => {
						var id = coll.keyArray()[0];

						if (id != null) {
							message.channel.send(Command.success([
								[
									'Random - Reaction',
									'Randomly picked <@' + id + '>'
								]
							]));
						} else {
							message.channel.send(Command.error([[ 'Random - Reaction', 'Unable to grab member.' ]]));
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

function strToNumber(str: string, def: number): number {
	if (str == null) return def;
	var value = parseInt(str);
	return isNaN(value) ? def : value;
}

export = Random;