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

import { Command } from '@discord/bot/command';

import CommandManger = require('../../../command-manager');

import Discord = require('discord.js');

import { Server } from '@discord/bot/GuildServer';
import { Nullable, DiscordBot } from '@type-manager';


let categoryCommands: { [category: string]: Command[] } = {};
let defaultCommands: Command[] = [];

let validPerms: string[] = [
	'commands.bypasstoggle'
];

const OWNER_ID = '96318357472550912';


function initCommands() {
	addCommand(require('./misc'), 'Misc');
	addCommand(require('./moderation'), 'Moderation');
	addCommand(require('./manager'), 'Manager');
	addCommand(require('./plugins'), 'Plugins');
	addCommand(require('./owner'), 'Owner');
	// addCommand(require('./roles'), 'Roles');
}

async function parseMessage(message: string, server: Server, defaultMessage: Discord.Message): Promise<DiscordBot.PhraseResponses | DiscordBot.PhraseResponses[] | null | undefined | void> {
	let parts = [];
	let toFix = message.split(' ');

	// fixes \n ex: "!replace list\n```\nitem\n```" https://i.thick.at/HydrographicalFrances.png
	for(let i = 0; i < toFix.length; i++) {
		let part = toFix[i];

		if (part.includes('\n')) {
			let split = part.split('\n');
			parts.push(...split);
		} else {
			parts.push(part);
		}
	}

	let messageCommand = parts[0].toLowerCase();

	for (let i = 0; i < defaultCommands.length; i++) {
		let command = defaultCommands[i];

		if (command.is(messageCommand)) {
			if (command.ownerOnly && defaultMessage.member!.id != OWNER_ID) return Promise.resolve(null);

			if (!defaultMessage.member!.hasPermission('ADMINISTRATOR')) {

				if (command.perms.length != 0 &&
					!(
						server.permissions.userHasAnyChildPerm(defaultMessage.member!.id, command.perms)
						|| server.permissions.rolesHaveAnyChildPerm(defaultMessage.member!.roles.cache.keyArray(), command.perms))
				) return Promise.resolve(null);
			}

			console.log('[DefComm]: ' + message);

			return command.call(CommandManger.fix(parts), server, defaultMessage);
		}
	}

	return Promise.resolve(null);
}

function is(commandName: string) {
	for (let i = 0; i < defaultCommands.length; i++) {
		if (defaultCommands[i].is(commandName)) return true;
	}

	return false;
}

function get(commandName: string): Nullable<Command> {
	for (let i = 0; i < defaultCommands.length; i++) {
		if (defaultCommands[i].is(commandName)) return defaultCommands[i];
	}

	return null;
}

function addCommand<C extends Command>(Cmd: (new () => C) | (new () => C)[], category: string, hidden?: boolean): void {
	if (Array.isArray(Cmd)) return Cmd.forEach(c => addCommand(c, category, hidden));

	const command = new Cmd();

	if (command.perms == null || command.perms.length == 0) console.log('No perms for ' + command.commandName[0]);

	validPerms = validPerms.concat(command.perms);
	defaultCommands.push(command);

	if (categoryCommands[category] == null) {
		categoryCommands[category] = [];
	}

	categoryCommands[category].push(command);
}

function list(flat = false) {
	return flat ? defaultCommands : categoryCommands;
}

export {
	initCommands,
	validPerms,
	parseMessage,
	is,
	get,
	list
};