import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import utils = require('@discord/utils');

import Edit = require('./edit');

import PERMS = require('../perms');

// events add react 01010 :check:

const TYPES = [
	'react_add', 'react_remove',
	'member_add', 'member_remove'
];

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.ADD)) return utils.noPermsMessage('Events');

	let eventType = params.shift();
	if (eventType == null) {
		await message.channel.send('Invalid args');
		return Promise.resolve();
	}

	eventType = eventType.toLowerCase();

	if (TYPES.indexOf(eventType) == -1) {
		await message.channel.send('Type must be one of these: ' + TYPES.join(','));
		return Promise.resolve();
	}

	let compiled: any = {
		type: eventType
	};

	if (eventType == 'react_add') {
		let id = params.shift();
		let emoji = params.shift();

		if (id == null || emoji == null) {
			await message.channel.send('Invalid args for react_add');
			return Promise.resolve();
		}

		if (!message.guild!.emojis.cache.has(emoji)) {
			return Promise.resolve();
		}

		// TODO: Figure out a way to check and see if the message exists.

		compiled['message_id'] = id;
		compiled['emoji_id'] = emoji;
	}

	compiled['uid'] = null;

	Edit.showEditPage(compiled, message, server);

	return Promise.resolve();
}

export {
	call
};