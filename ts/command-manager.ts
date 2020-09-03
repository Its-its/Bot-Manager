import { DiscordBot, Nullable } from "../typings/manager";

// TODO: Completely seperate from discord.

type UserConfig = {
	commands: Command[];
};

interface DefaultCommands {
	parseMessage(message: string, userConfig: any, extra: any): Promise<any>;
	get(commandName: string): any;
}

async function parseMessageForCmd(defaultCommands: DefaultCommands, userConfig: UserConfig, message: string, extra: any): Promise<DiscordBot.PhraseResponses[] | null> {
	let parts = message.split(' ');
	let messageCommand = parts[0].toLowerCase();

	// Check default made commands first.
	let parsed = await defaultCommands.parseMessage(message, userConfig, extra);

	if (parsed != null) {
		return Array.isArray(parsed) ? parsed : [parsed];
	}

	// Check user-made commands.
	if (userConfig.commands.length != 0) {
		for (let i = 0; i < userConfig.commands.length; i++) {
			let command = userConfig.commands[i];

			if (command.alias.indexOf(messageCommand) != -1) {
				let fixedParams = getProperParam(parts, command.params);

				console.log('[CommMan]: Command: ' + message);

				if (fixedParams == null) {
					console.error('command Manager: fixedParams returned null');
					return null;
				}

				let calls = dealWithOnCalled(
					userConfig.commands,
					fixedParams.newParams,
					command.params[fixedParams.pos],
					command.params
				);

				if (calls == null) {
					console.error('command Manager: dealWithOnCalled returned null');
					return null;
				}

				return Array.isArray(calls) ? calls : [calls];
			}
		}
	}

	return null;
}

function hasPermissions(defaultCommands: DefaultCommands, message: string, isAdmin: boolean): boolean {
	if (isAdmin) return true;

	let parts = message.split(' ');
	let command = message[0].toLowerCase();

	//

	return false;
}

function dealWithOnCalled(
	commands: Array<Command>,
	messageParams: Array<string>,
	usedParam: CommandParam,
	allParams?: Array<CommandParam>): Nullable<DiscordBot.PhraseResponses> {

	let response = usedParam.onCalled || usedParam.response;

	if (response == null) {
		console.log(messageParams);
		return null;
	}

	// if (typeof response == 'string') {
	// 	let calledText = response.split(' ');

	// 	switch(calledText.shift().toLowerCase()) {
	// 		case 'echo': return { type: 'echo', message: calledText.join(' ') };
	// 		case 'set':
	// 			let command = calledText.shift();
	// 			let paramId = parseInt(calledText.shift());

	// 			let newValue = calledText.join(' '); // TODO: Fix new Value
	// 			messageParams.forEach((m, i) => newValue = newValue.replace('%' + i, m));


	// 			let guildCommand = getCommand(commands, command);
	// 			let commandParam = getParam(guildCommand, paramId);

	// 			let oldValue = commandParam.onCalled;

	// 			commandParam.onCalled = newValue;

	// 			return {
	// 				type: 'set',
	// 				command: command,
	// 				paramId: paramId,
	// 				oldValue: oldValue,
	// 				newValue: newValue
	// 			};
	// 	}
	// } else
	return response;
}

function getCommand(commands: Array<Command>, command: string): Nullable<Command> {
	for (let i = 0; i < commands.length; i++) {
		if (commands[i].alias.indexOf(command) != -1) return commands[i];
	}

	return null;
}

function getProperParam(message: string[], params: Array<CommandParam>): Nullable<{ pos: number; newParams: Array<string>; }> {
	for (let a = 0; a < params.length; a++) {
		let param = params[a];

		if (param.length != null) {
			if (param.length != message.length - 1) continue;
			return { pos: a, newParams: removeEmptiesFromArray(message) };
		} else {
			if ((param.minLength != null && param.minLength > message.length - 1) ||
				(param.maxLength == -1 ? false : param.maxLength != null && param.maxLength < message.length - 1)
			) continue;

			let paramReg = param.paramReg;

			if (paramReg != null) {
				let parts = paramReg.split(' ');

				let messageRemains = message;

				let newMessageParams: string[] = [];
				newMessageParams.push(<string>messageRemains.shift());

				parts.forEach(part => {
					let points = parseInt(part);

					let array = [];

					while (messageRemains.length != 0 && array.length != points) {
						array.push(messageRemains.shift());
					}

					newMessageParams.push(array.join(' '));
				});

				return { pos: a, newParams: removeEmptiesFromArray(newMessageParams) };
			}

			return { pos: a, newParams: removeEmptiesFromArray(message) };
		}
	}

	return null;
}

function removeEmptiesFromArray(msg: string[]) { return msg.slice(1).filter(t => t.length != 0); }


function getParam(command: Command, id: number): CommandParam {
	return command.params[id];
}

function getCommandParam(commandName: string, id: number, commands: Array<Command>): Nullable<CommandParam> {
	let command = getCommand(commands, commandName);

	if (command == null) return null;

	let param = getParam(command, id);

	return param;
}

/**
 * Returns if you did the prefix or @'d the bot.
 *
 * If it starts with a prefix
 *
 * If it starts with bots' @
 */
function isCallingCommand(prefix: string, userId: string, message: string) {
	return message[0] == prefix || message.indexOf(`<@${userId}>`) == 0 || message.indexOf(`<@!${userId}>`) == 0;
}

/**
 * Returns the actual message from the command.
 *
 * If it starts with a prefix remove it and return the rest.
 *
 * If it starts with bots' @ then remove it and return the rest.
 */
function getCommandMessage(prefix: string, userId: string, message: string) {
	if (message[0] == prefix) return message.substr(1);

	let myId = `<@${userId}>`;

	if (message.indexOf(myId) != 0) {
		myId = `<@!${userId}>`;
		if (message.indexOf(myId) != 0) return null;
	}

	return message.substr(myId.length).trim();
}



export = {
	parseMessageForCmd,
	dealWithOnCalled,
	getCommand,
	getProperParam,
	fix: removeEmptiesFromArray,
	getParam,
	getCommandParam,
	isCallingCommand,
	getCommandMessage,
	hasPermissions
};


// interface ParseMessageCB {
// 	(value: ParseMessageDef<"error">): void;
// 	(value: ParseMessageEcho): void;
// 	(value: ParseMessageRemove): void;
// 	(value: ParseMessageCreate): void;
// }

// interface ParseMessageDef<T> {
// 	[name: string]: any;

// 	type: T;
// 	reply?: boolean;
// }

// interface ParseMessageEcho extends ParseMessageDef<"echo"> {
// 	message: string;
// 	embed?: Discord.MessageEmbedOptions;
// }

// interface ParseMessageRemove extends ParseMessageDef<"remove"> {
// 	commandName: string;
// 	paramId: number;
// }

// interface ParseMessageCreate extends ParseMessageDef<"create"> {
// 	commandName: string;
// 	message: string;
// }

// interface ParseMessageSet extends ParseMessageDef<"set"> {
// 	newValue: string;
// 	command: string;
// 	paramId: number;
// }



interface Command {
	alias: string[];
	params: CommandParam[];
}

interface CommandParam {
	onCalled?: DiscordBot.PhraseResponses;
	response?: DiscordBot.PhraseResponses;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: string[], userOptions: any, defaultMessage: any) => any;
};
