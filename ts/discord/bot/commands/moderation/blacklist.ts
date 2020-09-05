import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');
import { DiscordBot } from '@type-manager';

// TODO: Check names of people who type.

const PERMS = {
	MAIN: 'commands.blacklist',
	IGNORE: 'ignore',
	LIST: 'list',
	CLEAR: 'remove',
	ADD: 'add',
	ACTION: 'action'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Blacklist extends Command {
	constructor() {
		super('blacklist');

		this.description = 'Blacklist certain words.';

		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		let blacklisted = server.moderation.blacklisted;

		let cmdToCall = params.shift();

		if (cmdToCall == null) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'list [global/#channel]',
						'add <global/#channel> <word/url>',
						'remove <global/#channel/all> <text/all>',
						'action <global/#channel> <censor/delete>', // Paged <censor/delete/tempmute/warn>
					].map(b => server.getPrefix() + 'blacklist ' + b)
					.join('\n')
				]
			]);
		}

		switch (cmdToCall) {
			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMS.LIST)) return Command.noPermsMessage('Blacklist');

				let discChannelIdStr = params.shift();

				if (discChannelIdStr == null) {
					let blacklistedChannelIds = Object.keys(blacklisted);

					if (blacklistedChannelIds.length == 0) {
						return Command.info([
							[
								'Channels with Blacklists',
								'No channels have any blacklists in them.'
							]
						]);
					} else {
						await message.channel.send(Command.table([ 'Channel', 'Blacklist amount' ], blacklistedChannelIds.map(b => [b == 'global' ? 'global' : `<#${b}>`, blacklisted[b].items.length])));
						return Promise.resolve();
					}
				} else {
					let channelIdStripped = server.strpToId(discChannelIdStr);

					if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

					let channelBlacklisted = blacklisted[channelIdStripped];

					return Command.info([
						[
							'Blacklisted Items:',
							channelBlacklisted == null || channelBlacklisted.items.length == 0 ? 'None' : channelBlacklisted.items.map(b => ` - ${b}`).join('\n')
						]
					]);
				}
			}

			case 'remove': {
				if (!this.hasPerms(message.member!, server, PERMS.CLEAR)) return Command.noPermsMessage('Blacklist');

				let discChannelIdStr = params.shift();
				let fullCommand = params.join(' ');

				if (discChannelIdStr == null || fullCommand.length == 0) return Command.info([[ 'Blacklist', 'Invalid opts. Use: remove <global/#channel/all> <text/all>' ]]);

				let channelIdStripped = server.strpToId(discChannelIdStr);

				if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

				let channelBlacklisted = blacklisted[channelIdStripped];

				if (channelBlacklisted == null || channelBlacklisted.items.length == 0) {
					return Command.info([
						[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
					]);
				}

				if (channelIdStripped == 'all') {
					server.moderation.blacklisted = {};
				} else {
					if (fullCommand == 'all') {
						delete server.moderation.blacklisted[channelIdStripped];
					} else {
						let channel_blacklists = server.moderation.blacklisted[channelIdStripped];

						if (channel_blacklists == null) {
							return Command.info([
								[ 'Blacklist', 'There are no Blacklists for that channel!' ]
							]);
						} else {
							let indexOf = channel_blacklists.items.indexOf(fullCommand.toLowerCase());

							if (indexOf == -1) {
								return Command.info([
									[ 'Blacklist', 'Text does not exist in the Blacklist Channel/Global' ]
								]);
							} else {
								channel_blacklists.items.splice(indexOf, 1);
							}
						}
					}
				}

				await server.save();

				return Command.info([
					[
						'Blacklist',
						`Removed ${channelIdStripped == 'all' ? 'all' : '<#' + channelIdStripped + '>'} item(s) from blacklist.`
					]
				]);
			}

			case 'add': {
				if (!this.hasPerms(message.member!, server, PERMS.ADD)) return Command.noPermsMessage('Blacklist');

				let channelIdStripped = server.strpToId(params.shift());

				if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

				if (channelIdStripped != 'global') {
					let discordChannel = message.guild!.channels.cache.get(channelIdStripped);

					if (discordChannel == null || discordChannel.type != 'text') {
						return Command.error([
							[ 'Blacklist', 'That text channel does not exist in the guild!' ]
						]);
					}
				}

				if (server.moderation.blacklisted[channelIdStripped] != null && server.moderation.blacklisted[channelIdStripped].items.length == 25) {
					return Command.error([
						[ 'Blacklist', 'Sorry! You reached the current limit for Blacklisted words in a channel!' ]
					]);
				}

				let fullCommand = params.join(' ').trim().toLowerCase();

				if (!server.blacklist(channelIdStripped, fullCommand)) {
					return Command.error([
						[ 'Blacklist', 'That channel already has that word blacklisted!' ]
					]);
				}

				await server.save();

				return Command.success([[ 'Blacklist', 'Successfully blacklisted "' + fullCommand + '"' ]]);
			}

			case 'action': {
				if (!this.hasPerms(message.member!, server, PERMS.ACTION)) return Command.noPermsMessage('Blacklist');

				let channelIdStripped = server.strpToId(params.shift());
				let punishmentType = params.shift();

				if (channelIdStripped == null) {
					return Command.error([
						[ 'Blacklist', 'Invalad params. Please refer to help!' ]
					]);
				}

				let channelBlacklisted = blacklisted[channelIdStripped];

				if (channelBlacklisted == null || channelBlacklisted.items.length == 0) {
					return Command.info([
						[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
					]);
				}

				let action: DiscordBot.PunishmentTypes;

				if (punishmentType == 'censor') {
					action = { type: 'censor' };
				} else if (punishmentType == 'delete') {
					action = { type: 'delete' };
				} else {
					return Command.info([
						[ 'Blacklist', 'Punishment action not valid. Please use "censor" or "delete"' ]
					]);
				}

				server.blacklistPunishment(channelIdStripped, action);

				await server.save();

				return Command.info([
					[
						'Blacklist',
						'Edited Blacklist Punishment Action for channel ' + (channelIdStripped == 'global' ? 'global' : '<#' + channelIdStripped + '>')
					]
				]);
			}
		}

		return Promise.resolve();
	}

	public async onMessage(message: Discord.Message, server: DiscordServer) {
		if (!server.userHasPerm(message.member!, PERMS.IGNORE)) return false;

		let opts1 = dealWithBlacklists(server, 'global', message.content);
		let opts2 = dealWithBlacklists(server, message.channel.id, opts1.editedMessage);

		if (opts1.edited || opts2.edited) {
			await message.edit(opts2.editedMessage);

			return true;
		}

		return false;
	}

	public async onChannelDelete(channel: Discord.GuildChannel, server: DiscordServer) {
		if (server.moderation.blacklisted[channel.id] != null) {
			delete server.moderation.blacklisted[channel.id];
			await server.save();
		}

		return false;
	}
}

function dealWithBlacklists(server: DiscordServer, channel: string, message: string) {
	let blacklisted = server.moderation.blacklisted[channel];

	let edited = message;

	if (blacklisted == null || blacklisted.items.length == 0) return { edited: false, editedMessage: edited, type: null };

	if (blacklisted.punishment == null || blacklisted.punishment.type == 'censor') {
		blacklisted.items.forEach(word => edited = edited.replace(word, '*'.repeat(word.length)));
	}

	return { edited: edited != message, editedMessage: edited, type: blacklisted.punishment == null ? 'censor' : blacklisted.punishment.type };
}

export = Blacklist;