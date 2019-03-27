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

for(var name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Blacklist extends Command {
	constructor() {
		super('blacklist');

		this.description = 'Blacklist certain words.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var blacklisted = server.moderation.blacklisted;

		var cmdToCall = params.shift();

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

		if (cmdToCall == 'list') {
			if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Blacklist');

			var discChannelIdStr = params.shift();

			if (discChannelIdStr == null) {
				var blacklistedChannelIds = Object.keys(blacklisted);

				if (blacklistedChannelIds.length == 0) {
					return Command.info([
						[
							'Channels with Blacklists',
							'No channels have any blacklists in them.'
						]
					]);
				} else {
					message.channel.send(Command.table([ 'Channel', 'Blacklist amount' ], blacklistedChannelIds.map(b => [b == 'global' ? 'global' : `<#${b}>`, blacklisted[b].items.length])));
					return;
				}
			} else {
				var channelIdStripped = server.strpToId(discChannelIdStr);

				if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

				var channelBlacklisted = blacklisted[channelIdStripped];

				return Command.info([
					[
						'Blacklisted Items:',
						channelBlacklisted == null || channelBlacklisted.items.length == 0 ? 'None' : channelBlacklisted.items.map(b => ` - ${b}`).join('\n')
					]
				]);
			}
		} else if (cmdToCall == 'remove') {
			if (!this.hasPerms(message.member, server, PERMS.CLEAR)) return Command.noPermsMessage('Blacklist');

			var discChannelIdStr = params.shift();
			var fullCommand = params.join(' ');

			if (discChannelIdStr == null || fullCommand.length == 0) return Command.info([[ 'Blacklist', 'Invalid opts. Use: remove <global/#channel/all> <text/all>' ]]);

			var channelIdStripped = server.strpToId(discChannelIdStr);

			if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

			var channelBlacklisted = blacklisted[channelIdStripped];

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
					var channel_blacklists = server.moderation.blacklisted[channelIdStripped];

					if (channel_blacklists == null) {
						return Command.info([
							[ 'Blacklist', 'There are no Blacklists for that channel!' ]
						]);
					} else {
						var indexOf = channel_blacklists.items.indexOf(fullCommand.toLowerCase());

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

			server.save();

			return Command.info([
				[
					'Blacklist',
					`Removed ${channelIdStripped == 'all' ? 'all' : '<#' + channelIdStripped + '>'} item(s) from blacklist.`
				]
			]);
		} else if (cmdToCall == 'add') {
			if (!this.hasPerms(message.member, server, PERMS.ADD)) return Command.noPermsMessage('Blacklist');

			var channelIdStripped = server.strpToId(params.shift());

			if (channelIdStripped == null) return Command.error([['Channel', 'Invalid Channel ID']]);

			if (channelIdStripped != 'global') {
				var discordChannel = message.guild.channels.get(channelIdStripped);

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

			var fullCommand = params.join(' ').trim().toLowerCase();

			if (!server.blacklist(channelIdStripped, fullCommand)) {
				return Command.error([
					[ 'Blacklist', 'That channel already has that word blacklisted!' ]
				]);
			}

			server.save();

			return Command.success([[ 'Blacklist', 'Successfully blacklisted "' + fullCommand + '"' ]]);
		} else if (cmdToCall == 'action') {
			if (!this.hasPerms(message.member, server, PERMS.ACTION)) return Command.noPermsMessage('Blacklist');

			var channelIdStripped = server.strpToId(params.shift());
			var punishmentType = params.shift();

			if (channelIdStripped == null) {
				return Command.error([
					[ 'Blacklist', 'Invalad params. Please refer to help!' ]
				]);
			}

			var channelBlacklisted = blacklisted[channelIdStripped];

			if (channelBlacklisted == null || channelBlacklisted.items.length == 0) {
				return Command.info([
					[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
				]);
			}

			var action: DiscordBot.PunishmentTypes;

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

			server.save();

			return Command.info([
				[
					'Blacklist',
					'Edited Blacklist Punishment Action for channel ' + (channelIdStripped == 'global' ? 'global' : '<#' + channelIdStripped + '>')
				]
			]);
		}
	}

	public onMessage(message: Discord.Message, server: DiscordServer) {
		if (!server.userHasPerm(message.member, PERMS.IGNORE)) return false;


		var opts1 = dealWithBlacklists(server, 'global', message.content);
		var opts2 = dealWithBlacklists(server, message.channel.id, opts1.editedMessage);

		if (opts1.edited || opts2.edited) {
			message.edit(opts2.editedMessage)
			.catch(e => console.error(e));

			return true;
		}

		return false;
	}

	public onChannelDelete(channel: Discord.GuildChannel, server: DiscordServer) {
		if (server.moderation.blacklisted[channel.id] != null) {
			delete server.moderation.blacklisted[channel.id];
			server.save();
		}

		return false;
	}
}

function dealWithBlacklists(server: DiscordServer, channel: string, message: string) {
	var blacklisted = server.moderation.blacklisted[channel];

	var edited = message;

	if (blacklisted == null || blacklisted.items.length == 0) return { edited: false, editedMessage: edited, type: null };

	if (blacklisted.punishment == null || blacklisted.punishment.type == 'censor') {
		blacklisted.items.forEach(word => edited = edited.replace(word, '*'.repeat(word.length)));
	}

	return { edited: edited != message, editedMessage: edited, type: blacklisted.punishment == null ? 'censor' : blacklisted.punishment.type };
}

export = Blacklist;