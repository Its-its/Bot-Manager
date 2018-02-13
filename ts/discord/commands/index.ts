// THIS IS A NICER WAY FOR V V V V 
// {
// 	commandName: [ 'ip' ],
// 	disabled: false,
// 	params: [
// 		{
// 			minPerms: 0,
// 			id: 1,
// 			minLength: 1,
// 			maxLength: -1,
// 			paramReg: '-1',
// 			onCalled: 'SET ip 0 ECHO %1'
// 		}
// 	]
// }

import redis = require('redis');

import Command = require('../command');

import CommandManger = require('../../command-manager');

import Discord = require('discord.js');

import Server = require('../guildClient');

let categoryCommands: { [category: string]: Command[] } = {};
let defaultCommands: Array<Command> = [];

let validPerms: Array<string> = [
	'commands.bypasstoggle'
];

process.nextTick(() => {
	addCommand(require('./misc'), 'Misc');
	addCommand(require('./moderation'), 'Moderation');
	addCommand(require('./manager'), 'Manager');
	addCommand(require('./moderator'), 'Moderator');
	addCommand(require('./music'), 'Music');
	addCommand(require('./roles'), 'Roles');
});

function parseMessage(message: string, server: Server.Server, defaultMessage: Discord.Message) {
	let parts = message.split(' ');
	let messageCommand = parts[0].toLowerCase();

	for (let i = 0; i < defaultCommands.length; i++) {
		let command = defaultCommands[i];

		if (command.is(messageCommand)) {
			// TODO: check if user has the perms.

			if (!defaultMessage.member.hasPermission('ADMINISTRATOR')) {
				var perm = command.perms[0];
				if (perm != null) {
					var p = perm.split('.', 2)[0].toLowerCase();
					var basePerms = server.userHasBasePerm(defaultMessage.member.id, perm);

					// forced perms? doesn't have base perms? return
					if ((server.plugins[p] == null || server.plugins[p].perms) && !basePerms) return;

					// Admin only command? Doesn't have base perms? return
					if (command.adminOnly && !basePerms) return;
				} else if (server.plugins.commands == null || server.plugins.commands.perms || command.adminOnly) return;
			}

			if (command.validate(parts.slice(1))) {
				let fixedParams = CommandManger.getProperParam(parts, command.params);
				return command.params[fixedParams.pos].cb(fixedParams.newParams, server, defaultMessage);
			} else {
				return { type: 'echo', message: 'Invalid Params!' };
			}
		}
	}

	return null;
}

function is(commandName: string) {
	for (var i = 0; i < defaultCommands.length; i++) {
		if (defaultCommands[i].is(commandName)) return true;
	}

	return false;
}

function get(commandName: string): Command {
	for (var i = 0; i < defaultCommands.length; i++) {
		if (defaultCommands[i].is(commandName)) return defaultCommands[i];
	}
	return null;
}

function addCommand(command: Command | Array<Command>, category: string) {
	if (Array.isArray(command)) return command.forEach(c => addCommand(c, category));

	validPerms = validPerms.concat(command.perms);
	defaultCommands.push(command);

	if (categoryCommands[category] == null)
		categoryCommands[category] = [];
	categoryCommands[category].push(command);
}

function list(flat = false) {
	return flat ? defaultCommands : categoryCommands;
}

export {
	validPerms,
	parseMessage, 
	is, 
	get,
	list
};