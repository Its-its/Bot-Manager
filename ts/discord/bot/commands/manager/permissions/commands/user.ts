/**
 *	'user <@user>',
 *	'user <@user> add <command/perm>',
 *	'user <@user> remove <command/perm>',
 *	'user <@user> group add <command/perm>',
 *	'user <@user> group remove <name>',
 */

import Discord = require('discord.js');
import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');
import GlobalCommands = require('../../../index');

import PERMISSIONS = require('../perms');


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!server.userHasPerm(message.member!, PERMISSIONS.USER)) return Command.noPermsMessage('Permissions');

	let userIdFull = params.shift();
	let calledCmd = params.shift();
	let permissionOrCalledCmd = params.shift();

	if (userIdFull == null) return Command.error([['Permissions', 'Invalid Params']]);

	if (calledCmd == null) {
		if (!server.userHasPerm(message.member!, PERMISSIONS.USER_LIST)) return Command.noPermsMessage('Permissions');

		let permission = server.getPermsFrom('users', userIdFull);
		if (permission == null) permission = { perms: [], groups: [] };

		let commandsList = <Command[]>GlobalCommands.list(true);

		let stripped = server.strpToId(userIdFull);

		if (stripped == null) return Command.error([['Permissions', 'Invalid ID']]);

		let guildMember = message.guild!.members.cache.get(stripped);
		if (guildMember == null) return Command.error([['Permissions', 'Unable to find Guild Member.']]);

		return Command.info([
			[
				'Permissions',
				[ 'User: ' + userIdFull, 'Perms:' ]
				.concat(permission.perms.map(p => ' - ' + p))
				.concat(['Groups:'])
				.concat(permission.groups.map(p => ' - ' + p))
				.join('\n')
			],
			[
				'Commands',
				commandsList.map(c =>
					server.getPrefix() + c.commandName[0] + ' | ' +
					c.hasPermsCount(guildMember!, server, c.perms) + '/' + c.perms.length  + ' | ' +
					c.description
				).join('\n')
			]
		]);
	}

	if (permissionOrCalledCmd == null) return Command.error([['Permissions', 'Invalid Params']]);
	permissionOrCalledCmd = permissionOrCalledCmd.toLowerCase();


	if (calledCmd == 'add') {
		if (!server.userHasPerm(message.member!, PERMISSIONS.USER_ADD)) return Command.noPermsMessage('Permissions');

		if (GlobalCommands.validPerms.indexOf(permissionOrCalledCmd) == -1) return Command.error([['Permissions', 'That perm doesn\'t exist!']]);

		if (Object.keys(server.permissions.users).length >= 20) {
			return Command.error([['Permissions', 'SORRY! There is a limit of 20 users max allowed custom permission. Please use a role instead.']]);
		}

		let wasPermAdded = server.addPermTo('users', userIdFull, permissionOrCalledCmd);

		if (wasPermAdded) {
			message.channel.send(Command.error([['Permissions', 'Added ' + permissionOrCalledCmd + ' to ' + userIdFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (calledCmd == 'remove') {
		if (!server.userHasPerm(message.member!, PERMISSIONS.USER_REMOVE)) return Command.noPermsMessage('Permissions');

		if (GlobalCommands.validPerms.indexOf(permissionOrCalledCmd) == -1) return Command.error([['Permissions', 'That perm doesn\'t exist!']]);

		let wasPermAdded = server.removePermFrom('users', userIdFull, permissionOrCalledCmd);

		if (wasPermAdded) {
			message.channel.send(Command.error([['Permissions', 'Removed ' + permissionOrCalledCmd + ' from ' + userIdFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (calledCmd == 'group') {
		let groupName = params.shift();
		if (permissionOrCalledCmd == null || groupName == null) return Command.error([['Permissions', 'Invalid Parameters']]);

		if (permissionOrCalledCmd == 'add') {
			if (!server.userHasPerm(message.member!, PERMISSIONS.GROUP_ADD)) return Command.noPermsMessage('Permissions');

			let wasPermAdded = server.addGroupTo('users', userIdFull, groupName.toLowerCase());

			if (wasPermAdded) {
				message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + userIdFull]]));
			} else {
				message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
			}
		} else if (permissionOrCalledCmd == 'remove') {
			if (!server.userHasPerm(message.member!, PERMISSIONS.GROUP_REMOVE)) return Command.noPermsMessage('Permissions');

			let wasPermAdded = server.removeGroupFrom('users', userIdFull, groupName.toLowerCase());

			if (wasPermAdded) {
				message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + userIdFull]]));
			} else {
				message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
			}
		} else return Command.error([['Permissions', 'Invalid Parameters']]);
	}

	server.save();
}

export {
	call
};