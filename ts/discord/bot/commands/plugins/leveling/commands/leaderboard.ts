import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import UserLevel = require('@discord/bot/plugins/levels/models/userlevel');

const LIMIT_PER_PAGE = 10;

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (params.length != 1) {
		message.channel.send('Invalid args.');
		return;
	}

	let page = parseInt(params.shift()!);

	if (isNaN(page)) page = 1;
	if (page > 10) page = 10;

	let users = await UserLevel.find({ server_id: message.guild!.id })
		.limit(LIMIT_PER_PAGE)
		.skip((page - 1) * LIMIT_PER_PAGE)
		.sort({ xp: -1 })
		.exec();

	await message.channel.send(users.map((u, i) => {
		let member = message.guild!.member(u['member_id']);
		let member_string = (member == null ? `<@${u['member_id']}>` : `${member.user.username}${member.user.discriminator}`);
		return `${((page - 1) * LIMIT_PER_PAGE) + i}. ${member_string} - LVL: ${u['level']}, Total XP: ${u['xp']}`;
	}).join('\n'));

	return Promise.resolve();
}

export {
	call
};