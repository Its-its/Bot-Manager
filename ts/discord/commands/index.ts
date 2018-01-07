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


// let redisGuildsClient = redis.createClient({ db: '0' });



let defaultCommands: Array<Command> = [];

process.nextTick(() => {
	addCommand(require('./misc'));
	addCommand(require('./moderation'));
	addCommand(require('./manager'));
	addCommand(require('./moderator'));
	addCommand(require('./music'));
	addCommand(require('./roles'));
});

function parseMessage(message: string, userOptions, defaultMessage: Discord.Message) {
	let parts = message.split(' ');
	let messageCommand = parts[0].toLowerCase();

	for (let i = 0; i < defaultCommands.length; i++) {
		let command = defaultCommands[i];

		if (command.is(messageCommand)) {
			// TODO: check if user has the perms.

			if (command.validate(parts.slice(1))) {
				let fixedParams = CommandManger.getProperParam(parts, command.params);
				return command.params[fixedParams.pos].cb(fixedParams.newParams, userOptions, defaultMessage);
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

function addCommand(command: Command | Array<Command>) {
	if (Array.isArray(command)) return command.forEach(c => addCommand(c));
	defaultCommands.push(command);
}

export { parseMessage, is, get };