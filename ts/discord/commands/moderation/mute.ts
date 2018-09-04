import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');


import Command = require('../../command');

import Punishments = require('../../models/punishments');
import TempPunishments = require('../../models/temp_punishments');


const PERMS = {
	MAIN: 'commands.mute'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


const MAX_TIME = parseTime('1y');
const MIN_TIME = parseTime('5m');

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
						' - **1w2d** - 1 Week 2 Days',
						' - **1w** - 1 Week',
						' - **1d** - 1 Day',
						' - **24h** - 1 Day',
						' - **5m** - 5 Minutes'
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

		var time = parseTime(time_str);

		if (time == null) {
			reason = time_str + reason;
		} else {
			if (time > MAX_TIME) return Command.error([[ 'Mute', 'Max mute time is 1 year.' ]]);
			if (time < MIN_TIME) return Command.error([[ 'Mute', 'Minimum mute time is 5 minutes.' ]]);
		}

		new Punishments({
			server_id: message.guild.id,
			member_id: user_id,
			creator_id: message.member.id,

			type: 'mute',
			length: time == null ? undefined : time,
			expires: time == null ? undefined : Date.now() + time,

			reason: reason
		}).save((err, item) => {
			if (err != null) {
				return console.error(err);
			}

			if (time != null) {
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
							expires: Date.now() + time
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
					'**Length:** ' + (time == -1 ? 'Forever' : time_str),
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