import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');
import GlobalCommands = require('../../../index');

import PERMISSIONS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!this.hasPerms(message.member, server, PERMISSIONS.LIST)) return Command.noPermsMessage('Perms');
	var cmdToDo = params.shift();

	if (cmdToDo == 'command') {
		var commandName = params.shift();
		if (commandName == null) return Command.error([['Permissions', 'Please enter a command name.']]);

		var commandClass = GlobalCommands.get(commandName);
		if (commandClass == null) return Command.error([['Permissions', 'Command doesn\'t exist.']]);

		message.channel.send('**Permissions**\n```' + commandClass.perms.join('\n') + '```');
	} else {
		var type = null;

		if (cmdToDo == 'group') {
			type = 'group';
			cmdToDo = params.shift();
		} else {
			type = server.idType(cmdToDo);
		}

		if (type == null) return Command.error([['Permissions', 'Unknown ID type.']]);

		var permissions: DiscordBot.PermissionsUserOrRoles | DiscordBot.PermissionsGroup = null;

		if (type == 'member') {
			permissions = server.permissions.users[cmdToDo];
		} else if (type == 'role') {
			permissions = server.permissions.roles[cmdToDo];
		} else if (type == 'group') {
			permissions = server.permissions.groups[cmdToDo];
		} else if (type == 'channel') {
			return Command.error([['Permissions', 'Currently channel listing isn\'t implemented.']]);
		}

		if (permissions == null) return Command.error([['Permissions', `Couldn't find ${type} from ID.`]]);

		message.channel.send(Command.info([
			[
				'Permissions',
				'```' + [ type + ': ' + cmdToDo ].concat(permissions.perms.map(p => ' - ' + p)).join('\n') + '```'
			]
		]));
	}
}

export {
	call
};