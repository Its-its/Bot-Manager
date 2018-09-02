import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.blacklist',
	IGNORE: 'ignore',
	LIST: 'list',
	CLEAR: 'remove',
	ADD: 'add'
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
						'list',
						'add <word/url>',
						'remove <#/id>',
						// 'action <#/id> <censor/delete/tempmute/warn>', // Paged
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
						channels_ids.length == 0 ? 'None' : channels_ids.map(b => ` - <#${b}> - Blacklisted Count: ${blacklisted[b].length}`).join('\n')
					]
				]);
			} else {
				var channel_id = server.strpToId(channel);

				var items = blacklisted[channel_id];

				return Command.info([
					[
						'Blacklisted Items:',
						items == null || items.length == 0 ? 'None' : items.map(b => ` - ${b}`).join('\n')
					]
				]);
			}
		} else if (param_1 == 'remove') {
			if (!this.hasPerms(message.member, server, PERMS.CLEAR)) return Command.noPermsMessage('Blacklist');

			var channel = params.shift();
			if (channel == null) return Command.info([[ 'Blacklist', 'Invalid opts. Use remove <id/#/all>' ]]);

			var channel_id = server.strpToId(channel);

			var items = blacklisted[channel_id];

			if (items == null || items.length == 0) {
				return Command.info([
					[ 'Blacklist', 'Blacklist already empty! You can\'t remove what\'s not there!' ]
				]);
			}

			if (channel_id == 'all') {
				server.moderation.blacklisted = {};
			} else {
				delete server.moderation.blacklisted[channel_id];
			}

			server.save();

			return Command.info([
				[
					'Blacklist',
					`Cleared ${channel_id == 'all' ? 'all' : '<#' + channel_id + '>'} items from blacklist.`
				]
			]);
		} else if (param_1 == 'add') {
			if (!this.hasPerms(message.member, server, PERMS.ADD)) return Command.noPermsMessage('Blacklist');

			var word = params.join(' ').trim();

			var resp = 'Successfully blacklisted "' + word + '"';

			if (!server.blacklist(message.channel.id, word)) {
				resp = 'Successfully removed "' + word + '" from blacklist.';
			}

			server.save();

			return Command.success([['Blacklist', resp]]);
		}
	}

	static onMessage(message: Discord.Message, server: DiscordServer) {
		if (!server.userHasPerm(message.member, PERMS.IGNORE)) return false;

		var blacklisted = server.moderation.blacklisted[message.channel.id];

		if (blacklisted == null || blacklisted.length == 0) return false;

		var edited = message.content;

		blacklisted.forEach(word => edited = edited.replace(word, '*'.repeat(word.length)));

		if (edited != message.content) {
			message.edit(edited)
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

export = Blacklist;