import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import { sendPlay } from '../../../../../music/plugins/music';
import PERMS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member, PERMS.PLAY)) return Command.noPermsMessage('Music');

	var joined = params.join(' ').trim();

	sendPlay(message.channel.id, message.guild.id, message.member.id, joined.length == 0 ? undefined : joined);
}

export {
	call
};