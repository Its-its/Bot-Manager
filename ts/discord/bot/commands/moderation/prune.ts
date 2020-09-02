import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import utils = require('../../../utils');

import Command = require('../../command');

const maxBulkDeleteTime = (1000 * 60 * 60 * 24 * 14);


const PERMS = {
	MAIN: 'commands.prune',
	USER: 'user',
	CHANNEL: 'channel'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member!, server, PERMS.MAIN)) return Command.noPermsMessage('Prune');

class Prune extends Command {
	constructor() {
		super('prune', true, false);

		this.description = 'Prunes a channel.';
		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!message.member!.hasPermission([ 'MANAGE_MESSAGES' ])) {
			return Command.error([['Prune', 'Missing Manage Messages Perms!']]);
		}

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'#channel [all/<=100]',
						// 'user <id/@> [<=100]',
						'channel [id/#] [all/<=100]'
					].map(b => server.getPrefix() + 'prune ' + b).join('\n')
				]
			]);
		}

		let first_arg = params.shift()!;

		if (first_arg != 'user' && first_arg != 'channel') {
			let type = server.idType(first_arg);
			if (type != null) {
				if (type == 'channel') params = ['channel'].concat(params);
				else if (type == 'member') params = ['user'].concat(params);
			}
		}

		// let amnt = parseInt(first_arg);
		// if (!isNaN(amnt)) {
		// 	params = ['channel', message.channel.id];
		// }

		switch (first_arg) {
			case 'user': // TODO:
				if (!this.hasPerms(message.member!, server, PERMS.USER)) return Command.noPermsMessage('Prune');
				return Command.error([['Prune', 'Not implemented yet.']]);
			case 'channel':
				if (!this.hasPerms(message.member!, server, PERMS.CHANNEL)) return Command.noPermsMessage('Prune');

				let channelId = server.strpToId(params.shift());
				let reason = params.shift();
				let pruneLimit = 100;

				if (reason == null) return Command.error([['Prune', 'Invalid Params']]);

				if (channelId == null) {
					channelId = message.channel.id;
				} else if (reason != 'all') {
					pruneLimit = parseInt(reason);
					if (Number.isNaN(pruneLimit)) pruneLimit = 100;
					if (message.channel.id == channelId) pruneLimit++;
					if (pruneLimit > 100) pruneLimit = 100;
				}

				let channelBeingPruned = <Discord.TextChannel>message.guild!.channels.cache.get(channelId);

				if (channelBeingPruned == null) return Command.error([[ 'Prune', 'Channel does not exist!' ]]);
				if (channelBeingPruned.type != 'text') return Command.error([[ 'Prune', 'Channel must be text only!' ]]);

				if (reason == 'all') {
					if (!message.member!.hasPermission([ 'MANAGE_CHANNELS' ])) {
						return send(message.channel, Command.error([['Prune', 'Missing Manage Channels Perms!']])).catch(e => console.error(e));
					}
					return recreateChannel(message.channel, channelBeingPruned);
				}

				send(message.channel, Command.info([['Prune', 'Fetching Messages']]))
				.then((editMessage) => {
					fetchMessages(channelBeingPruned, pruneLimit, Array.isArray(editMessage) ? editMessage[0] : editMessage);
				}, (err) => {
					console.error(err);
					send(message.channel, Command.error([['Prune', 'An error occured! Please try again in a few seconds.']]));
				});
			break;
		}
	}
}

