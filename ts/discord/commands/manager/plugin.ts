import Command = require('../../command');


let pluginNames = [
	'Commands',
	'Music',
	'Interval',
	'RSS',
	'Logs'
];

let plugins = pluginNames.map(p => p.toLowerCase());


class Plugin extends Command {
	constructor() {
		super(['plugin', 'plugins']);

		this.perms = [
			'commands.plugin'
		].concat([
			'list',
			'enable',
			'disable',
			'perms'
		].map(i => 'commands.plugin.' + i));

		this.addParams(0, (params, server, message) => {
			if (params.length == 0) {
				message.channel.send(Command.info([
					[	'Command Usage',
						[	'list', 
							'enable <name/all>', 
							'disable <name/all>',
							'perms <plugin> <none/strict>'
						].map(b => '!plugin ' + b).join('\n')
					]
				]));
				return;
			}

			switch (params.shift()) {
				case 'list':
					if (!server.userHasPerm(message.member, 'commands.plugin.list')) return;

					message.channel.send(Command.info([
						[
							'Plugin List',
							Command.table(['Name', 'Active', 'Perms'], pluginNames.map(name => {
								var plugin = server.plugins[name.toLowerCase()];
								return [
									name,
									((plugin == null ? true : plugin.enabled) ? 'Enabled' : 'Disabled'),
									((plugin == null ? true : plugin.perms) ? 'Forced' : 'Lenient')
								]
							}))
						]
					]));
					return;
				case 'enable':
					if (!server.userHasPerm(message.member, 'commands.plugin.enable')) return;

					var type = params.shift();
					if (type == null) return;

					if (type == 'all') {
						plugins.forEach(p => {
							if (server.plugins[p] != null) {
								server.plugins[p].enabled = true;
							} else {
								server.plugins[p] = { enabled: true, perms: true };
							}
						});
						message.channel.send(Command.info([
							[ 'Plugin', 'Enabled All Plugins' ]
						]));
					} else {
						var index = plugins.indexOf(type);
						if (index != -1) {
							if (server.plugins[type] != null) {
								server.plugins[type].enabled = true;
							} else {
								server.plugins[type] = { enabled: true, perms: true };
							}

							message.channel.send(Command.info([
								[ 'Plugin', 'Enabled ' + type ]
							]));
						} else {
							message.channel.send(Command.info([
								[	'Plugin',
									[	'No plugin exists with the name "' + type + '"',
										'Please use one of the following:',
										' - ' + plugins.join(', ')
									].join('\n') ]
							]));
						}
					}
					break;
				case 'disable':
					if (!server.userHasPerm(message.member, 'commands.plugin.disable')) return;

					var type = params.shift();
					if (type == null) return;

					if (type == 'all') {
						plugins.forEach(p => {
							if (server.plugins[p] != null) {
								server.plugins[p].enabled = false;
							} else {
								server.plugins[p] = { enabled: false, perms: true };
							}
						});
						message.channel.send(Command.info([
							[ 'Plugin', 'Disabled All Plugins' ]
						]));
					} else {
						var index = plugins.indexOf(type);
						if (index != -1) {
							if (server.plugins[type] != null) {
								server.plugins[type].enabled = false;
							} else {
								server.plugins[type] = { enabled: false, perms: true };
							}

							message.channel.send(Command.info([[ 'Plugin', 'Disabled Plugin.' ]]));
						} else {
							message.channel.send(Command.info([
								[	'Plugin',
									[	'No plugin exists with the name "' + type + '"',
										'Please use one of the following:',
										' - ' + plugins.join(', ')
									].join('\n') ]
							]));
						}
					}
					break;
				case 'perms':
					if (!server.userHasPerm(message.member, 'commands.plugin.perms')) return;
					
					if (params.length != 2) return;
					var plugin = params.shift().toLowerCase();
					var setTo = params.shift().toLowerCase();

					if (plugins.indexOf(plugin) == -1) return Command.error([[ 'Plugin', 'Plugin ' + plugin + ' does not exist!' ]]);
					if (setTo != 'strict' && setTo != 'none') return Command.error([[ 'Plugin', 'Set to "strict" or "none"' ]]);

					var plug = server.plugins[plugin];
					var bool = setTo == 'strict';

					if (plug == null) {
						if (!bool) {
							server.plugins[plugin] = {
								enabled: true,
								perms: bool
							};
						} else return Command.error([[ 'Plugin', 'You cannot set, what\'s already been set!' ]]);
					} else {
						if (plug.perms != bool) plug.perms = bool;
						else return Command.error([[ 'Plugin', 'You cannot set, what\'s already been set!' ]]);
					}

					message.channel.send(Command.info([
						[ 'Plugin', 'Required perms for ' + plugin + ' now set to ' + setTo ]
					]));
					break;
				default: return;
			}

			server.save();
		});
	}
}

export = Plugin;