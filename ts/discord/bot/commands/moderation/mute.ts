import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');


import generate = require('nanoid/generate');

import Command = require('../../command');

import Punishments = require('../../../models/punishments');
import TempPunishments = require('../../../models/temp_punishments');


const PERMS = {
	MAIN: 'commands.mute'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


const MAX_SECONDS = parseTime('1y');
const MIN_SECONDS = parseTime('5m');

class Mute extends Command {
	constructor() {
		super('mute');

		this.perms = Object.values(PERMS);

		this.description = 'Permanently mute and temp-mute members.';
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Mute',
					[
						'@user [reason]',
						'@user <duration> [reason]',
						'',
						'**Duration Examples:**',
						' — **1w2d** - 1 Week 2 Days',
						' — **1w** - 1 Week',
						' — **1d** - 1 Day',
						' — **24h** - 1 Day',
						' — **5m** - 5 Minutes'
					].join('\n')
				]
			]);
		}

		if (server.punishments.punished_role_id == null) {
			return Command.error([
				[
					'Mute',
					[
						'Unable to mute anybody since the punished role is not set.',
						'There are _two ways_ you can set up the punished role:',
						' — **Manually**',
						' — \tpunishment settings punished_role @role/id',
						' — **Automatically**',
						' — \tpunishment settings punished_role auto'
					].join('\n')
				]
			]);
		}

		var user_str = params.shift();

		var type_user = server.idType(user_str);

		if (type_user != 'member') return Command.error([[ 'Mute', 'Invalid args. Please refer to mute help.' ]]);

		var user_id = server.strpToId(user_str);

		var time_str = params.shift();

		var reason = params.join(' ');

		var seconds = parseTime(time_str);

		if (seconds == null) {
			reason = time_str + reason;
		} else {
			if (seconds < MIN_SECONDS) return Command.error([[ 'Mute', 'Minimum mute time is 5 minutes.' ]]);
			if (seconds > MAX_SECONDS) return Command.error([[ 'Mute', 'Max mute time is 1 year.' ]]);
		}

		message.guild.member(user_id)
		.addRole(server.punishments.punished_role_id, 'Punished [Mute]');

		new Punishments({
			server_id: message.guild.id,
			member_id: user_id,
			creator_id: message.member.id,

			pid: generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 6),

			type: 'mute',
			length: seconds == null ? undefined : seconds,
			expires: seconds == null ? undefined : Date.now() + (seconds * 1000),

			reason: reason
		}).save((err, item) => {
			if (err != null) {
				return console.error(err);
			}

			if (seconds != null) {
				// IDEA: Check to see if punishment uses same role (if currently punished)
				TempPunishments.updateOne(
					{
						server_id: message.guild.id,
						member_id: user_id
					},
					{
						$set: {
							server_id: message.guild.id,
							member_id: user_id,
							punishment: item._id,
							expires: Date.now() + (seconds * 1000)
						}
					},
					{
						upsert: true
					}
				).exec();
			}
		});

		// TODO: Return punishment count, and improve stuffs.
		return Command.success([
			[
				'Mute',
				[
					'**Muted:** <@' + user_id + '>',
					'**Length:** ' + (seconds == -1 ? 'Forever' : time_str),
					'**Reason:** ' + reason
				].join('\n')
			]
		]);
	}
}

function parseTime(time: string): number {
	var seconds = 0, cached = '';

	for(var i = 0; i < time.length; i++) {
		var p = time[i];

		if (p == 'y' || p == 'w' || p == 'd' || p == 'h' || p == 'm') {
			var parsed = parseInt(cached);
			if (isNaN(parsed)) return null;

			if (p == 'y') {
				seconds += parsed * 60 * 60 * 24 * 7 * 54;
			} else if (p == 'w') {
				seconds += parsed * 60 * 60 * 24 * 7;
			} else if (p == 'd') {
				seconds += parsed * 60 * 60 * 24;
			} else if (p == 'h') {
				seconds += parsed * 60 * 60;
			} else if (p == 'm') {
				seconds += parsed * 60;
			}
			cached = '';
		} else {
			cached += p;
		}
	}

	return seconds;
}

export = Mute;