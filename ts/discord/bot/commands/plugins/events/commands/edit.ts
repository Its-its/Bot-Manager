import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import utils = require('@discord/utils');

import PERMS = require('../perms');
import { DiscordBot } from '@type-manager';


// Max time a single group can be timed out.
const MAX_EVENT_GROUP_TIMEOUT = 10 * 1000;

const TYPES = {
	'react': ['add', 'remove'],
	'role': ['add', 'remove']
	// 'member': ['']
};

const DEFAULT_VARIABLES_SORTED = {
	// Person who initiated the event.
	user: {
		guild: {
			'callerNickname': 'nickname',
		},

		self: {
			'callerId': 'id',
			'callerUsername': 'username',
			'callerDiscriminator': 'discriminator',
			'callerTag': 'tag',
			'callerIcon': 'defaultAvatarURL'
		}
	},

	guild: {
		self: {
			'guildId': 'id',
			'guildMemberCount': 'memberCount',
			'guildName': 'name',
			'guildIcon': 'icon',
			'guildOwnerId': 'ownerID',
			'guildRegion': 'region',
			'guildVanityCode': 'vanityURLCode',
		}
	},


	channel: {
		self: {
			'channelId': 'id',
			'channelName': 'name',
		}
	},

	bot: {
		guild: {
			'botNickname': 'nickname',
		},

		self: {
			'botId': 'id',
			'botUsername': 'username',
			'botDiscriminator': 'discriminator',
			'botTag': 'tag',
			'botIcon': 'defaultAvatarURL'
		}
	}
};

// Names of the variables.
const DEFAULT_VARIABLE_NAMES = Object.values(DEFAULT_VARIABLES_SORTED)
	.flatMap(Object.values)
	.flatMap(Object.keys)
	.map(i => i.toLowerCase());

// edit <id>

// message.guild!.emojis.resolveIdentifier(emoji!)
// Check if role has a higher priority than bot.

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	let raw_id = params.shift();

	if (raw_id != null) {
		let id = parseInt(raw_id);

		if (!isNaN(id)) {
			if (server.plugins.events!.groups!.find(g => g.id == id) != null) {
				let msg = await showEditPage(id, message, server);

				if (msg != null) {
					await message.channel.send(msg);
				}
			} else {
				await message.channel.send(utils.errorMsg([
					[
						'Events',
						'Unable to find event grouping with specified ID.'
					]
				]));
			}
		} else {
			await message.channel.send(utils.errorMsg([
				[
					'Events',
					'Not a valid number'
				]
			]));
		}
	} else {
		await message.channel.send(utils.errorMsg([
			[
				'Events',
				'Incorrect Arguments'
			]
		]));
	}

	return Promise.resolve();
}

async function showEditPage(event_id: number, senderMessage: Discord.Message, server: DiscordServer) {
	if (!server.userHasPerm(senderMessage.member!, PERMS.EDIT)) return utils.noPermsMessage('Events');

	let group = server.plugins.events!.groups!.find(g => g.id == event_id)!;

	let selector = utils.createPageSelector(senderMessage.author.id, senderMessage.channel)!;

	selector.setFormat(() => [
		`You are now editing "${group.title}"`,
		'',
		'{page_items}'
	]);

	selector.addSelection(
		'Variables',
		'Changes the event specific variables you can access throughout.',
		page => showVariablesPage(group, page, senderMessage, server)
	);

	selector.addSelection(
		'Conditions',
		'Specify the conditions to activate event.',
		page => showVariablesPage(group, page, senderMessage, server)
	);

	selector.addSelection(
		'Events',
		'What happens when the conditions are met.',
		page => showVariablesPage(group, page, senderMessage, server)
	);


	await selector.display();

	return null;
}

