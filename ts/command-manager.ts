import { DiscordBot, Nullable } from "../typings/manager";

// TODO: Completely seperate from discord.

interface DefaultCommands {
	parseMessage: (message: string, userConfig: any, extra: any) => any;
	get: (commandName: string) => any;
}

function parseMessageForCmd(defaultCommands: DefaultCommands, userConfig: any, message: string, extra: any, cb: (obj: DiscordBot.PhraseResponses) => void): boolean {
	var parts = message.split(' ');
	var messageCommand = parts[0].toLowerCase();

	// Check default made commands first.
	var parsed = defaultCommands.parseMessage(message, userConfig, extra);
	if (parsed != null) {
		if (Array.isArray(parsed)) {
			for (var a = 0; a < parsed.length; a++) cb(parsed[a]);
		} else cb(parsed);

		return true;
	}

	// Check user-made commands.
	if (userConfig.commands.length != 0) {
		for (var i = 0; i < userConfig.commands.length; i++) {
			var command: Command = userConfig.commands[i];

			if (command.alias.indexOf(messageCommand) != -1) {
				var fixedParams = getProperParam(parts, command.params);

				console.log('[CommMan]: Command: ' + message);

				if (fixedParams == null) {
					console.error('command Manager: fixedParams returned null');
					return false;
				}

				var calls = dealWithOnCalled(
					userConfig.commands,
					fixedParams.newParams,
					command.params[fixedParams.pos],
					command.params);

				if (calls == null) {
					console.error('command Manager: dealWithOnCalled returned null');
					return false;
				}

				if (Array.isArray(calls)) {
					for (var a = 0; a < calls.length; a++) cb(calls[a]);
				} else cb(calls);

				return true;
			}
		}
	}

	return false;
}

function hasPermissions(defaultCommands: DefaultCommands, message: string, isAdmin: boolean): boolean {
	if (isAdmin) return true;

	var parts = message.split(' ');
	var command = message[0].toLowerCase();

	//

	return false;
}

function dealWithOnCalled(
	commands: Array<Command>,
	messageParams: Array<string>,
	usedParam: CommandParam,
	allParams?: Array<CommandParam>): Nullable<DiscordBot.PhraseResponses> {

	var response = usedParam.onCalled || usedParam.response;

	if (response == null) {
		console.log(messageParams);
		return null;
	}

	// if (typeof response == 'string') {
	// 	var calledText = response.split(' ');

	// 	switch(calledText.shift().toLowerCase()) {
	// 		case 'echo': return { type: 'echo', message: calledText.join(' ') };
	// 		case 'set':
	// 			var command = calledText.shift();
	// 			var paramId = parseInt(calledText.shift());

	// 			var newValue = calledText.join(' '); // TODO: Fix new Value
	// 			messageParams.forEach((m, i) => newValue = newValue.replace('%' + i, m));


	// 			var guildCommand = getCommand(commands, command);
	// 			var commandParam = getParam(guildCommand, paramId);

	// 			var oldValue = commandParam.onCalled;

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
	for (var i = 0; i < commands.length; i++) {
		if (commands[i].alias.indexOf(command) != -1) return commands[i];
	}

	return null;
}

function getProperParam(message: string[], params: Array<CommandParam>): Nullable<{ pos: number; newParams: Array<string>; }> {
	for (var a = 0; a < params.length; a++) {
		var param = params[a];

		if (param.length != null) {
			if (param.length != message.length - 1) continue;
			return { pos: a, newParams: removeEmptiesFromArray(message) };
		} else {
			if ((param.minLength != null && param.minLength > message.length - 1) ||
				(param.maxLength == -1 ? false : param.maxLength != null && param.maxLength < message.length - 1)
			) continue;

			var paramReg = param.paramReg;

			if (paramReg != null) {
				var parts = paramReg.split(' ');

				var messageRemains = message;

				var newMessageParams: string[] = [];
				newMessageParams.push(<string>messageRemains.shift());

				parts.forEach(part => {
					var points = parseInt(part);

					var array = [];

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
	var command = getCommand(commands, commandName);

	if (command == null) return null;

	var param = getParam(command, id);

	return param;
}

function isCallingCommand(prefix: string, userId: string, message: string) {
	return message[0] == prefix || message.indexOf(`<@${userId}>`) == 0 || message.indexOf(`<@!${userId}>`) == 0;
}

function getCommandMessage(prefix: string, userId: string, message: string) {
	if (message[0] == prefix) return message.substr(1);

	var myId = `<@${userId}>`;

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
	id: string;
	alias: string[];
	disabled?: boolean;
	enabled: boolean;
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
