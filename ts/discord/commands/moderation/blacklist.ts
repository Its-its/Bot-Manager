import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.blacklist',
	IGNORE: 'ignore',
	LIST: 'list',
	CLEAR: 'remove',
	ADD: 'add',
	ACTION: 'action'
};

for(var name in PERMS) {
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

		var param_1 = params.shift();

		if (param_1 == null) {
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

		if (param_1 == 'list') {
			if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Blacklist');

			var channel = params.shift();

			if (channel == null) {
				var channels_ids = Object.keys(blacklisted);

				return Command.info([
					[
						'Channels with Blacklists',
						channels_ids.length == 0
						? 'None'
						: channels_ids.map(b => ` - ${b == 'global' ? 'global' : `<#${b}>`} - Blacklisted Count: ${blacklisted[b].items.length}`).join('\n')
					]
				]);
			} else {
				var channel_id = server.strpToId(channel);

				var channelBlacklist = blacklisted[channel_id];

				return Command.info([
					[
						'Blacklisted Items:',
						channelBlacklist == null || channelBlacklist.items.length == 0 ? 'None' : channelBlacklist.items.map(b => ` - ${b}`).join('\n')
					]
				]);
			}
		} else if (param_1 == 'remove') {
			if (!this.hasPerms(message.member, server, PERMS.CLEAR)) return Command.noPermsMessage('Blacklist');

			var channel = params.shift();
			var text = params.join(' ');
			if (channel == null || text.length == 0) return Command.info([[ 'Blacklist', 'Invalid opts. Use: remove <global/#channel/all> <text/all>' ]]);

			var channel_id = server.strpToId(channel);

			var channelBlacklist = blacklisted[channel_id];

			if (channelBlacklist == null || channelBlacklist.items.length == 0) {
				return Command.info([
					[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
				]);
			}

			if (channel_id == 'all') {
				server.moderation.blacklisted = {};
			} else {
				if (text == 'all') {
					delete server.moderation.blacklisted[channel_id];
				} else {
					var channel_blacklists = server.moderation.blacklisted[channel_id];

					if (channel_blacklists == null) {
						return Command.info([
							[ 'Blacklist', 'There are no Blacklists for that channel!' ]
						]);
					} else {
						var indexOf = channel_blacklists.items.indexOf(text.toLowerCase());

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
					`Removed ${channel_id == 'all' ? 'all' : '<#' + channel_id + '>'} item(s) from blacklist.`
				]
			]);
		} else if (param_1 == 'add') {
			if (!this.hasPerms(message.member, server, PERMS.ADD)) return Command.noPermsMessage('Blacklist');

			var channel_id = server.strpToId(params.shift());

			if (channel_id == null) {
				return Command.error([
					[ 'Blacklist', 'Invalad params. Please refer to help!' ]
				]);
			} else {
				if (channel_id != 'global') {
					var channelT = message.guild.channels.get(channel_id);

					if (channelT == null || channelT.type != 'text') {
						return Command.error([
							[ 'Blacklist', 'That text channel does not exist in the guild!' ]
						]);
					}
				}
			}

			if (server.moderation.blacklisted[channel_id] != null && server.moderation.blacklisted[channel_id].items.length == 25) {
				return Command.error([
					[ 'Blacklist', 'Sorry! You reached the current limit for Blacklisted words in a channel!' ]
				]);
			}

			var word = params.join(' ').trim().toLowerCase();

			var resp = 'Successfully blacklisted "' + word + '"';

			if (!server.blacklist(channel_id, word)) {
				// resp = 'Successfully removed "' + word + '" from blacklist.';
				return Command.error([
					[ 'Blacklist', 'That channel already has that word blacklisted!' ]
				]);
			}

			server.save();

			return Command.success([[ 'Blacklist', resp ]]);
		} else if (param_1 == 'action') {
			if (!this.hasPerms(message.member, server, PERMS.ACTION)) return Command.noPermsMessage('Blacklist');

			var channel_id = server.strpToId(params.shift());
			var action_text = params.shift();

			if (channel_id == null) {
				return Command.error([
					[ 'Blacklist', 'Invalad params. Please refer to help!' ]
				]);
			}

			var channelBlacklist = blacklisted[channel_id];

			if (channelBlacklist == null || channelBlacklist.items.length == 0) {
				return Command.info([
					[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
				]);
			}

			var action: DiscordBot.PunishmentTypes = null;

			if (action_text == 'censor') {
				action = { type: 'censor' };
			} else if (action_text == 'delete') {
				action = { type: 'delete' };
			} else {
				return Command.info([
					[ 'Blacklist', 'Action not valid. Please use "censor" or "delete"' ]
				]);
			}

			server.blacklistPunishment(channel_id, action);

			server.save();

			return Command.info([
				[
					'Blacklist',
					'Edited Blacklist Punishment Action for channel ' + (channel_id == 'global' ? 'global' : '<#' + channel_id + '>')
				]
			]);
		}
	}

	static onMessage(message: Discord.Message, server: DiscordServer) {
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

	static onChannelDelete(channel: Discord.Channel, server: DiscordServer) {
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