function showVariablesPage(group: DiscordBot.PluginEvents.Grouping, page: utils.MessagePage, senderMessage: Discord.Message, server: DiscordServer) {
	page.setFormat(() => [
		'Add, Remove, or Edit your Variables.',
		'```' + (group.variables != null ? Object.entries(group.variables).map(i => i[0] + ' = ' + i[1]).join('\n') : 'Empty') + '```',
		'',
		'{page_items}'
	]);

	page.addSelection('Add', 'Add a new variable', addPage => {
		addPage.setFormat(() => [
			'Adding a new variable',
			'```' + (group.variables != null ? Object.entries(group.variables).map(i => i[0] + ' = ' + i[1]).join('\n') : 'Empty') + '```',
			'variableName=variable_value',
			'',
			'{page_items}'
		]);

		addPage.listen(async value => {
			let split = value.split('=', 2);

			if (split.length == 2) {
				let name = split[0].trim();
				let value = split[1].trim();

				if (!DEFAULT_VARIABLE_NAMES.includes(name.toLowerCase())) {
					if (group.variables == null || !Object.keys(group.variables).map(i => i.toLowerCase()).includes(name.toLowerCase())) {
						if (group.variables == null) {
							group.variables = {};
						}

						group.variables[name] = value;

						await server.save();

						await utils.asyncTimeout(300);
						await addPage.back();

						return true;
					} else {
						await addPage.temporaryMessage(utils.errorMsg([[
							'Events | Adding Variable',
							'Unable to add variable. It already exists!'
						]]), 4000);
					}
				} else {
					await addPage.temporaryMessage(utils.errorMsg([[
						'Events | Adding Variable',
						'Unable to add variable. It\'s a default variable with already exists!'
					]]), 4000);
				}
			} else {
				console.log('Incorrect size.');
			}

			return false;
		});

		return addPage.display();
	});

	if (group.variables != null) {
		page.addSelection('Remove', 'Remove an existing variable', remPage => {
			remPage.setFormat(() => [
				'Remove a variable by name',
				'```' + (group.variables != null ? Object.entries(group.variables).map(i => i[0] + ' = ' + i[1]).join('\n') : 'Empty') + '```',
				'',
				'{page_items}'
			]);

			remPage.listen(async name => {
				name = name.trim();

				let found = Object.keys(group.variables!).map(i => i.toLowerCase()).find(i => i == name.toLowerCase());
				if (group.variables != null && found != null) {
					if (Object.keys(group.variables).length == 1) {
						group.variables = undefined;
					} else {
						delete group.variables[found];
					}

					await server.save();

					await utils.asyncTimeout(300);
					await remPage.back();

					return true;
				} else {
					await remPage.temporaryMessage(utils.errorMsg([[
						'Events | Removing Variable',
						'Unable to find variable name.'
					]]), 4000);
				}

				return false;
			});

			return remPage.display();
		});

		page.addSelection('Edit', 'Edit an existing variable', editPage => {
			editPage.setFormat(() => [
				'Edit a variable',
				'```' + (group.variables != null ? Object.entries(group.variables).map(i => i[0] + ' = ' + i[1]).join('\n') : 'Empty') + '```',
				'variableName=variable_value',
				'',
				'{page_items}'
			]);

			editPage.listen(async value => {
				let split = value.split('=', 2);

				if (split.length == 2) {
					let name = split[0].trim();
					let value = split[1].trim();

					let found = Object.keys(group.variables!).map(i => i.toLowerCase()).find(i => i == name.toLowerCase());
					if (group.variables != null && found != null) {
						group.variables[found] = value;

						await server.save();

						await utils.asyncTimeout(300);
						await editPage.back();

						return true;
					} else {
						await editPage.temporaryMessage(utils.errorMsg([[
							'Events | Editing Variable',
							'Unable to find variable name.'
						]]), 4000);
					}
				} else {
					await editPage.temporaryMessage(utils.errorMsg([[
						'Events | Editing Variable',
						'Incorrect arguments.'
					]]), 4000);
				}

				return false;
			});

			return editPage.display();
		});
	}

	page.addSpacer();

	return page.display();
}

function showEditEventPage(group: DiscordBot.PluginEvents.Grouping, page: utils.MessagePage, senderMessage: Discord.Message, server: DiscordServer) {
	if (!server.userHasPerm(senderMessage.member!, PERMS.EDIT)) return utils.noPermsMessage('Events');

	let selector = utils.createPageSelector(senderMessage.author.id, senderMessage.channel)!;

	selector.setFormat([
		'Editing event on. Your on called events are below.',
		'',
		'{page_items}'
	]);

	//
}


export {
	call,

	DEFAULT_VARIABLES_SORTED,
	DEFAULT_VARIABLE_NAMES
};