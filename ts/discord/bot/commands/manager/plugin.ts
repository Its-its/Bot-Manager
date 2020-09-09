import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

import Command = require('../../command');

// TODO: ?? Relocate Commands to activate/deactivate.

const displayNames = [
	'Commands',
	'Logs',
	'Leveling',
	'Events'
];

const plugins = displayNames.map(p => p.toLowerCase());


const PERMISSIONS = {
	MAIN: 'commands.plugin',
	LIST: 'list',
	ENABLE: 'enable',
	DISABLE: 'disable'
};

for(let name in PERMISSIONS) {
	// @ts-ignore
	if (name != 'MAIN') PERMISSIONS[name] = `${PERMISSIONS.MAIN}.${PERMISSIONS[name]}`;
}


class Plugin extends Command {
	constructor() {
		super(['plugin', 'plugins']);

		this.description = 'Used to enable/disable parts of the bot.';

		this.perms = Object.values(PERMISSIONS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			await message.channel.send(Command.info([
				[ 'Description', this.description ],
				[	'Command Usage',
					[	'list',
						'enable <name/all>',
						'disable <name/all>'
					].join('\n')
				]
			]));

			return Promise.resolve();
		}

		switch (params.shift()) {
			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMISSIONS.LIST)) return Command.noPermsMessage('Plugin');

				await message.channel.send(Command.table(['Name', 'Active'], plugins.map((name, i) => {
					return [
						displayNames[i],
						(server.isPluginEnabled(name) ? 'Enabled' : 'Disabled')
					]
				})));

				return Promise.resolve();
			}

			case 'enable': {
				if (!this.hasPerms(message.member!, server, PERMISSIONS.ENABLE)) return Command.noPermsMessage('Plugin');

				let pluginName = params.shift();
				if (pluginName == null) return Command.error([['Plugin', 'Invalid Params']]);

				pluginName = pluginName.toLowerCase();

				if (pluginName == 'all') {
					plugins.forEach(p => {
						if (server.plugins[p] != null) {
							server.plugins[p]!.enabled = true;
						} else {
							server.plugins[p] = { enabled: true };
						}
					});

					await message.channel.send(Command.info([
						[ 'Plugin', 'Enabled All Plugins' ]
					]));
				} else {
					let indexOfPlugin = plugins.indexOf(pluginName);

					if (indexOfPlugin != -1) {
						if (server.plugins[pluginName] != null) {
							server.plugins[pluginName]!.enabled = true;
						} else {
							server.plugins[pluginName] = { enabled: true };
						}

						await message.channel.send(Command.info([
							[ 'Plugin', 'Enabled ' + pluginName ]
						]));
					} else {
						await message.channel.send(Command.info([
							[	'Plugin',
								[	'No plugin exists with the name "' + pluginName + '"',
									'Please use one of the following:',
									' - ' + plugins.join(', ')
								].join('\n') ]
						]));
					}
				}

				break;
			}

			case 'disable': {
				if (!this.hasPerms(message.member!, server, PERMISSIONS.DISABLE)) return Command.noPermsMessage('Plugin');

				let pluginName = params.shift();
				if (pluginName == null) return Command.error([['Plugin', 'Invalid Params']]);

				if (pluginName == 'all') {
					plugins.forEach(p => {
						// @ts-ignore
						if (server.plugins[p] != null) {
							// @ts-ignore
							server.plugins[p].enabled = false;
						} else {
							// @ts-ignore
							server.plugins[p] = { enabled: false };
						}
					});

					await message.channel.send(Command.info([
						[ 'Plugin', 'Disabled All Plugins' ]
					]));
				} else {
					let indexOfPlugin = plugins.indexOf(pluginName);

					if (indexOfPlugin != -1) {
						// @ts-ignore
						if (server.plugins[pluginName] != null) {
							// @ts-ignore
							server.plugins[pluginName].enabled = false;
						} else {
							// @ts-ignore
							server.plugins[pluginName] = { enabled: false };
						}

						await message.channel.send(Command.info([[ 'Plugin', 'Disabled Plugin.' ]]));
					} else {
						await message.channel.send(Command.info([
							[
								'Plugin',
								[
									'No plugin exists with the name "' + pluginName + '"',
									'Please use one of the following:',
									' - ' + plugins.join(', ')
								].join('\n')
							]
						]));
					}
				}

				break;
			}
			// case 'perms':
			// 	if (!server.userHasPerm(message.member!, 'commands.plugin.perms')) return;

			// 	if (params.length != 2) return;
			// 	let plugin = params.shift().toLowerCase();
			// 	let setTo = params.shift().toLowerCase();

			// 	if (plugins.indexOf(plugin) == -1) return Command.error([[ 'Plugin', 'Plugin ' + plugin + ' does not exist!' ]]);
			// 	if (setTo != 'strict' && setTo != 'lenient') return Command.error([[ 'Plugin', 'Set to "strict" or "lenient"' ]]);

			// 	let plug = server.plugins[plugin];
			// 	let isStrict = (setTo == 'strict');

			// 	if (plug == null) {
			// 		if (!isStrict) {
			// 			server.plugins[plugin] = {
			// 				enabled: true,
			// 				perms: isStrict
			// 			};
			// 		} else return Command.error([[ 'Plugin', 'You cannot set, what\'s already been set!' ]]);
			// 	} else {
			// 		if (plug.perms != isStrict) plug.perms = isStrict;
			// 		else return Command.error([[ 'Plugin', 'You cannot set, what\'s already been set!' ]]);
			// 	}

			// 	message.channel.send(Command.info([
			// 		[ 'Plugin', 'Required perms for ' + plugin + ' now set to ' + setTo ]
			// 	]));
			// 	break;
			default: return Promise.resolve();
		}

		await server.save();

		return Promise.resolve();
	}
}

export = Plugin;