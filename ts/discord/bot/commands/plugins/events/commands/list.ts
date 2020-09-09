import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import utils = require('@discord/utils');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let events = server.plugins.events!;

	let groups = events.groups!;


	if (params.length == 0) {
		if (groups.length != 0) {
			let items: [string, string][] = [
				[
					'Events',
					`Amount: ${groups.length}`
				]
			];

			items.push(...groups.map<[string, string]>(g => [
				`ID: ${g.id} | ${g.title}`,
				`Enabled: ${g.enabled}`
			]));

			await message.channel.send(
				utils.successMsg(items)
			);
		} else {
			await message.channel.send(utils.successMsg([
				[
					'Events',
					'No Events created.'
				]
			]));
		}
	} else {
		let id = parseInt(params.shift()!);

		if (isNaN(id)) {
			await message.channel.send(utils.errorMsg([
				[
					'Events',
					'First paramater is not a number.'
				]
			]));
		} else {
			let group = groups.find(g => g.id == id);

			if (group != null) {
				let compiled: [string, string][] = [];

				// Title / Enabled
				compiled.push([
					`${group.title}`,
					`Currently ${group.enabled ? 'Enabled' : 'Disabled'}`
				]);

				// Variables
				compiled.push([
					'Event Variables:',
					group.variables ? Object.entries(group.variables).map(([i, v]) => ` - ${i} = ${v}`).join('\n') : 'None'
				]);

				await message.channel.send(utils.successMsg(compiled));
			} else {
				await message.channel.send(utils.errorMsg([
					[
						'Events',
						'Unable to find event with id.'
					]
				]));
			}
		}
	}

	return Promise.resolve();
}

export {
	call
};