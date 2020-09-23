import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';


const PERMS = {
	MAIN: 'commands.logs',
	CHANNEL: 'channel',
	FILTER: 'filter',
	FILTER_LIST: 'filter.list',
	FILTER_ADD: 'filter.add',
	FILTER_REMOVE: 'filter.remove'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Logs extends Command {
	constructor() {
		super(['logs', 'log', 'logging']);

		this.perms = Object.values(PERMS);
		this.description = 'Logs filtered items to specified channel.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('logs')) return Command.error([['Error', 'Please enable Logs Plugin!']]);

		if (params.length == 0) {
			return Command.info([
				[
					'Command Usage',
					[
						'list',
						'output [id/@channel]',
						'filter list',
						'filter add',
						'filter remove',
						'priority <id/#channel> [#]'
					].map(b => server.getPrefix() + 'logs ' + b).join('\n')
				]
			]);
		}

		if (server.plugins.logs!.channels == null) {
			server.plugins.logs!.channels = [];
		}

		switch(params.shift()) {
			case 'list': {
				await message.channel.send(Command.info([
					[
						'Logs',
						server.plugins.logs!.channels.length == 0 ?
						'Your not logging to any channels.' :
						server.plugins.logs!.channels
						.map(c => {
							return [
								`Logging into Channel: ${c.id}`,
								`Priority: ${c.priority == null ? 0 : c.priority}`,
								c.filterChannels == null ? 'Watching ALL Channels' : `Watching Channels:\n${c.filterChannels.map(c => ` - ${c}`).join('\n')}\n`,
								// c.filterMembersAddRemove == null ? null : `Watching For Members Add/Remove: ${c.filterMembersAddRemove}`
							]
							.filter(i => i != null)
							.join('\n');
						})
						.join('\n')
					]
				]));
				break;
			}

			case 'priority': {
				let channelId = params.shift();

				if (channelId == null) channelId = message.channel.id;
				else {
					let stripped = server.strpToId(channelId);
					if (stripped == null) return Command.error([['Logs', 'ID is not valid.']]);
					channelId = stripped;
				}

				if (!message.guild!.channels.cache.has(channelId)) return Command.error([['Logs', 'ID is not a channel.']]);

				let log_channel = server.plugins.logs!.channels.find(c => c.id == channelId);

				if (log_channel == null) return Command.error([['Logs', 'Channel is not being monitored!']]);

				let amount = params.shift();

				if (amount != null) {
					let as_num = parseInt(amount);

					if (isNaN(as_num)) {
						return Command.info([
							[ 'Logs', 'Priority is not a valid number "' + amount + '"']
						]);
					} else {
						if (as_num == 0) {
							delete log_channel['priority'];
						} else {
							log_channel.priority = as_num;
						}

						await server.save();

						return Command.info([
							[ 'Logs', 'Priority now set to "' + as_num + '"']
						]);
					}
				} else {
					return Command.info([
						[ 'Logs', `The current priority is ${log_channel.priority == null ? 0 : log_channel.priority}` ]
					]);
				}
			}

			case 'output': {
				if (!this.hasPerms(message.member!, server, PERMS.CHANNEL)) return Command.noPermsMessage('Logs');

				let channelId = params.shift();

				if (channelId == null) channelId = message.channel.id;
				else {
					let stripped = server.strpToId(channelId);
					if (stripped == null) return Command.error([['Logs', 'ID is not valid.']]);
					channelId = stripped;
				}

				if (!message.guild!.channels.cache.has(channelId)) return Command.error([['Logs', 'ID is not a channel.']]);

				let index = server.plugins.logs!.channels.findIndex(c => c.id == channelId);
				if (index != -1) {
					// Remove Channel
					await message.channel.send(Command.info([
						[ 'Logs', 'I an no longer listening to the channel. :(' ]
					]));

					server.plugins.logs!.channels.splice(index, 1);
				} else {
					// Add Channel
					if (channelId == message.channel.id) {
						await message.channel.send(Command.info([
							[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
						]));
					} else {
						let channel = <Discord.TextChannel>message.guild!.channels.cache.get(channelId);

						if (channel == null) return Command.error([[ 'Logs', 'Channel with that ID does not exist!' ]]);
						if (channel.type != 'text')  return Command.error([[ 'Logs', 'Channel is not a text channel!' ]]);

						await channel.send(Command.info([
							[ 'Logs', 'I am now listening for events and outputting them to this channel. :)' ]
						]));
					}

					server.plugins.logs!.channels.push({
						id: channelId
					});
				}

				await server.save();

				break;
			}

			case 'filter': {
				if (!this.hasPerms(message.member!, server, PERMS.MAIN)) return Command.noPermsMessage('Logs');

				switch (params.shift()) {
					case 'list': {
						await message.channel.send(Command.info([
							[
								'Logs | Filter List',
								[
									'filter channel <log channel id> <clear/channel id/category id>'
								].join('\n')
							]
						]));
						break;
					}

					case 'channel': {
						let log_channel_id = params.shift();

						if (log_channel_id == null) log_channel_id = message.channel.id;
						else {
							let stripped = server.strpToId(log_channel_id);
							if (stripped == null) return Command.error([['Logs', 'ID is not valid.']]);
							log_channel_id = stripped;
						}

						if (!message.guild!.channels.cache.has(log_channel_id)) return Command.error([['Logs', 'ID is not a channel.']]);

						let log_channel = server.plugins.logs!.channels.find(c => c.id == log_channel_id);

						if (log_channel == null) return Command.error([['Logs', 'Channel is not being monitored!']]);

						let filter_channel_id = params.shift();

						if (filter_channel_id == 'clear') {
							delete log_channel['filterChannels'];

							await message.channel.send(Command.info([
								[ 'Logs', 'Cleared Filtered Channels' ]
							]));
						} else {
							if (filter_channel_id == null) filter_channel_id = message.channel.id;
							else {
								let stripped = server.strpToId(filter_channel_id);
								if (stripped == null) return Command.error([['Logs', 'Filter Channel ID is not valid.']]);
								filter_channel_id = stripped;
							}

							if (!message.guild!.channels.cache.has(filter_channel_id)) {
								return Command.error([['Logs', 'Filtering Channel ID is not a channel.']]);
							}

							if (log_channel.filterChannels == null) {
								log_channel.filterChannels = [];
							}

							let index_of = log_channel.filterChannels.indexOf(filter_channel_id);

							if (index_of == -1) {
								log_channel.filterChannels.push(filter_channel_id);

								await message.channel.send(Command.info([
									[ 'Logs', `Updated ${log_channel_id}, added channel ${filter_channel_id} to watch list.` ]
								]));
							} else {
								log_channel.filterChannels!.splice(index_of, 1);

								if (log_channel.filterChannels.length == 0) {
									delete log_channel['filterChannels'];
								}

								await message.channel.send(Command.info([
									[ 'Logs', `Updated ${log_channel_id}, removed channel ${filter_channel_id} from watch list.` ]
								]));
							}
						}

						await server.save();

						break;
					}
				}

				break;
			}
		}

		return Promise.resolve();
	}
}

export = Logs;