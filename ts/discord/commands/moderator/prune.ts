import Command = require('../../command');

import Discord = require('discord.js');

const maxBulkDeleteTime = (1000 * 60 * 60 * 24 * 14);

class Prune extends Command {
	constructor() {
		super('prune', true, false);

		this.description = 'Prunes a channel.';

		this.perms = [
			'commands.prune'
		].concat([
			'user',
			'channel'
		].map(i => 'commands.prune.' + i));
	}

	public call(params, server, message) {
		if (!this.hasPerms([ 'MANAGE_MESSAGES' ], message.member)) {
			return send(Command.error([['Prune', 'Missing Manage Messages Perms!']])).catch(e => console.error(e));
		}

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						// 'user <id/@> [<=100]',
						'channel [id/#] [all/<=100]'
					].map(b => server.getPrefix() + 'prune ' + b).join('\n')
				]
			]);
		}

		switch(params.shift()) {
			case 'user': break;
			case 'channel':
				var id = server.strpToId(params.shift());
				var reason = params.shift();
				var limit = 100;

				if (id == null) {
					id = message.channel.id;
				} else if (reason != 'all') {
					limit = parseInt(reason);
					if (Number.isNaN(limit)) limit = 100;
					if (message.channel.id == id) limit++;
					if (limit > 100) limit = 100;
				}

				var channel = <Discord.TextChannel>message.guild.channels.get(id);

				if (channel == null) return Command.error([[ 'Prune', 'Channel does not exist!' ]]);
				if (channel.type != 'text') return Command.error([[ 'Prune', 'Channel must be text only!' ]]);

				if (reason == 'all') {
					if (!this.hasPerms([ 'MANAGE_CHANNELS' ], message.member)) {
						return send(Command.error([['Prune', 'Missing Manage Channels Perms!']])).catch(e => console.error(e));
					}
					return recreateChannel(channel);
				}

				send(Command.info([['Prune', 'Fetching Messages']]))
				.then((editMessage) => {
					fetchMessages(channel, limit, Array.isArray(editMessage) ? editMessage[0] : editMessage);
				}, (err) => {
					console.error(err);
					send(Command.error([['Prune', 'An error occured! Please try again in a few seconds.']]));
				});
			break;
		}

		function fetchMessages(channel: Discord.TextChannel, limit: number, editMessage: Discord.Message) {
			channel.fetchMessages({ limit: limit })
			.then((messages) => {
				messages = messages.filter(m => m.id != editMessage.id);

				var filtered = messages.filter(m => Date.now() - m.createdTimestamp < maxBulkDeleteTime);

				// TODO: Instead of replacing, append message?
				editMessage.edit(Command.info([['Prune', 'Bulk Deleting messages.']]))
				.then(editMessage => {
					channel.bulkDelete(filtered)
					.then(() => {
						var deleted = filtered.size;

						if (deleted != messages.size) {
							var singles = messages.filter(m => Date.now() - m.createdTimestamp >= maxBulkDeleteTime);
							singleDeletions(singles.array(), editMessage);
							return;
						}

						editMessage.edit(Command.success([[ 'Prune', 'Deleted a total of ' + deleted + ' Messages from <#' + id + '>' ]]));
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

			var pos = 0;

			function doSingles() {
				if (pos >= messages.length) return editMessage.edit(Command.success([['Prune', 'Deleted messages.']])).catch(e => console.error(e));

				var message = messages[pos++];

				message.delete()
				.then(() => doSingles(),
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

		function recreateChannel(channel: Discord.TextChannel) {
			send(Command.success([['Prune', 'Cloning channel']]))
			.then((editMessage: any) => {
				editMessage = Array.isArray(editMessage) ? editMessage[0] : editMessage;

				channel.clone(channel.name, true, true, 'Recreating channel.')
				.then(newChannel => {
					editMessage.edit(Command.success([['Prune', 'Setting Channel Position']]));

					newChannel.setParent(channel.parent, 'Recreating channel.');

					// TODO: Permissions

					channel.delete('Recreating Channel')
					.then(() => {

						newChannel.setPosition(channel.position)
						.then(() => {
							editMessage.edit(Command.success([['Prune', 'Recreated channel']]));
						}, e => console.error(e));
					}, e => console.error(e));
				}, e => console.error(e));
			}, e => console.error(e));
		}

		function send(str: any, cb?: (err: Error, message?: Discord.Message | Discord.Message[]) => any) {
			var msg = message.channel.send(new Discord.RichEmbed(str.embed));

			if (cb != null) msg.then(msg => cb(null, msg), e => cb(e));

			return msg;
		}
	}
}

export = Prune;