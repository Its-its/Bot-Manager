import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import UserLevel = require('../../../../plugins/levels/models/userlevel');

const LIMIT_PER_PAGE = 10;

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var page = parseInt(params.shift());

	if (isNaN(page)) page = 1;
	if (page > 10) page = 10;

	UserLevel.find({ server_id: message.guild.id })
	.limit(LIMIT_PER_PAGE)
	.skip((page - 1) * LIMIT_PER_PAGE)
	.sort({ xp: -1 })
	.exec((err, users) => {
		if (err != null) {
			console.error(err);
			message.channel.send('An error occured while trying to query DB. Please try again in a few minutes.');
			return;
		}

		message.channel.send(users.map((u, i) => {
			var member = message.guild.member(u['member_id']);
			var member_string = (member == null ? `<@${u['member_id']}>` : `${member.user.username}${member.user.discriminator}`);
			return `${((page - 1) * LIMIT_PER_PAGE) + i}. ${member_string} - LVL: ${u['level']}, Total XP: ${u['xp']}`;
		}).join('\n'));
	});
}

export {
	call
};