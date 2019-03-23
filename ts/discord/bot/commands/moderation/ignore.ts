import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.ignore',
	LIST: 'list',
	CLEAR: 'clear',
	CHANNEL: 'channel',
	USER: 'user'
};

for(var name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Ignore extends Command {
	constructor() {
		super('ignore');

		this.description = 'Lets the bot know what to ignore.';
		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'list',
						'clear <all/user/channel>',
						'channel [#channel]',
						'user [@user]',
						'role [@role] (Not implemented yet)',
						'[@user/#channel]'
					].map(s => server.getPrefix() + 'ignore ' + s).join('\n')
				]
			]);
		}

		var type = params.shift()!;

		switch (type) {
			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Ignore');

				var mod = server.moderation;

				return Command.success([
					[
						'Ignored Channels',
						mod.ignoredChannels.length == 0 ?
							'None' :
							mod.ignoredChannels.map(c => ' - <#' + c + '>').join('\n')
					],
					[
						'Ignored Users',
						mod.ignoredUsers.length == 0 ?
							'None' :
							mod.ignoredUsers.map(c => ' - <@' + c + '>').join('\n')
					]
				]);
			case 'clear':
				if (!this.hasPerms(message.member, server, PERMS.CLEAR)) return Command.noPermsMessage('Ignore');

				var clearType = (params.shift() || '').toLowerCase();

				if (clearType == 'channel') {
					server.clearIgnoreList('channel');
				} else if (clearType == 'user') {
					server.clearIgnoreList('member');
				} else if (clearType == 'all') {
					server.clearIgnoreList('all');
				} else return Command.error([['Error on Clearing', 'Unknown clear option "' + clearType + '" Use: "channel", "user", "all"']]);

				server.save();

				break;
			case 'channel':
				if (!this.hasPerms(message.member, server, PERMS.CHANNEL)) return Command.noPermsMessage('Ignore');

				var channelIdStr = params.shift();

				if (channelIdStr == null) return Command.error([['Ignore', 'Invalid ID.']]);

				var idType = server.idType(channelIdStr);

				if (idType != null && idType != 'channel') return Command.error([['Ignore', 'Not a valid channel.']]);

				var id = server.strpToId(channelIdStr);

				if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

				var channel = message.guild.channels.get(id);

				if (channel != null) {
					server.ignore('channel', id);
					server.save();

					return Command.success([['Ignore', 'Now ignoring channel "' + channel.name + '"']]);
				} else return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);

			case 'user':
				if (!this.hasPerms(message.member, server, PERMS.USER)) return Command.noPermsMessage('Ignore');

				var userIdStr = params.shift();

				if (userIdStr == null) return Command.error([['Ignore', 'Invalid Params.']]);

				var idType = server.idType(userIdStr);

				if (idType != null && idType != 'member') return Command.error([['Ignore', 'Not a valid User']]);

				var id = server.strpToId(userIdStr);

				if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

				var member = message.guild.member(id);

				if (member != null) {
					server.ignore('member', id);
					server.save();

					return Command.success([['Ignore', 'Now ignoring user "' + member.displayName + '"']]);
				} else return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);

			case 'role': break;

			default:
				var idType = server.idType(type);

				if (idType == 'member') {
					if (!this.hasPerms(message.member, server, PERMS.USER)) return Command.noPermsMessage('Ignore');

					var id = server.strpToId(type);

					if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

					var member = message.guild.member(id);

					if (member != null) {
						server.ignore('member', id);
						server.save();

						return Command.success([['Ignore', 'I am now ignoring user "' + member.displayName + '"']]);
					} else return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);
				} else if (idType == 'channel') {
					if (!this.hasPerms(message.member, server, PERMS.CHANNEL)) return Command.noPermsMessage('Ignore');

					var id = server.strpToId(type);

					if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

					var channel = message.guild.channels.get(id);

					if (channel != null) {
						server.ignore('channel', id);
						server.save();

						return Command.success([['Ignore', 'I am now ignoring channel "#' + channel.name + '"']]);
					} else return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);
				} else {
					return Command.error([['Ignore', 'ID Type not valid.']]);
				}
		}

		return Command.error([[
			'Ignore',
			'An Unknown error Occured.'
		]]);
	}
}


export = Ignore;