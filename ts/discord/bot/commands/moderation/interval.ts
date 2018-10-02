import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');


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

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// if (!this.hasPerms(message.member, server, PERMS.MAIN)) return Command.noPermsMessage('Interval');

class Interval extends Command {
	constructor() {
		super(['interval', 'every']);

		this.description = 'Sets a message to be called every so often.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var blacklisted = server.moderation.blacklisted;

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
			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Interval');

				return Command.info([
					[	'Interval List',
						server.intervals.length == 0 ? 'No intervals created' :
						Command.table(
							['ID', 'Status', 'Repeat'],
							server.intervals.map((i, index) => [(index + 1), i.active ? 'Active' : 'Disabled', i.every]))
					]
				]);
			case 'create':
				if (!this.hasPerms(message.member, server, PERMS.CREATE)) return Command.noPermsMessage('Interval');

				var minutes = parseInt(params[1]);
				if (isNaN(minutes)) return;
				if (message.channel.type != 'text') return;

				var pos = server.addInterval(minutes, message.guild.id, message.channel.id);
				server.save();

				return Command.info([
					[ 'Interval', 'Interval with ID ' + pos + ' created.\nSeconds set to ' + seconds ]
				]);
			default:
				var id = parseInt(params[0]);
				if (isNaN(id)) return Command.error([[ 'Interval', 'Invalid Interval ID.' ]]);

				switch (params[1]) {
					case 'remove':
						if (!this.hasPerms(message.member, server, PERMS.REMOVE)) return Command.noPermsMessage('Interval');

						server.removeInterval(id);
						server.save();

						return Command.info([
							[ 'Interval', 'Interval with ID ' + id + ' removed.' ]
						]);
					case 'toggle':
						if (!this.hasPerms(message.member, server, PERMS.TOGGLE)) return Command.noPermsMessage('Interval');

						var togglePos = server.toggleInterval(id);
						server.save();

						return Command.info([
							[ 'Interval', 'Interval with ID ' + id + ' is now ' + (togglePos ? 'Active' : 'Disabled') ]
						]);
					case 'set':
						var type = params[2];

						switch (type) {
							case 'minutes':
								if (!this.hasPerms(message.member, server, PERMS.SET_MINUTES)) return Command.noPermsMessage('Interval');

								var seconds = parseInt(params[3]);
								if (isNaN(seconds)) return Command.error([[ 'Interval', 'Invalid Seconds.' ]]);
								server.setIntervalTime(id, seconds);
								server.save();

								return Command.info([
									[ 'Interval', 'Interval ' + id + ' time update to ' + seconds + ' seconds.' ]
								]);
							case 'message':
								if (!this.hasPerms(message.member, server, PERMS.SET_MESSAGE)) return Command.noPermsMessage('Interval');

								var text = params.slice(3).join(' ');
								server.setIntervalMessage(id, text);
								server.save();

								return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							case 'name':
								if (!this.hasPerms(message.member, server, PERMS.SET_NAME)) return Command.noPermsMessage('Interval');

								var text = params.slice(3).join(' ');
								server.setIntervalName(id, text);
								server.save();

								return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							// ? case 'onCall': // TODO: SECURE IT
							// ? 	var text = params.slice(3).join(' ');
							// ? 	server.setIntervalEvent(id, 'onCall', text);
							// ? 	server.save();
							// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							// ? case 'onReset':
							// ? 	var text = params.slice(3).join(' ');
							// ? 	server.setIntervalEvent(id, 'onReset', text);
							// ? 	server.save();
							// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							// ! case 'beforeCall':
							// ! 	var text = params.slice(3).join(' ');
							// ! 	server.setIntervalEvent(id, 'beforeCall', text);
							// ! 	server.save();
							// ! 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
						}
						break;
				}
		}

		// return Command.success([['Blacklist', resp]]);
	}
}

export = Interval;