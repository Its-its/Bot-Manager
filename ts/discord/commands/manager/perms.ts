import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');
import Commands = require('../index');

/*
* The permissions system works like this:
* 		If you have "commands.perms.user" then you have access to "commands.perms.user.*"
*		If you have "commands" then you have access to "commands.*" except for "commands.bypasstoggle"
*/

// TODO: Ensure "Groups" is working properly.

const PERMISSIONS = {
	MAIN: 'commands.perms',
	LIST: 'list',
	USER: 'user',
	USER_LIST: 'user.list',
	USER_ADD: 'user.add',
	USER_REMOVE: 'user.remove',
	ROLE: 'role',
	ROLE_LIST: 'role.list',
	ROLE_ADD: 'role.add',
	ROLE_REMOVE: 'role.remove',
	GROUP: 'group',
	GROUP_LIST: 'group.list',
	GROUP_CREATE: 'group.create',
	GROUP_ADD: 'group.add',
	GROUP_REMOVE: 'group.remove'
};

for(var name in PERMISSIONS) {
	if (name != 'MAIN') PERMISSIONS[name] = `${PERMISSIONS.MAIN}.${PERMISSIONS[name]}`;
}


class Perms extends Command {
	constructor() {
		super(['perms', 'permissions']);

		this.description = 'A permissions system for the bot.';

		this.perms = Object.values(PERMISSIONS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						// 'list <@user/@role/group>',
						'user <@user>',
						'user <@user> add <command/perm>',
						'user <@user> remove <command/perm>',
						// 'user <@user> group add <command/perm>',
						// 'user <@user> group remove <name>',
						'role <@role>',
						'role <@role> add <command/perm>',
						'role <@role> remove <command/perm>',
						// 'role <@role> group add <command/perm>',
						// 'role <@role> group remove <name>',
						'group <name>',
						'group create <Display Name> - A-Z 0-9 spaces',
						'group <name> add <command/perm>',
						'group <name> remove <command/perm>'
					]
					// .map(b => server.getPrefix() + 'perms ' + b)
					.join('\n')
				]]);
		}


		var comm = params.shift();

		switch (comm) {
			case 'list':
				if (!this.hasPerms(message.member, server, PERMISSIONS.LIST)) return Command.noPermsMessage('Perms');
				// var id = params.shift();
				// var type = getType(id);
				// if (type == null) return;

				// var permi = server.permissions[type][id];
				// if (permi == null) return;

				// message.channel.send(Command.info([
				// 	[	'Permissions',
				// 		[
				// 			type + ': ' + id
				// 		].concat(permi.perms.map(p => ' - ' + p))
				// 		.join('\n')
				// 	]
				// ]));
				break;
			case 'user':
				if (!this.hasPerms(message.member, server, PERMISSIONS.USER)) return Command.noPermsMessage('Perms');

				var user = params.shift();
				var doit = params.shift();
				var perm = params.shift();

				if (doit != null && perm == null) {
					return Command.error([['Permissions', 'Invalid Params']]);
				}

				if (doit == null) {
					if (!this.hasPerms(message.member, server, PERMISSIONS.USER_LIST)) return Command.noPermsMessage('Perms');

					var permi = server.getPermsFrom('users', user);
					if (permi == null) permi = { perms: [], groups: [] };

					var commands = <Command[]>Commands.list(true);

					var member = message.guild.members.get(server.strpToId(user));

					return Command.info([
						[	
							'Permissions',
							[ 'User: ' + user, 'Perms:' ]
							.concat(permi.perms.map(p => ' - ' + p))
							.concat(['Groups:'])
							.concat(permi.groups.map(p => ' - ' + p))
							.join('\n')
						],
						[
							'Commands',
							commands.map(c => 
								server.getPrefix() + c.commandName[0] + ' | ' + 
								c.hasPermsCount(member, server, c.perms) + '/' + c.perms.length  + ' | ' + 
								c.description
							).join('\n')
						]
					]);
				} else if (doit == 'add') {
					if (!this.hasPerms(message.member, server, PERMISSIONS.USER_ADD)) return Command.noPermsMessage('Perms');

					var added = server.addPermTo('users', user, perm);

					if (added) {
						message.channel.send(Command.error([['Permissions', 'Added ' + perm + ' to ' + user]]));
					} else {
						message.channel.send(Command.error([['Permissions', 'Failed']]));
					}
				} else if (doit == 'remove') {
					if (!this.hasPerms(message.member, server, PERMISSIONS.USER_REMOVE)) return Command.noPermsMessage('Perms');

					var added = server.removePermFrom('users', user, perm);

					if (added) {
						message.channel.send(Command.error([['Permissions', 'Removed ' + perm + ' from ' + user]]));
					} else {
						message.channel.send(Command.error([['Permissions', 'Failed']]));
					}
				} 
				// else if (doit == 'group') {
				// 	var groupName = params.shift();
				// 	if (perm == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

				// 	if (perm == 'add') {
				// 		var added = server.addGroupTo('users', user, groupName.toLowerCase());

				// 		if (added) {
				// 			message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + user]]));
				// 		} else {
				// 			message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
				// 		}
				// 	} else if (perm == 'remove') {
				// 		var added = server.removeGroupFrom('users', user, groupName.toLowerCase());

				// 		if (added) {
				// 			message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + user]]));
				// 		} else {
				// 			message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
				// 		}
				// 	} else return Command.error([['Permissions', 'Invalid Params']]);
				// }

				break;
			case 'role':
				if (!this.hasPerms(message.member, server, PERMISSIONS.ROLE)) return Command.noPermsMessage('Perms');

				var role = params.shift();
				var doit = params.shift();
				var perm = params.shift();

				if (doit != null && perm == null) {
					return Command.error([['Permissions', 'Invalid Params']]);
				}

				var roleId = server.strpToId(role);

				if (roleId == null) return Command.error([['Permissions', 'Invalid Role.']]);

				if (roleId == '@everyone') {
					var first = message.guild.roles.first();
					roleId = first.id;
				}
				
				if (doit == null) {
					if (!this.hasPerms(message.member, server, PERMISSIONS.ROLE_LIST)) return Command.noPermsMessage('Perms');

					var permi = server.getPermsFrom('roles', roleId);
					if (permi == null) permi = { perms: [], groups: [] };

					return Command.info([
						[	'Permissions',
							[ 'Role: ' + role + ' (' + roleId + ')', 'Perms:' ]
							.concat(permi.perms.map(p => ' - ' + p))
							.concat(['Groups:'])
							.concat(permi.groups.map(p => ' - ' + p))
							.join('\n')
						]
					]);
				} else if (doit == 'add') {
					if (!this.hasPerms(message.member, server, PERMISSIONS.ROLE_ADD)) return Command.noPermsMessage('Perms');

					var added = server.addPermTo('roles', roleId, perm);

					// TODO: Ensure perm exists.

					if (added) {
						message.channel.send(Command.error([['Permissions', 'Added ' + perm + ' to ' + role]]));
					} else {
						message.channel.send(Command.error([['Permissions', 'Failed']]));
					}
				} else if (doit == 'remove') {
					if (!this.hasPerms(message.member, server, PERMISSIONS.ROLE_REMOVE)) return Command.noPermsMessage('Perms');

					var added = server.removePermFrom('roles', roleId, perm);

					if (added) {
						message.channel.send(Command.error([['Permissions', 'Removed ' + perm + ' from ' + role]]));
					} else {
						message.channel.send(Command.error([['Permissions', 'Failed']]));
					}
				} 
				// else if (doit == 'group') {
				// 	var groupName = params.shift();
				// 	if (perm == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

				// 	if (perm == 'add') {
				// 		var added = server.addGroupTo('roles', roleId, groupName.toLowerCase());

				// 		if (added) {
				// 			message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + role]]));
				// 		} else {
				// 			message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
				// 		}
				// 	} else if (perm == 'remove') {
				// 		var added = server.removeGroupFrom('roles', roleId, groupName.toLowerCase());

				// 		if (added) {
				// 			message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + role]]));
				// 		} else {
				// 			message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
				// 		}
				// 	} else return Command.error([['Permissions', 'Invalid Params']]);
				// }

				break;
			case 'group':
				return Command.info([['Perms', 'Groups aren\'t implemented yet. Sorry :/']]);

				// if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP)) return Command.noPermsMessage('Perms');

				// var name = params.shift();
				
				// if (name == 'create') {
				// 	if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_CREATE)) return Command.noPermsMessage('Perms');

				// 	if (params.length == 0) return Command.error([['Permissions', 'Invalid Params']]);
				// 	var displayName = params.join(' ');

				// 	if (!/^[a-z0-9 ]+$/i.test(displayName)) return Command.error([['Permissions', 'Invalid Display Name. A-Z, 0-9, spaces only.']]);
				// 	if (!server.createGroup(displayName)) return Command.error([['Permissions', 'Group with that name already exists!']]);

				// 	return Command.success([
				// 		[
				// 			'Permissions',
				// 			[
				// 				'Sucessfully created Group',
				// 				'Display Name: ' + displayName,
				// 				'Name: ' + displayName.replace(/\s/, '').toLowerCase()
				// 			].join('\n')
				// 		]
				// 	]);
				// } else {
				// 	if (params.length != 2) return Command.error([['Permissions', 'Invalid Params']]);

				// 	var doit = params.shift();
				// 	var perm = params.shift();

				// 	if (doit == null) {
				// 		if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_LIST)) return Command.noPermsMessage('Perms');

				// 		var permis: any = server.getPermsFrom('groups', name);
				// 		if (permis == null) return Command.error([['Permissions', 'Group not valid']]);

				// 		message.channel.send(Command.info([
				// 			[	'Permissions',
				// 				[ 'Group: ' + permis.displayName, 'Name: ' + permis.name, 'Perms:' ]
				// 				.concat(permis.perms.map(p => ' - ' + p))
				// 				.join('\n')
				// 			]
				// 		]));

				// 		return;
				// 	} else if (doit == 'add') {
				// 		if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_ADD)) return Command.noPermsMessage('Perms');
				// 		server.addPermTo('groups', name, perm);
				// 	} else if (doit == 'remove') {
				// 		if (!this.hasPerms(message.member, server, PERMISSIONS.GROUP_REMOVE)) return Command.noPermsMessage('Perms');
				// 		server.removePermFrom('groups', name, perm);
				// 	}
				// }
				// break;
			default: return Command.error([['Permissions', 'Nope.']]);
		}

		server.save();
	}
}

export = Perms;