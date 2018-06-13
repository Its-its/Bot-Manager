import Command = require('../../command');

var commandUsage = [
	// 'list <@user/@role/group>',
	'user <@user>',
	'user <@user> add <command/perm>',
	'user <@user> remove <command/perm>',
	'user <@user> group add <command/perm>',
	'user <@user> group remove <name>',
	'role <@role>',
	'role <@role> add <command/perm>',
	'role <@role> remove <command/perm>',
	'role <@role> group add <command/perm>',
	'role <@role> group remove <name>',
	'group <name>',
	'group create <Display Name> - A-Z 0-9 spaces',
	'group <name> add <command/perm>',
	'group <name> remove <command/perm>'
]
.map(b => '!perms ' + b)
.join('\n');

//! Check if user/group/role has base command. If so, YELL AT HIM
//! Ex: commands.plugins.list -> commands & commands.plugins

class Perms extends Command {
	constructor() {
		super(['perms', 'permissions']);

		this.perms = [
			'commands.perms'
		].concat([
			'list',
			'user',
			'user.list',
			'user.add',
			'user.remove',
			'role',
			'role.list',
			'role.add',
			'role.remove',
			'group',
			'group.list',
			'group.create',
			'group.add',
			'group.remove'
		].map(i => 'commands.perms.' + i));

		this.addParams(0, (params, server, message) => {
			if (params.length == 0) return Command.info([[ 'Command Usage', commandUsage ]]);

			var comm = params.shift();

			switch (comm) {
				case 'list':
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
					var user = params.shift();
					var doit = params.shift();
					var perm = params.shift();

					if (doit != null && perm == null)
						return Command.error([['Permissions', 'Invalid Params']]);

					if (doit == null) {
						var permi = server.getPermsFrom('users', user);
						if (permi == null) permi = { perms: [], groups: [] };

						return Command.info([
							[	'Permissions',
								[ 'User: ' + user, 'Perms:' ]
								.concat(permi.perms.map(p => ' - ' + p))
								.concat(['Groups:'])
								.concat(permi.groups.map(p => ' - ' + p))
								.join('\n')
							]
						]);
					} else if (doit == 'add') {
						var added = server.addPermTo('users', user, perm);

						if (added) {
							message.channel.send(Command.error([['Permissions', 'Added ' + perm + ' to ' + user]]));
						} else {
							message.channel.send(Command.error([['Permissions', 'Failed']]));
						}
					} else if (doit == 'remove') {
						var added = server.removePermFrom('users', user, perm);

						if (added) {
							message.channel.send(Command.error([['Permissions', 'Removed ' + perm + ' from ' + user]]));
						} else {
							message.channel.send(Command.error([['Permissions', 'Failed']]));
						}
					} else if (doit == 'group') {
						var groupName = params.shift();
						if (perm == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

						if (perm == 'add') {
							var added = server.addGroupTo('users', user, groupName.toLowerCase());

							if (added) {
								message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + user]]));
							} else {
								message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
							}
						} else if (perm == 'remove') {
							var added = server.removeGroupFrom('users', user, groupName.toLowerCase());

							if (added) {
								message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + user]]));
							} else {
								message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
							}
						} else return Command.error([['Permissions', 'Invalid Params']]);
					}

					break;
				case 'role':
					var role = params.shift();
					var doit = params.shift();
					var perm = params.shift();

					if (doit != null && perm == null)
						return Command.error([['Permissions', 'Invalid Params']]);
					
					if (doit == null) {
						var permi = server.getPermsFrom('roles', role);
						if (permi == null) permi = { perms: [], groups: [] };

						return Command.info([
							[	'Permissions',
								[ 'Role: ' + role, 'Perms:' ]
								.concat(permi.perms.map(p => ' - ' + p))
								.concat(['Groups:'])
								.concat(permi.groups.map(p => ' - ' + p))
								.join('\n')
							]
						]);
					} else if (doit == 'add') {
						var added = server.addPermTo('roles', role, perm);

						if (added) {
							message.channel.send(Command.error([['Permissions', 'Removed ' + perm + ' from ' + role]]));
						} else {
							message.channel.send(Command.error([['Permissions', 'Failed']]));
						}
					} else if (doit == 'remove') {
						var added = server.removePermFrom('roles', role, perm);

						if (added) {
							message.channel.send(Command.error([['Permissions', 'Removed ' + perm + ' from ' + role]]));
						} else {
							message.channel.send(Command.error([['Permissions', 'Failed']]));
						}
					} else if (doit == 'group') {
						var groupName = params.shift();
						if (perm == null || groupName == null) return Command.error([['Permissions', 'Invalid Params']]);

						if (perm == 'add') {
							var added = server.addGroupTo('roles', role, groupName.toLowerCase());

							if (added) {
								message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + role]]));
							} else {
								message.channel.send(Command.error([['Permissions', 'Invalid Group name']]));
							}
						} else if (perm == 'remove') {
							var added = server.removeGroupFrom('roles', role, groupName.toLowerCase());

							if (added) {
								message.channel.send(Command.error([['Permissions', 'Added ' + groupName + ' to ' + role]]));
							} else {
								message.channel.send(Command.error([['Permissions', 'Group does not exist']]));
							}
						} else return Command.error([['Permissions', 'Invalid Params']]);
					}

					break;
				case 'group':
					var name = params.shift();
					
					if (name == 'create') {
						if (params.length == 0) return Command.error([['Permissions', 'Invalid Params']]);
						var displayName = params.join(' ');

						if (!/^[a-z0-9 ]+$/i.test(displayName)) return Command.error([['Permissions', 'Invalid Display Name. A-Z, 0-9, spaces only.']]);
						if (!server.createGroup(displayName)) return Command.error([['Permissions', 'Group with that name already exists!']]);

						return Command.success([
							[
								'Permissions',
								[
									'Sucessfully created Group',
									'Display Name: ' + displayName,
									'Name: ' + displayName.replace(/\s/, '').toLowerCase()
								].join('\n')
							]
						]);
					} else {
						if (params.length != 2) return Command.error([['Permissions', 'Invalid Params']]);

						var doit = params.shift();
						var perm = params.shift();

						if (doit == null) {
							var permis: any = server.getPermsFrom('groups', name);
							if (permis == null) return Command.error([['Permissions', 'Group not valid']]);

							message.channel.send(Command.info([
								[	'Permissions',
									[ 'Group: ' + permis.displayName, 'Name: ' + permis.name, 'Perms:' ]
									.concat(permis.perms.map(p => ' - ' + p))
									.join('\n')
								]
							]));

							return;
						} else if (doit == 'add') {
							server.addPermTo('groups', name, perm);
						} else if (doit == 'remove') {
							server.removePermFrom('groups', name, perm);
						}
					}
					break;
				default: return Command.error([['Permissions', 'Nope.']]);
			}

			server.save();
		});
	}
}

export = Perms;