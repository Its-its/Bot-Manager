import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import { sendQueue } from '../../../../../music/plugins/music';
import PERMS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	var paramToDo = (params.shift() || 'list').toLowerCase();

	if (['list', 'add', 'playlist', 'repeat', 'shuffle', 'clear', 'remove'].indexOf(paramToDo) == -1) return Command.error([['Music', 'Not a valid option: ' + paramToDo]]);

	if (!server.userHasPerm(message.member, PERMS['QUEUE_' + paramToDo.toUpperCase()])) return Command.noPermsMessage('Music');

	sendQueue(paramToDo, message.guild.id, message.member.id, message.channel.id, params);
}

export {
	call
};