import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import UserLevel = require('@discord/bot/plugins/levels/models/userlevel');
import util = require('@discord/bot/plugins/levels/util');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (params.length < 3) {
		message.channel.send('add <@id/id> <amount> <xp/level>');
		return;
	}

	let user = params.shift()!;
	let amount = parseInt(params.shift()!);
	let type = params.shift()!;

	if (isNaN(amount) ||
		(type != 'lvl' && type != 'xp') ||
		(type == 'lvl' && amount > util.MAX_LEVEL)
	) return message.channel.send('Invalid opts. Use add <id> <amount> <xp/level>');

	let idType = server.idType(user);

	if (idType != null && idType != 'member') {
		message.channel.send('Must he a users ID or @');
		return;
	}

	let id = server.strpToId(user);

	if (id == null) {
		message.channel.send('Invalid id Type');
		return;
	}

	let member = message.guild!.member(id);

	if (member == null) {
		message.channel.send('User must be in the Guild.');
		return;
	}

	UserLevel.findOne({ server_id: message.guild!.id, member_id: id }, (err, user) => {
		if (err != null) {
			console.error(err);
			message.channel.send('An error occured while trying to query DB. Please try again in a few minutes.');
			return;
		}

		let level = 1;
		let xp = 0;

		if (user != null) {
			level = user['level'];
			xp = user['xp'];
		}

		if (type == 'xp') {
			xp += amount;

			if (xp > util.MAX_EXP) xp = util.MAX_EXP;

			level = util.expToLevels(xp);
		} else {
			level += amount;

			if (level > util.MAX_LEVEL) level = util.MAX_LEVEL;

			xp = util.levelsToExp(level);
		}

		if (level > util.MAX_LEVEL || xp > util.MAX_EXP) return;

		UserLevel.updateOne({ server_id: message.guild!.id, member_id: id! }, {
			$set: {
				level: level,
				xp: xp
			},
			$setOnInsert: {
				server_id: message.guild!.id,
				member_id: message.member!.id
			}
		}, { upsert: true }).exec(() => {
			message.channel.send([
				'Leveling',
				'Level: ' + level,
				'XP: ' + xp
			].join('\n'));
		});
	});
}

export {
	call
};