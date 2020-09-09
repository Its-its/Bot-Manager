import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('@discord/bot/command');

import { sendQueue } from '@discord/music/plugins/music';
import PERMS = require('../perms');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let paramToDo = (params.shift() || 'list').toLowerCase();

	if (['list', 'add', 'playlist', 'repeat', 'shuffle', 'clear', 'remove'].indexOf(paramToDo) == -1) return Command.error([['Music', 'Not a valid option: ' + paramToDo]]);

	// @ts-ignore
	if (!server.userHasPerm(message.member!, PERMS['QUEUE_' + paramToDo.toUpperCase()])) return Command.noPermsMessage('Music');

	sendQueue(paramToDo, message.guild!.id, message.member!.id, message.channel.id, params);

	return Promise.resolve();
}

export {
	call
};