import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import UserLevel = require('../../../../plugins/levels/models/userlevel');
import util = require('../../../../plugins/levels/util');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (params.length != 3) {
		message.channel.send('remove <id> <amount> <xp/level>');
		return;
	}

	var user = params.shift()!;
	var amount = parseInt(params.shift()!);
	var type = params.shift()!;

	if (isNaN(amount) ||
		(type != 'lvl' && type != 'xp') ||
		(type == 'lvl' && amount > util.MAX_LEVEL)
	) return message.channel.send('Invalid opts. Use remove <id> <amount> <xp/level>');

	var idType = server.idType(user);

	if (idType != null && idType != 'member') {
		message.channel.send('Must he a users ID or @');
		return;
	}

	var id = server.strpToId(user);

	if (id == null) {
		message.channel.send('Invalid ID.');
		return;
	}

	var member = message.guild.member(id);

	if (member == null) {
		message.channel.send('User must be in the Guild.');
		return;
	}

	UserLevel.findOne({ server_id: message.guild.id, member_id: id }, (err, user) => {
		if (err != null) {
			console.error(err);
			message.channel.send('An error occured while trying to query DB. Please try again in a few minutes.');
			return;
		}

		var level = 1;
		var xp = 0;

		if (user != null) {
			level = user['level'];
			xp = user['xp'];
		}

		if (type == 'xp') {
			xp -= amount;

			if (xp < 0) xp = 0;

			level = util.expToLevels(xp);
		} else {
			level -= amount;

			if (level < 0) level = 0;

			xp = util.levelsToExp(level);
		}

		if (level > util.MAX_LEVEL || xp > util.MAX_EXP) return;

		UserLevel.updateOne({ server_id: message.guild.id, member_id: id }, {
			$set: {
				level: level,
				xp: xp
			},
			$setOnInsert: {
				server_id: message.guild.id,
				member_id: message.member.id
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