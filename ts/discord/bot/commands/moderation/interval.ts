import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';


const PERMS = {
	MAIN: 'commands.interval',
	LIST: 'list',
	CREATE: 'create',
	REMOVE: 'remove',
	TOGGLE: 'toggle',
	SET: 'set',
	SET_MINUTES:'set.minutes',
	SET_MESSAGE: 'set.message',
	SET_NAME: 'set.name'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Interval extends Command {
	constructor() {
		super(['interval', 'every']);

		this.description = 'Sets a message to be called every so often.';

		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[	'list',
						'create <minutes>',
						'<id> remove',
						'<id> toggle',
						'<id> set minutes <minutes>',
						'<id> set message <text>',
						'<id> set name <text>',
						// '<id> set onCall <text>',
						// '<id> set onReset <text>'
					].map(b => server.getPrefix() + 'interval ' + b)
					.join('\n')
				]
			]);
		}

		switch (params[0]) {
			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMS.LIST)) return Command.noPermsMessage('Interval');

				if (server.intervals.items.length == 0) {
					return Command.info([
						[	'Interval List',
							'No intervals created'
						]
					]);
				} else {
					await message.channel.send(
						Command.table(
							['ID', 'Status', 'Repeat Time'],
							server.intervals.items.map(
								(i, index) => [
									(index + 1),
									i.active ? 'Active' : 'Disabled',
									i.every
								]
							)
						)
					);

					break;
				}
			}

			case 'create': {
				if (!this.hasPerms(message.member!, server, PERMS.CREATE)) return Command.noPermsMessage('Interval');

				let minutes = parseInt(params[1]);
				if (isNaN(minutes)) return Command.error([[ 'Interval', 'Invalid number.' ]]);

				if (message.channel.type != 'text') return Command.error([[ 'Interval', 'Channel is not a text channel.' ]]);

				let pos = await server.intervals.addInterval(minutes, message.guild!.id, message.channel.id);

				await server.save();

				return Command.info([
					[ 'Interval', 'Interval with ID ' + pos + ' created.\nMinutes set to ' + minutes ]
				]);
			}

			default: {
				let intervalId = parseInt(params[0]);

				if (isNaN(intervalId)) return Command.error([[ 'Interval', 'Invalid Interval ID.' ]]);

				switch (params[1]) {
					case 'remove': {
						if (!this.hasPerms(message.member!, server, PERMS.REMOVE)) return Command.noPermsMessage('Interval');

						await server.intervals.removeInterval(intervalId);

						await server.save();

						return Command.info([
							[ 'Interval', 'Interval with ID ' + intervalId + ' removed.' ]
						]);
					}

					case 'toggle': {
						if (!this.hasPerms(message.member!, server, PERMS.TOGGLE)) return Command.noPermsMessage('Interval');

						let togglePos = await server.intervals.toggleInterval(intervalId);

						await server.save();

						return Command.info([
							[ 'Interval', 'Interval with ID ' + intervalId + ' is now ' + (togglePos ? 'Active' : 'Disabled') ]
						]);
					}

					case 'set': {
						let setType = params[2];

						switch (setType) {
							case 'minutes': {
								if (!this.hasPerms(message.member!, server, PERMS.SET_MINUTES)) return Command.noPermsMessage('Interval');

								let seconds = parseInt(params[3]);
								if (isNaN(seconds)) return Command.error([[ 'Interval', 'Invalid Seconds.' ]]);

								await server.intervals.setIntervalTime(intervalId, seconds);

								await server.save();

								return Command.info([
									[ 'Interval', 'Interval ' + intervalId + ' time update to ' + seconds + ' seconds.' ]
								]);
							}

							case 'message': {
								if (!this.hasPerms(message.member!, server, PERMS.SET_MESSAGE)) return Command.noPermsMessage('Interval');

								let text = params.slice(3).join(' ');

								await server.intervals.setIntervalMessage(intervalId, text);

								await server.save();

								return Command.info([[ 'Interval', 'Interval ' + intervalId + ' updated.' ]]);
							}

							case 'name': {
								if (!this.hasPerms(message.member!, server, PERMS.SET_NAME)) return Command.noPermsMessage('Interval');

								let text = params.slice(3).join(' ');

								await server.intervals.setIntervalName(intervalId, text);

								await server.save();

								return Command.info([[ 'Interval', 'Interval ' + intervalId + ' updated.' ]]);
							}
							// ? case 'onCall': // TODO: SECURE IT
							// ? 	let text = params.slice(3).join(' ');
							// ? 	server.setIntervalEvent(id, 'onCall', text);
							// ? 	server.save();
							// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							// ? case 'onReset':
							// ? 	let text = params.slice(3).join(' ');
							// ? 	server.setIntervalEvent(id, 'onReset', text);
							// ? 	server.save();
							// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							// ! case 'beforeCall':
							// ! 	let text = params.slice(3).join(' ');
							// ! 	server.setIntervalEvent(id, 'beforeCall', text);
							// ! 	server.save();
							// ! 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
						}

						break;
					}
				}
			}
		}

		return Promise.resolve();
	}
}

export = Interval;