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
let defaultCommands: Array<Command> = [];

let validPerms: Array<string> = [
	'commands.bypasstoggle'
];

process.nextTick(() => {
	addCommand(require('./misc'), 'Misc');
	addCommand(require('./moderation'), 'Moderation');
	addCommand(require('./manager'), 'Manager');
	addCommand(require('./moderator'), 'Moderator');
	addCommand(require('./plugins'), 'Plugins');
	addCommand(require('./roles'), 'Roles');
});

function parseMessage(message: string, server: Server, defaultMessage: Discord.Message) {
	var parts = message.split(' ');
	var messageCommand = parts[0].toLowerCase();

	for (var i = 0; i < defaultCommands.length; i++) {
		var command = defaultCommands[i];

		if (command.is(messageCommand)) {
console.log('P1');
			if (!defaultMessage.member.hasPermission('ADMINISTRATOR')) {
				// TODO: Keep here or put in the command call?
				// If the member doesn't have any perms for it, return
				if (!server.rolesHaveAnyChildPerm(defaultMessage.member.roles.keyArray(), command.perms)) return;
			}
console.log('P2');
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