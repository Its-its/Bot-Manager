interface DefaultCommands {
	parseMessage: (message: string, userConfig, extra: any) => any;
	get: (commandName: string) => any;
}

function parseMessage(defaultCommands: DefaultCommands, userConfig, message: string, extra: any, cb: (obj: DiscordBot.PhraseResponses) => void) {
	var parts = message.split(' ');
	var messageCommand = parts[0].toLowerCase();

	// Check defaultCommands first.
	var parsed = defaultCommands.parseMessage(message, userConfig, extra);
	if (parsed != null) {
		if (Array.isArray(parsed)) {
			for (var a = 0; a < parsed.length; a++) cb(parsed[a]);
		} else cb(parsed);

		return;
	}

	if (userConfig.commands.length != 0)
		for (var i = 0; i < userConfig.commands.length; i++) {
			var command: Command = userConfig.commands[i];

			if (command.alias.indexOf(messageCommand) != -1) {
				//TODO: check if user has the perms.

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

	// cb({ type: "error" });
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
	allParams?: Array<CommandParam>): DiscordBot.PhraseResponses {

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

function getCommand(commands: Array<Command>, command: string): Command {
	for (var i = 0; i < commands.length; i++) {
		if (commands[i].alias.indexOf(command) != -1) return commands[i];
	}

	return null;
}

function getProperParam(message: string[], params: Array<CommandParam>): { pos: number; newParams: Array<string>; } {
	for (var a = 0; a < params.length; a++) {
		var param = params[a];

		if (param.length != null) {
			if (param.length != message.length - 1) continue;
			return { pos: a, newParams: fix(message) };
		} else {
			if (param.minLength > message.length - 1 || (param.maxLength == -1 ? false : param.maxLength < message.length - 1)) continue;

			var paramReg = param.paramReg;

			if (paramReg != null) {
				var parts = paramReg.split(' ');

				var messageRemains = message;

				var newMessageParams = [];
				newMessageParams.push(messageRemains.shift());

				parts.forEach(part => {
					var points = parseInt(part);

					var array = [];

					while (messageRemains.length != 0 && array.length != points) {
						array.push(messageRemains.shift());
					}

					newMessageParams.push(array.join(' '));
				});

				return { pos: a, newParams: fix(newMessageParams) };
			}

			return { pos: a, newParams: fix(message) };
		}
	}

	return null;
}

function fix(msg: string[]) { return msg.slice(1).filter(t => t.length != 0); }


function getParam(command: Command, id: number): CommandParam {
	return command.params[id];
}

function getCommandParam(commandName: string, id: number, commands: Array<Command>): CommandParam {
	var command = getCommand(commands, commandName);
	var param = getParam(command, id);

	return param;
}

function isCallingCommand(prefix: string, userId: string, message: string) {
	return message[0] == prefix || message.indexOf(`<@${userId}>`) == 0;
}

function getCommandMessage(prefix: string, userId: string, message: string) {
	if (message[0] == prefix) return message.substr(1);
	
	var myId = `<@${userId}>`;

	if (message.indexOf(myId) != 0) return null;

	return message.substr(myId.length).trim();
}



export = {
	parseMessage,
	dealWithOnCalled,
	getCommand,
	getProperParam,
	fix,
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
// 	embed?: Discord.RichEmbedOptions;
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
