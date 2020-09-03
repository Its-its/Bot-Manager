import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import UserLevel = require('@discord/bot/plugins/levels/models/userlevel');
import util = require('@discord/bot/plugins/levels/util');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (params.length != 3) {
		await message.channel.send('set <id> <amount> <xp/level>');
		return Promise.resolve();
	}

	let raw_user = params.shift()!;
	let amount = parseInt(params.shift()!);
	let type = params.shift()!;

	if (isNaN(amount) ||
		(type != 'lvl' && type != 'xp') ||
		(type == 'lvl' && amount > util.MAX_LEVEL)
	) {
		await message.channel.send('Invalid opts. Use set <id> <amount> <xp/level>');
		return Promise.resolve();
	}

	let idType = server.idType(raw_user);

	if (idType != null && idType != 'member') {
		await message.channel.send('Must be a users ID or @');
		return Promise.resolve();
	}

	let id = server.strpToId(raw_user);

	if (id == null) {
		await message.channel.send('Invalid ID.');
		return Promise.resolve();
	}

	let member = message.guild!.member(id);

	if (member == null) {
		await message.channel.send('User must be in the Guild.');
		return Promise.resolve();
	}

	let user = await UserLevel.findOne({ server_id: message.guild!.id, member_id: id });

	let level = 1;
	let xp = 0;

	if (user != null) {
		level = user['level'];
		xp = user['xp'];
	}

	if (type == 'xp') {
		xp = amount;

		if (xp < 0) xp = 0;
		if (xp > util.MAX_EXP) xp = util.MAX_EXP;

		level = util.expToLevels(xp);
	} else {
		level = amount;

		if (level < 0) level = 0;
		if (level > util.MAX_LEVEL) level = util.MAX_LEVEL;

		xp = util.levelsToExp(level);
	}

	if (level > util.MAX_LEVEL || xp > util.MAX_EXP) {
		return Promise.resolve();
	}

	await UserLevel.updateOne({ server_id: message.guild!.id, member_id: id! }, {
		$set: {
			level: level,
			xp: xp
		},
		$setOnInsert: {
			server_id: message.guild!.id,
			member_id: message.member!.id
		}
	}, { upsert: true }).exec();

	await message.channel.send([
		'Leveling',
		'Level: ' + level,
		'XP: ' + xp
	].join('\n'));

	return Promise.resolve();
}

export {
	call
};