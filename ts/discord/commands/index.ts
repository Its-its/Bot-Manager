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

import Server = require('../discordserver');


let categoryCommands: { [category: string]: Command[] } = {};
let defaultCommands: Command[] = [];

let validPerms: string[] = [
	'commands.bypasstoggle'
];

process.nextTick(() => {
	addCommand(require('./misc'), 'Misc');
	addCommand(require('./moderation'), 'Moderation');
	addCommand(require('./manager'), 'Manager');
	addCommand(require('./plugins'), 'Plugins');
	addCommand(require('./roles'), 'Roles');
	addCommand(require('./owner'), 'Owner');
});

function parseMessage(message: string, server: Server, defaultMessage: Discord.Message) {
	var parts = [];
	var toFix = message.split(' ');

	// fixes \n ex: "!replace list\n```\nitem\n```" https://i.thick.at/HydrographicalFrances.png
	for(var i = 0; i < toFix.length; i++) {
		var part = toFix[i];

		if (part.includes('\n')) {
			var split = part.split('\n');
			parts.push(...split);
		} else {
			parts.push(part);
		}
	}

	var messageCommand = parts[0].toLowerCase();

	for (var i = 0; i < defaultCommands.length; i++) {
		var command = defaultCommands[i];

		if (command.is(messageCommand)) {
			if (!defaultMessage.member.hasPermission('ADMINISTRATOR')) {

				if (command.perms.length != 0 &&
					!(server.userHasAnyChildPerm(defaultMessage.member.id, command.perms) || server.rolesHaveAnyChildPerm(defaultMessage.member.roles.keyArray(), command.perms))
				) return;
			}

			console.log('[DefComm]: ' + message);

			return command.call(CommandManger.fix(parts), server, defaultMessage);
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

function addCommand(command: Command | Command[], category: string, hidden?: boolean) {
	if (Array.isArray(command)) return command.forEach(c => addCommand(c, category, hidden));

	if (command.perms == null || command.perms.length == 0) console.log('No perms for ' + command.commandName[0]);

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