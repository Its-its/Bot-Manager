import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { DiscordBot } from '@type-manager';

import utils = require('@discord/utils');

import PERMS = require('../perms');


const EVENT_LIMIT = 20;


async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMS.ADD)) return utils.noPermsMessage('Events');

	let events = server.plugins.events!;

	if (events.groups!.length == EVENT_LIMIT) {
		await message.channel.send(utils.successMsg([
			[
				'Events',
				'Max amount of events allowed has been reached.'
			]
		]));

		return Promise.resolve();
	}

	let lastId = largestId(events.groups!);

	let group: DiscordBot.PluginEvents.Grouping = {
		id: lastId + 1,
		title: params.join(' '),

		enabled: false
	};

	await message.channel.send(utils.successMsg([
		[
			'Events',
			`Created a new Event Group called "${group.title}"`
		]
	]));

	events.groups!.push(group);

	await server.save();

	return Promise.resolve();
}


function largestId(groups: readonly DiscordBot.PluginEvents.Grouping[]) {
	let largestId = -1;

	for (let i = 0; i < groups.length; i++) {
		let id = groups[i].id;

		if (id > largestId) {
			largestId = id;
		}
	}

	return largestId;
}

export {
	call
};