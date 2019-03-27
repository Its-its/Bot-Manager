/** Command Usage
 *	"group create <Display Name> - A-Z 0-9 spaces"
 *	"group list"
 *	"group <name>"
 *	"group <name> add <command/perm>"
 *	"group <name> remove <command/perm>"
 *
 */

import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import PERMISSIONS = require('../perms');
import { DiscordBot } from '@type-manager';

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member, PERMISSIONS.GROUP)) return Command.noPermsMessage('Permissions');

	var name = params.shift();

	if (name == null) return Command.error([['Permissions', 'Invalid Params']]);

	if (name == 'create') {
		if (!server.userHasPerm(message.member, PERMISSIONS.GROUP_CREATE)) return Command.noPermsMessage('Permissions');

		if (params.length == 0) return Command.error([['Permissions', 'Invalid Params']]);
		var displayName = params.join(' ');

		if (!/^[a-z0-9 ]+$/i.test(displayName)) return Command.error([['Permissions', 'Invalid Display Name. A-Z, 0-9, spaces only.']]);

		var group = server.createGroup(displayName);

		if (group == null) return Command.error([['Permissions', 'Group with that name already exists!']]);

		return Command.success([
			[
				'Permissions',
				[
					'Sucessfully created Group',
					'Display Name: ' + group.displayName,
					'Name: ' + group.name
				].join('\n')
			]
		]);
	}
	// else if (name == 'list') {
	// 	var groups = [];

	// 	for(var name in server.permissions.groups) {
	// 		var listGroup = server.permissions.groups[name];

	// 		groups.push(
	// 			'Display Name: ' + listGroup.displayName,
	// 			'Name: ' + listGroup.name,
	// 			'Perms: ' + listGroup.perms.length,
	// 			''
	// 		);
	// 	}

	// 	if (groups.length != 0) groups.pop();

	// 	return groups.join('\n');
	// }
	else {
		var paramAddOrRemove = params.shift();

		if (paramAddOrRemove == null) {
			if (!server.userHasPerm(message.member, PERMISSIONS.GROUP_LIST)) return Command.noPermsMessage('Permissions');

			var permissionsFromGroup = <DiscordBot.PermissionsGroup>server.getPermsFrom('groups', name);
			if (permissionsFromGroup == null) return Command.error([['Permissions', 'Group not valid']]);

			message.channel.send(Command.info([
				[	'Permissions',
					[ 'Group: ' + permissionsFromGroup.displayName, 'Name: ' + permissionsFromGroup.name, 'Perms:' ]
					.concat(permissionsFromGroup.perms.map(p => ' - ' + p))
					.join('\n')
				]
			]));

			return;
		}


		var paramCommandOrPermission = params.shift();

		if (paramCommandOrPermission == null) return Command.error([['Permissions', 'Invalid Params.']]);

		if (paramAddOrRemove == 'add') {
			if (!server.userHasPerm(message.member, PERMISSIONS.GROUP_ADD)) return Command.noPermsMessage('Permissions');
			server.addPermTo('groups', name, paramCommandOrPermission);
		} else if (paramAddOrRemove == 'remove') {
			if (!server.userHasPerm(message.member, PERMISSIONS.GROUP_REMOVE)) return Command.noPermsMessage('Permissions');
			server.removePermFrom('groups', name, paramCommandOrPermission);
		}
	}

	server.save();
}

export {
	call
};