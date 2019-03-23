/**
 *	'role <@role>',
 *	'role <@role> add <command/perm>',
 *	'role <@role> remove <command/perm>',
 *	'role <@role> group add <command/perm>',
 *	'role <@role> group remove <name>',
 */

import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');

import GlobalCommands = require('../../../index');
import PERMISSIONS = require('../perms');

function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member, PERMISSIONS.ROLE)) return Command.noPermsMessage('Perms');

	var roleFull = params.shift();
	var cmdToDo = params.shift();
	var commandPermOrDo = params.shift();

	if (cmdToDo != null && commandPermOrDo == null) {
		return Command.error([['Permissions', 'Invalid Params']]);
	}

	var roleId = server.strpToId(roleFull);

	if (roleId == null) return Command.error([['Permissions', 'Invalid Role.']]);

	if (roleId == '@everyone') {
		var first = message.guild.roles.first();
		roleId = first.id;
	}

	if (cmdToDo == null) {
		if (!server.userHasPerm(message.member, PERMISSIONS.ROLE_LIST)) return Command.noPermsMessage('Perms');

		var permission = server.getPermsFrom('roles', roleId);
		if (permission == null) permission = { perms: [], groups: [] };

		return Command.info([
			[	'Permissions',
				[ 'Role: ' + roleFull + ' (' + roleId + ')', 'Perms:' ]
				.concat(permission.perms.map(p => ' - ' + p))
				.concat(['Groups:'])
				.concat(permission.groups.map(p => ' - ' + p))
				.join('\n')
			]
		]);
	} else if (cmdToDo == 'add') {
		if (!server.userHasPerm(message.member, PERMISSIONS.ROLE_ADD)) return Command.noPermsMessage('Perms');

		if (GlobalCommands.validPerms.indexOf(commandPermOrDo!) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		var added = server.addPermTo('roles', roleId, commandPermOrDo!);

		if (added) {
			message.channel.send(Command.error([['Permissions', 'Added ' + commandPermOrDo + ' to ' + roleFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (cmdToDo == 'remove') {
		if (!server.userHasPerm(message.member, PERMISSIONS.ROLE_REMOVE)) return Command.noPermsMessage('Perms');

		if (GlobalCommands.validPerms.indexOf(commandPermOrDo!) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		var added = server.removePermFrom('roles', roleId, commandPermOrDo!);

		if (added) {
			message.channel.send(Command.error([['Permissions', 'Removed ' + commandPermOrDo + ' from ' + roleFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (cmdToDo == 'group') {
		var groupName = params.shift();
		if (commandPermOrDo == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

		if (commandPermOrDo == 'add') {
			var added = server.addGroupTo('roles', roleId, groupName.toLowerCase());

			if (added) {
				message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + roleFull]]));
			} else {
				message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
			}
		} else if (commandPermOrDo == 'remove') {
			var added = server.removeGroupFrom('roles', roleId, groupName.toLowerCase());

			if (added) {
				message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + roleFull]]));
			} else {
				message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
			}
		} else return Command.error([['Permissions', 'Invalid Params']]);
	}

	server.save();
}

export {
	call
};