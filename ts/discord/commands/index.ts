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

import HelpCommand = require('./help');
import RegisterCommand = require('./register');
import CreateCommand = require('./create');
import RemoveCommand = require('./remove');

import BaseCommand = require('../command');
import * as Discord from 'discord.js';

import CommandManger = require('../../command-manager');

// let redisGuildsClient = redis.createClient({ db: '0' });



let defaultCommands: Array<BaseCommand> = [];

addCommand(new HelpCommand());
addCommand(new RegisterCommand());
addCommand(new CreateCommand());
addCommand(new RemoveCommand());

let Manager = {
	parseMessage(message: string) {
		let parts = message.split(' ');
		let messageCommand = parts[0].toLowerCase();

		for (let i = 0; i < defaultCommands.length; i++) {
			let command = defaultCommands[i];

			if (command.is(messageCommand)) {
				// check if user has the perms.

				let fixedParams = CommandManger.getProperParam(parts, command.params);

				return command.params[fixedParams.pos].cb(fixedParams.newParams);
			}
		}

		return null;
	},
	is(commandName: string) {
		for (var i = 0; i < defaultCommands.length; i++) {
			if (defaultCommands[i].is(commandName)) return true;
		}

		return false;
	}
};

function addCommand(command: BaseCommand) {
	defaultCommands.push(command);
}

export = Manager;