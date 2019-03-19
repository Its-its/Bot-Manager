/**
 *	'user <@user>',
 *	'user <@user> add <command/perm>',
 *	'user <@user> remove <command/perm>',
 *	'user <@user> group add <command/perm>',
 *	'user <@user> group remove <name>',
 */

import Discord = require('discord.js');
import DiscordServer = require('../../../../GuildServer');

import Command = require('../../../../command');
import GlobalCommands = require('../../../index');

import PERMISSIONS = require('../perms');


function call(params: string[], server: DiscordServer, message: Discord.Message) {
	if (!this.hasPerms(message.member, server, PERMISSIONS.USER)) return Command.noPermsMessage('Permissions');

	var userIdFull = params.shift();
	var calledCmd = params.shift();
	var permissionOrCalledCmd = params.shift();

	if (calledCmd != null && permissionOrCalledCmd == null) {
		return Command.error([['Permissions', 'Invalid Params']]);
	}

	permissionOrCalledCmd = permissionOrCalledCmd.toLowerCase();

	if (calledCmd == null) {
		if (!this.hasPerms(message.member, server, PERMISSIONS.USER_LIST)) return Command.noPermsMessage('Permissions');

		var permission = server.getPermsFrom('users', userIdFull);
		if (permission == null) permission = { perms: [], groups: [] };

		var commandsList = <Command[]>GlobalCommands.list(true);

		var guildMember = message.guild.members.get(server.strpToId(userIdFull));

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
					c.hasPermsCount(guildMember, server, c.perms) + '/' + c.perms.length  + ' | ' +
					c.description
				).join('\n')
			]
		]);
	} else if (calledCmd == 'add') {
		if (!this.hasPerms(message.member, server, PERMISSIONS.USER_ADD)) return Command.noPermsMessage('Permissions');

		if (GlobalCommands.validPerms.indexOf(permissionOrCalledCmd) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		var wasPermAdded = server.addPermTo('users', userIdFull, permissionOrCalledCmd);

		if (wasPermAdded) {
			message.channel.send(Command.error([['Permissions', 'Added ' + permissionOrCalledCmd + ' to ' + userIdFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (calledCmd == 'remove') {
		if (!this.hasPerms(message.member, server, PERMISSIONS.USER_REMOVE)) return Command.noPermsMessage('Permissions');

		if (GlobalCommands.validPerms.indexOf(permissionOrCalledCmd) == -1) return Command.info([['Permissions', 'That perm doesn\'t exist!']]);

		var wasPermAdded = server.removePermFrom('users', userIdFull, permissionOrCalledCmd);

		if (wasPermAdded) {
			message.channel.send(Command.error([['Permissions', 'Removed ' + permissionOrCalledCmd + ' from ' + userIdFull]]));
		} else {
			message.channel.send(Command.error([['Permissions', 'Failed']]));
		}
	} else if (calledCmd == 'group') {
		var groupName = params.shift();
		if (permissionOrCalledCmd == null || groupName == null) return Command.error([['Permissions', 'Invalid Parameters']]);

		if (permissionOrCalledCmd == 'add') {
			if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_ADD)) return Command.noPermsMessage('Permissions');

			var wasPermAdded = server.addGroupTo('users', userIdFull, groupName.toLowerCase());

			if (wasPermAdded) {
				message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + userIdFull]]));
			} else {
				message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
			}
		} else if (permissionOrCalledCmd == 'remove') {
			if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_REMOVE)) return Command.noPermsMessage('Permissions');

			var wasPermAdded = server.removeGroupFrom('users', userIdFull, groupName.toLowerCase());

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