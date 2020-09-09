import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.ignore',
	LIST: 'list',
	CLEAR: 'clear',
	CHANNEL: 'channel',
	USER: 'user'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Ignore extends Command {
	constructor() {
		super('ignore');

		this.description = 'Lets the bot know what to ignore.';
		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
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

		let type = params.shift()!;

		switch (type) {
			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMS.LIST)) return Command.noPermsMessage('Ignore');

				let mod = server.moderation;

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
			}

			case 'clear': {
				if (!this.hasPerms(message.member!, server, PERMS.CLEAR)) return Command.noPermsMessage('Ignore');

				let clearType = (params.shift() || '').toLowerCase();

				if (clearType == 'channel') {
					server.moderation.clearIgnoreList('channel');
				} else if (clearType == 'user') {
					server.moderation.clearIgnoreList('member');
				} else if (clearType == 'all') {
					server.moderation.clearIgnoreList('all');
				} else return Command.error([['Error on Clearing', 'Unknown clear option "' + clearType + '" Use: "channel", "user", "all"']]);

				await server.save();

				return Command.success([['Ingore', 'Cleared successfully.']]);
			}

			case 'channel': {
				if (!this.hasPerms(message.member!, server, PERMS.CHANNEL)) return Command.noPermsMessage('Ignore');

				let channelIdStr = params.shift();

				if (channelIdStr == null) return Command.error([['Ignore', 'Invalid ID.']]);

				let idType = server.idType(channelIdStr);

				if (idType != null && idType != 'channel') return Command.error([['Ignore', 'Not a valid channel.']]);

				let id = server.strpToId(channelIdStr);

				if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

				let channel = message.guild!.channels.cache.get(id);

				if (channel != null) {
					server.moderation.ignore('channel', id);
					await server.save();

					return Command.success([['Ignore', 'Now ignoring channel "' + channel.name + '"']]);
				} else {
					return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);
				}
			}

			case 'user': {
				if (!this.hasPerms(message.member!, server, PERMS.USER)) return Command.noPermsMessage('Ignore');

				let userIdStr = params.shift();

				if (userIdStr == null) return Command.error([['Ignore', 'Invalid Params.']]);

				let idType = server.idType(userIdStr);

				if (idType != null && idType != 'member') return Command.error([['Ignore', 'Not a valid User']]);

				let id = server.strpToId(userIdStr);

				if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

				let member = message.guild!.member(id);

				if (member != null) {
					server.moderation.ignore('member', id);
					await server.save();

					return Command.success([['Ignore', 'Now ignoring user "' + member.displayName + '"']]);
				} else {
					return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);
				}
			}

			case 'role': break;

			default: {
				let idType = server.idType(type);

				if (idType == 'member') {
					if (!this.hasPerms(message.member!, server, PERMS.USER)) return Command.noPermsMessage('Ignore');

					let id = server.strpToId(type);

					if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

					let member = message.guild!.member(id);

					if (member != null) {
						server.moderation.ignore('member', id);
						await server.save();

						return Command.success([['Ignore', 'I am now ignoring user "' + member.displayName + '"']]);
					} else {
						return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);
					}
				} else if (idType == 'channel') {
					if (!this.hasPerms(message.member!, server, PERMS.CHANNEL)) return Command.noPermsMessage('Ignore');

					let id = server.strpToId(type);

					if (id == null) return Command.error([['Ignore', 'Invalid ID.']]);

					let channel = message.guild!.channels.cache.get(id);

					if (channel != null) {
						server.moderation.ignore('channel', id);
						await server.save();

						return Command.success([['Ignore', 'I am now ignoring channel "#' + channel.name + '"']]);
					} else {
						return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);
					}
				} else {
					return Command.error([['Ignore', 'ID Type not valid.']]);
				}
			}
		}

		return Command.error([[
			'Ignore',
			'An Unknown error Occured.'
		]]);
	}
}


export = Ignore;