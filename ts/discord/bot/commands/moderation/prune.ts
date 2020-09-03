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

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
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
			case 'channel': {
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
						await message.channel.send(Command.error([['Prune', 'Missing Manage Channels Perms!']]));
						break;
					} else {
						await recreateChannel(message.channel, channelBeingPruned);
					}
				} else {
					let editMessage = await message.channel.send(Command.info([['Prune', 'Fetching Messages']]))
					await fetchMessages(channelBeingPruned, pruneLimit, Array.isArray(editMessage) ? editMessage[0] : editMessage);
				}


				break;
			}
		}

		return Promise.resolve();
	}
}

async function fetchMessages(channel: Discord.TextChannel, limit: number, editMessage: Discord.Message) {
	let messages = await channel.messages.fetch({ limit: limit });

	messages = messages.filter(m => m.id != editMessage.id);

	let filtered = messages.filter(m => Date.now() - m.createdTimestamp < maxBulkDeleteTime);

	// TODO: Instead of replacing, append message?
	let newEditMessage = await editMessage.edit(Command.info([['Prune', 'Bulk Deleting messages.']]));

	let [v, error] = await utils.asyncCatch(channel.bulkDelete(filtered));

	if (v != null) {
		let deleted = filtered.size;

		if (deleted != messages.size) {
			let singles = messages.filter(m => Date.now() - m.createdTimestamp >= maxBulkDeleteTime);

			await singleDeletions(singles.array(), newEditMessage);
		} else {
			await newEditMessage.edit(Command.success([[ 'Prune', 'Deleted a total of ' + deleted + ' Messages from <#' + channel.id + '>' ]]));
		}
	} else if (error != null) {
		await newEditMessage.edit(Command.error([
			[
				'Prune',
				[
					'An error occured bulk deleting!',
					error.message,
					'Attempting normal deletion in 5 seconds.'
				].join('\n')
			]
		]));

		await utils.asyncTimeout(5000);

		await singleDeletions(messages.array(), newEditMessage);
	}
}

async function singleDeletions(messages: Discord.Message[], editMessage: Discord.Message) {
	await editMessage.edit(Command.info([['Prune', 'Please wait...\nRemoving commands 1 by 1. Since they\'re older than 14 days they can\'t be bulk deleted.']]));

	await doSingles();

	let pos = 0;

	async function doSingles() {
		if (pos >= messages.length) {
			await editMessage.edit(Command.success([['Prune', 'Deleted messages.']])).catch(e => console.error(e));
			return Promise.resolve();
		}

		let message = messages[pos++];


		let [_, error] = await utils.asyncCatch(message.delete());

		if (error == null) {
			await utils.asyncTimeout(500);
			await doSingles();
		} else {
			console.error(error);

			await editMessage.edit(Command.error([
				[
					'Prune',
					[
						'An error occured deleting singles!',
						error.message
					].join('\n')
				]
			]));
		}

		return Promise.resolve();
	}
}

async function recreateChannel(sendingChannel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel, channelBeingRecreated: Discord.TextChannel) {
	let editMessage = await sendingChannel.send(Command.success([['Prune', 'Cloning channel']]));

	console.log('Clone');

	let newChannel = await channelBeingRecreated.clone({
		name: channelBeingRecreated.name,
		reason: '[PRUNE] Recreating channel.'
	});

	console.log('Pos');

	await editMessage.edit(Command.success([['Prune', 'Setting Channel Position']]));

	console.log('Parent');

	await newChannel.setParent(
		channelBeingRecreated.parent!,
		{
			reason: '[PRUNE] Recreating channel.'
		}
	);

	let perms = channelBeingRecreated.permissionOverwrites.array();

	for (let i = 0; i < perms.length; i++) {
		let perm = perms[i];

		await newChannel.overwritePermissions([perm], '[PRUNE] Recreating channel');

		await utils.asyncTimeout(200);
	}

	await channelBeingRecreated.delete('Recreating Channel');

	await newChannel.setPosition(channelBeingRecreated.position);
	// editMessage.edit(Command.success([['Prune', 'Recreated channel']]));
}


export = Prune;