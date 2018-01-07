import * as Discord from 'discord.js';


function parseMessage(defaultCommands, userConfig, message: string, defaultMessage, cb: ParseMessageCB) {
	var parts = message.split(' ');
	var messageCommand = parts[0].toLowerCase();

	// Check defaultCommands first.
	var parsed = defaultCommands.parseMessage(message, userConfig, defaultMessage);
	if (parsed != null) {
		if (Array.isArray(parsed)) {
			for (var a = 0; a < parsed.length; a++) cb(parsed[a]);
		} else cb(parsed);

		return;
	}

	if (userConfig.commands.length != 0)
		for (var i = 0; i < userConfig.commands.length; i++) {
			var command = userConfig.commands[i];
			
			if (command.commandName.indexOf(messageCommand) != -1) {
				// check if user has the perms.
	
				var fixedParams = getProperParam(parts, command.params);
				
				var calls = dealWithOnCalled(
					userConfig.commands,
					fixedParams.newParams,
					command.params[fixedParams.pos],
					command.params);

				if (Array.isArray(calls)) {
					for (var a = 0; a < calls.length; a++) cb(calls[a]);
				} else cb(calls);
			}
		}

	cb({ type: "error" });
}

function dealWithOnCalled(
	commands: Array<Command>, 
	messageParams: Array<string>, 
	usedParam: CommandParam, 
	allParams?: Array<CommandParam>): any {

	if (usedParam.onCalled == null) return { type: 'nil', messageParams: messageParams};

	var onCalled = usedParam.onCalled.split(' ');

	switch(onCalled.shift().toLowerCase()) {
		case 'echo': return { type: 'echo', message: onCalled.join(' ') };
		case 'set':
			var command = onCalled.shift();
			var paramId = parseInt(onCalled.shift());

			var newValue = onCalled.join(' ');
			messageParams.forEach((m, i) => newValue = newValue.replace('%' + i, m));


			var guildCommand = getCommand(commands, command);
			var commandParam = getParam(guildCommand, paramId);

			var oldValue = commandParam.onCalled;

			commandParam.onCalled = newValue;
	
			return {
				type: 'set',
				command: command,
				paramId: paramId,
				oldValue: oldValue,
				newValue: newValue
			};
	}
}

function getCommand(commands: Array<Command>, command: string): Command {
	for (var i = 0; i < commands.length; i++) {
		if (commands[i].commandName.indexOf(command) != -1) return commands[i];
	}

	return null;
}

function getProperParam(message: string[], params: Array<CommandParam>): { pos: number; newParams: Array<string>; } {
	for (var a = 0; a < params.length; a++) {
		var param = params[a];

		if (param.length != null) {
			if (param.length != message.length - 1) continue;
			return {
				pos: a,
				newParams: message.slice(1)
			};
		} else {
			if (param.minLength > message.length - 1 || (param.maxLength == -1 ? false : param.maxLength < message.length - 1)) continue;

			var paramReg = param.paramReg;

			if (paramReg != null) {
				var parts = paramReg.split(' ');

				var messageRemains = message;

				var newMessageParams = [];
				newMessageParams.push(messageRemains.shift());

				parts.forEach((part) => {
					var points = parseInt(part);

					var array = [];

					while (messageRemains.length != 0 && array.length != points) {
						array.push(messageRemains.shift());
					}

					newMessageParams.push(array.join(' '));
				});

				return { pos: a, newParams: newMessageParams.slice(1) };
			}

			return { pos: a, newParams: message.slice(1) };
		}
	}

	return null;
}

function getParam(command: Command, id: number): CommandParam {
	for (var i = 0; i < command.params.length; i++) {
		var param = command.params[i];
		if (param.id == id) return param;
	}

	return null;
}

function getCommandParam(commandName: string, id: number, commands: Array<Command>): CommandParam {
	var command = getCommand(commands, commandName);
	var param = getParam(command, id);

	return param;
}

function isCallingCommand(userId: string, message: string) {
	return message[0] == '!' || message.indexOf(`<@${userId}>`) == 0;
}

function getCommandMessage(userId: string, message: string) {
	if (message[0] == '!') return message.substr(1);
	
	var myId = `<@${userId}>`;

	if (message.indexOf(myId) != 0) return null;

	return message.substr(myId.length).trim();
}



export = {
	parseMessage,
	dealWithOnCalled,
	getCommand,
	getProperParam,
	getParam,
	getCommandParam,
	isCallingCommand,
	getCommandMessage
};


interface ParseMessageCB {
	(value: ParseMessageDef<"error">): void;
	(value: ParseMessageEcho): void;
	(value: ParseMessageRemove): void;
	(value: ParseMessageCreate): void;
}

interface ParseMessageDef<T> {
	[name: string]: any;

	type: T;
	reply?: boolean;
}

interface ParseMessageEcho extends ParseMessageDef<"echo"> {
	message: string;
	embed?: Discord.RichEmbedOptions;
}

interface ParseMessageRemove extends ParseMessageDef<"remove"> {
	commandName: string;
	paramId: number;
}

interface ParseMessageCreate extends ParseMessageDef<"create"> {
	commandName: string;
	message: string;
}

interface ParseMessageSet extends ParseMessageDef<"set"> {
	newValue: string;
	command: string;
	paramId: number;
}



interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParam>;
}

interface CommandParam {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: Array<string>, userOptions: any, defaultMessage: any) => any;
};
