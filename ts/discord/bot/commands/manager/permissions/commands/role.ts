/**
 *	'role <@role>',
 *	'role <@role> add <command/perm>',
 *	'role <@role> remove <command/perm>',
 *	'role <@role> group add <command/perm>',
 *	'role <@role> group remove <name>',
 */

import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import GlobalCommands = require('../../../index');
import PERMISSIONS = require('../perms');

async function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.ROLE)) return Command.noPermsMessage('Perms');

	let roleFull = params.shift();
	let cmdToDo = params.shift();
	let commandPermOrDo = params.shift();

	if (cmdToDo != null && commandPermOrDo == null) {
		return Command.error([['Permissions', 'Invalid Params']]);
	}

	let roleId = server.strpToId(roleFull);

	if (roleId == null) return Command.error([['Permissions', 'Invalid Role.']]);

	if (roleId == '@everyone') {
		// TODO: Better way.
		let first = message.guild!.roles.cache.first()!;
		roleId = first.id;
	}

	if (cmdToDo == null) {
		if (!server.userHasPerm(message.member!, PERMISSIONS.ROLE_LIST)) return Command.noPermsMessage('Perms');

		let permission = server.permissions.getPermsFrom('roles', roleId!);
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
		if (!server.userHasPerm(message.member!, PERMISSIONS.ROLE_ADD)) return Command.noPermsMessage('Perms');

		if (GlobalCommands.validPerms.indexOf(commandPermOrDo!) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		let added = server.permissions.addPermTo('roles', roleId!, commandPermOrDo!);

		if (added) {
			await message.channel.send(Command.error([['Permissions', 'Added ' + commandPermOrDo + ' to ' + roleFull]]));
		} else {
			await message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (cmdToDo == 'remove') {
		if (!server.userHasPerm(message.member!, PERMISSIONS.ROLE_REMOVE)) return Command.noPermsMessage('Perms');

		if (GlobalCommands.validPerms.indexOf(commandPermOrDo!) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		let added = server.permissions.removePermFrom('roles', roleId!, commandPermOrDo!);

		if (added) {
			await message.channel.send(Command.error([['Permissions', 'Removed ' + commandPermOrDo + ' from ' + roleFull]]));
		} else {
			await message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (cmdToDo == 'group') {
		let groupName = params.shift();
		if (commandPermOrDo == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

		if (commandPermOrDo == 'add') {
			let added = server.permissions.addGroupTo('roles', roleId!, groupName.toLowerCase());

			if (added) {
				await message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + roleFull]]));
			} else {
				await message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
			}
		} else if (commandPermOrDo == 'remove') {
			let added = server.permissions.removeGroupFrom('roles', roleId!, groupName.toLowerCase());

			if (added) {
				await message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + roleFull]]));
			} else {
				await message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
			}
		} else return Command.error([['Permissions', 'Invalid Params']]);
	}

	await server.save();

	return Promise.resolve();
}

export {
	call
};