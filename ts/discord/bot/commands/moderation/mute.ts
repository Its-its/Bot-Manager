import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');


import generate = require('nanoid/generate');

import Command = require('../../command');

import Punishments = require('../../../models/punishments');
import TempPunishments = require('../../../models/temp_punishments');
import { Nullable } from '../../../../../typings/manager';


const PERMS = {
	MAIN: 'commands.mute',
	PERMANENT: 'permanent',
	MUTE_1H: 'max_1hour',
	MUTE_1D: 'max_1day',
	MUTE_1W: 'max_1week',
	MUTE_1M: 'max_1month',
	MUTE_6M: 'max_6month'
};

for(var name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


const MAX_SECONDS = parseTime('1y')!;
const MIN_SECONDS = parseTime('5m')!;

const MAX_MUTE_1H = parseTime('1h')!;
const MAX_MUTE_1D = parseTime('1d')!;
const MAX_MUTE_1W = parseTime('1w')!;
const MAX_MUTE_1M = parseTime('4w2d')!;
const MAX_MUTE_6M = parseTime('26w')!;

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
						' — **4w2d** - 4 Week 2 Days (a month)',
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

		var userIdStr = params.shift();
		if (userIdStr == null) return Command.error([['Mute', 'Invalid Params.']]);

		var userType = server.idType(userIdStr);
		if (userType != 'member') return Command.error([[ 'Mute', 'Invalid args. Please refer to mute help.' ]]);

		var discUserId = server.strpToId(userIdStr);
		if (discUserId == null) return Command.error([['Mute', 'Invalid ID.']]);

		var timeStr = params.shift();
		if (timeStr == null) return Command.error([['Mute', 'Invalid Params.']]);

		var reason = params.join(' ');

		var seconds = parseTime(timeStr);

		if (seconds == null) {
			reason = timeStr + reason;
		} else {
			if (seconds < MIN_SECONDS) return Command.error([[ 'Mute', 'Minimum mute time is 5 minutes.' ]]);
			if (seconds > MAX_SECONDS) return Command.error([[ 'Mute', 'Max mute time is 1 year.' ]]);
		}


		if (seconds == null) {
			if (!this.hasPerms(message.member, server, PERMS.PERMANENT)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for indefinitely.' ]])
		} else if (seconds > MAX_MUTE_6M) {
			if (!this.hasPerms(message.member, server, PERMS.MUTE_6M)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for longer than 6 Months (26 weeks)' ]]);
		} else if (seconds > MAX_MUTE_1M) {
			if (!this.hasPerms(message.member, server, PERMS.MUTE_1M)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for longer than 1 Month (4 weeks 2 days)' ]]);
		} else if (seconds > MAX_MUTE_1W) {
			if (!this.hasPerms(message.member, server, PERMS.MUTE_1W)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for longer than 1 Week' ]]);
		} else if (seconds > MAX_MUTE_1D) {
			if (!this.hasPerms(message.member, server, PERMS.MUTE_1D)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for longer than 1 Day' ]]);
		} else if (seconds > MAX_MUTE_1H) {
			if (!this.hasPerms(message.member, server, PERMS.MUTE_1H)) return Command.error([[ 'Mute', 'You don\'t have the permissions for punishing someone for longer than 1 Hour.' ]]);
		}



		message.guild.member(discUserId)
		.addRole(server.punishments.punished_role_id, 'Punished [Mute]');

		// TODO: Check to see if user currently is being punished. (temp or perm)

		new Punishments({
			server_id: message.guild.id,
			member_id: discUserId,
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
				// TODO: Check to see if punishment uses same role (if currently punished)
				TempPunishments.updateOne(
					{
						server_id: message.guild.id,
						member_id: discUserId
					},
					{
						$set: {
							server_id: message.guild.id,
							member_id: discUserId,
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
					'**Muted:** <@' + discUserId + '>',
					'**Length:** ' + (seconds == -1 ? 'Forever' : timeStr),
					'**Reason:** ' + reason
				].join('\n')
			]
		]);
	}
}

function parseTime(time: string): Nullable<number> {
	var seconds = 0, lastGrabbed = '';

	for(var i = 0; i < time.length; i++) {
		var p = time[i];

		if (p == 'y' || p == 'w' || p == 'd' || p == 'h' || p == 'm' || p == 's') {
			var parsed = parseInt(lastGrabbed);
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
			} else if (p == 's') {
				seconds += parsed;
			}

			lastGrabbed = '';
		} else {
			lastGrabbed += p;
		}
	}

	return seconds;
}

export = Mute;