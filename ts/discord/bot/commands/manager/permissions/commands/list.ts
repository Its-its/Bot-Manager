import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';
import GlobalCommands = require('../../../index');

import PERMISSIONS = require('../perms');
import { DiscordBot } from '@type-manager';

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.LIST)) return Command.noPermsMessage('Perms');

	let cmdToDo = params.shift();

	if (cmdToDo == null) return Command.error([['Permissions', 'Invalid Params']]);

	if (cmdToDo == 'command') {
		let commandName = params.shift();
		if (commandName == null) return Command.error([['Permissions', 'Please enter a command name.']]);

		let commandClass = GlobalCommands.get(commandName);
		if (commandClass == null) return Command.error([['Permissions', 'Command doesn\'t exist.']]);

		await message.channel.send('**Permissions**\n```' + commandClass.perms.join('\n') + '```');
	} else {
		let type: string;

		if (cmdToDo == 'group') {
			type = 'group';

			cmdToDo = params.shift();

			if (cmdToDo == null) return Command.error([['Permissions', 'Invalid Group Params']]);
		} else {
			let idType = server.idType(cmdToDo);

			if (idType == null) return Command.error([['Permissions', 'Invalid ID Type']]);

			type = idType;
		}

		if (type == null) return Command.error([['Permissions', 'Unknown ID type.']]);

		let permissions: DiscordBot.PermissionsUserOrRoles | DiscordBot.PermissionsGroup;

		if (type == 'member') {
			permissions = server.permissions.users[cmdToDo];
		} else if (type == 'role') {
			permissions = server.permissions.roles[cmdToDo];
		} else if (type == 'group') {
			permissions = server.permissions.groups[cmdToDo];
		} else {
			return Command.error([['Permissions', 'Currently channel listing isn\'t implemented.']]);
		}

		if (permissions == null) return Command.error([['Permissions', `Couldn't find ${type} from ID.`]]);

		await message.channel.send(Command.info([
			[
				'Permissions',
				'```' + [ type + ': ' + cmdToDo ].concat(permissions.perms.map(p => ' - ' + p)).join('\n') + '```'
			]
		]));
	}

	return Promise.resolve();
}

export {
	call
};