function fetchMessages(channel: Discord.TextChannel, limit: number, editMessage: Discord.Message) {
	channel.messages.fetch({ limit: limit })
	.then((messages) => {
		messages = messages.filter(m => m.id != editMessage.id);

		let filtered = messages.filter(m => Date.now() - m.createdTimestamp < maxBulkDeleteTime);

		// TODO: Instead of replacing, append message?
		editMessage.edit(Command.info([['Prune', 'Bulk Deleting messages.']]))
		.then(editMessage => {
			channel.bulkDelete(filtered)
			.then(() => {
				let deleted = filtered.size;

				if (deleted != messages.size) {
					let singles = messages.filter(m => Date.now() - m.createdTimestamp >= maxBulkDeleteTime);
					singleDeletions(singles.array(), editMessage);
					return;
				}

				editMessage.edit(Command.success([[ 'Prune', 'Deleted a total of ' + deleted + ' Messages from <#' + channel.id + '>' ]]));
			}, (e) => {
				editMessage.edit(Command.error([
					[
						'Prune',
						[
							'An error occured bulk deleting!',
							e.message,
							'Attempting normal deletion in 5 seconds.'
						].join('\n')
					]
				]));

				setTimeout(() => {
					singleDeletions(messages.array(), editMessage);
				}, 5000);
			});
		}, () => {
			//
		});
	}, (e) => {
		console.error(e);
		editMessage.edit(Command.error([[ 'Prune', 'An error occured! Make sure you gave the bot the proper perms!' ]]));
	});
}

function singleDeletions(messages: Discord.Message[], editMessage: Discord.Message) {
	editMessage.edit(Command.info([['Prune', 'Please wait...\nRemoving commands 1 by 1. Since they\'re older than 14 days they can\'t be bulk deleted.']]))
	.then(() => doSingles(), e => console.error(e));

	let pos = 0;

	function doSingles() {
		if (pos >= messages.length) return editMessage.edit(Command.success([['Prune', 'Deleted messages.']])).catch(e => console.error(e));

		let message = messages[pos++];

		message.delete()
		.then(() => setTimeout(() => doSingles(), 500),
		(e) => {
			console.error(e);
			editMessage.edit(Command.error([
				[
					'Prune',
					[
						'An error occured deleting singles!',
						e.message
					].join('\n')
				]
			]));
		});
	}
}

function recreateChannel(sendingChannel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel, channelBeingRecreated: Discord.TextChannel) {
	send(sendingChannel, Command.success([['Prune', 'Cloning channel']]))
	.then(m => {
		let editMessage: Discord.Message;
		if (Array.isArray(m)) editMessage = m[0];
		else editMessage = m;
		if (editMessage == null) return;

		console.log('Clone');

		channelBeingRecreated.clone({
			name: channelBeingRecreated.name,
			reason: '[PRUNE] Recreating channel.'
		})
		.then(newChannel => {
			console.log('Pos');
			editMessage.edit(Command.success([['Prune', 'Setting Channel Position']]))
			.catch(e => error(editMessage, e, '4'));

			console.log('Parent');

			newChannel.setParent(
				channelBeingRecreated.parent!,
				{
					reason: '[PRUNE] Recreating channel.'
				}
			)
			.then(() => {
				channelBeingRecreated.permissionOverwrites
				.forEach(perm => {
					newChannel.overwritePermissions([perm], '[PRUNE] Recreating channel')
					.catch(e => error(editMessage, e, '6'));
				});

				channelBeingRecreated.delete('Recreating Channel')
				.then(() => {

					newChannel.setPosition(channelBeingRecreated.position)
					.then(() => {
						// editMessage.edit(Command.success([['Prune', 'Recreated channel']]));
					})
					.catch(e => error(editMessage, e, '7'));
				})
				.catch(e => error(editMessage, e, '3'));
			})
			.catch(e => error(editMessage, e, '5'));
		})
		.catch(e => error(editMessage, e, '2'))
	})
	.catch((e: any) => console.error(e));

	function error(editMessage: Discord.Message, e: any, p: string) {
		console.error('Prune Error: ' + p);
		console.error(e);
		editMessage.edit('An error occured.\n' + (e.message || e));
	}
}

function send(channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel, str: any, cb?: (err?: Error, message?: Discord.Message | Discord.Message[]) => any) {
	let msg = channel.send(new Discord.MessageEmbed(str.embed));

	if (cb != null) msg.then(msg => cb(undefined, msg), e => cb(e));

	return msg;
}

export = Prune;