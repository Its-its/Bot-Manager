import Events = require('events');

class CommandManger {
	public customCommands: (cb: (commands: Array<Command>) => void) => void;
	public defaultCommands: { parseMessage(message: string); };

	constructor(
		customCommands: Array<Command> | ((cb: (commands: Array<Command>) => void) => void), 
		defaultCommands?: { parseMessage(message: string); }) {
		if (typeof customCommands == 'function') {
			this.customCommands = customCommands;
		} else this.customCommands = (cb) => cb(customCommands);

		this.defaultCommands = defaultCommands;
	}

	public parseMessage(message: string, cb: (value: ParseMessageCB) => void) {
		let parts = message.split(' ');
		let messageCommand = parts[0].toLowerCase();

		// Check defaultCommands first.
		let parsed = this.defaultCommands.parseMessage(message);
		if (parsed != null) {
			if (Array.isArray(parsed)) {
				for (var a = 0; a < parsed.length; a++) cb(parsed[a]);
			} else cb(parsed);

			return;
		}

		this.customCommands((commands) => {
			if (commands.length != 0)
			for (var i = 0; i < commands.length; i++) {
				let command = commands[i];
				
				if (command.commandName.indexOf(messageCommand) != -1) {
					// check if user has the perms.
		
					let fixedParams = CommandManger.getProperParam(parts, command.params);
					
					let calls = CommandManger.dealWithOnCalled(
						commands,
						fixedParams.newParams,
						command.params[fixedParams.pos],
						command.params);

					if (Array.isArray(calls)) {
						for (var a = 0; a < calls.length; a++) cb(calls[a]);
					} else cb(calls);
				}
			}

			cb({});
		});
	}

	static dealWithOnCalled(
		commands: Array<Command>, 
		messageParams: Array<string>, 
		usedParam: CommandParam, 
		allParams?: Array<CommandParam>): any {

		if (usedParam.onCalled == null) return { type: 'nil', messageParams: messageParams};

		let onCalled = usedParam.onCalled.split(' ');

		switch(onCalled.shift().toLowerCase()) {
			case 'echo': return { type: 'echo', message: onCalled.join(' ') };
			case 'set':
				let command = onCalled.shift();
				let paramId = parseInt(onCalled.shift());
	
				let newValue = onCalled.join(' ');
				messageParams.forEach((m, i) => newValue = newValue.replace('%' + i, m));
	
	
				let guildCommand = CommandManger.getCommand(commands, command);
				let commandParam = CommandManger.getParam(guildCommand, paramId);

				let oldValue = commandParam.onCalled;
	
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

	static getCommand(commands: Array<Command>, command: string): Command {
		for (var i = 0; i < commands.length; i++) {
			if (commands[i].commandName.indexOf(command) != -1) return commands[i];
		}
	
		return null;
	}

	static getProperParam(message: string[], params: Array<CommandParam>): { pos: number; newParams: Array<string>; } {
		for (let a = 0; a < params.length; a++) {
			let param = params[a];
			
			if (param.length != null) {
				if (param.length != message.length - 1) continue;
				return {
					pos: a,
					newParams: message
				};
			} else {
				if (param.minLength > message.length - 1 || (param.maxLength == -1 ? false : param.maxLength < message.length - 1)) continue;
	
				let paramReg = param.paramReg;
	
				if (paramReg != null) {
					let parts = paramReg.split(' ');
	
					let messageRemains = message;
	
					let newMessageParams = [];
					newMessageParams.push(messageRemains.shift());
	
					parts.forEach((part) => {
						let points = parseInt(part);
	
						let array = [];
	
						while (messageRemains.length != 0 && array.length != points) {
							array.push(messageRemains.shift());
						}
	
						newMessageParams.push(array.join(' '));
					});
	
					return { pos: a, newParams: newMessageParams };
				}
	
				return { pos: a, newParams: message };
			}
		}
	
		return null;
	}

	static getParam(command: Command, id: number): CommandParam {
		for (var i = 0; i < command.params.length; i++) {
			var param = command.params[i];
			if (param.id == id) return param;
		}
	
		return null;
	}

	static getCommandParam(commandName: string, id: number, commands: Array<Command>): CommandParam {
		let command = CommandManger.getCommand(commands, commandName);
		let param = CommandManger.getParam(command, id);

		return param;
	}

	static isCallingCommand(userId: string, message: string) {
	 	return message[0] == '!' || message.indexOf(`<@${userId}>`) == 0;
	}

	static getCommandMessage(userId: string, message: string) {
		if (message[0] == '!') return message.substr(1);
		
		let myId = `<@${userId}>`;
	
		let indexOf = message.indexOf(myId);
		if (indexOf != 0) return null;
	
		return message.substr(myId.length).trim();
	}

	static createCommand(commandName: string, onCalled: string): Command {
		let comm: Command = {
			commandName: [ commandName ],
			disabled: false,
			params: [
				{
					id: 0,
					onCalled: onCalled,
					length: 0
				}
			]
		};


		return comm;
	}

	static removeCommand(commandName: string, paramId: number, commands: Array<Command>): Array<Command> {
		for (var i = 0; i < commands.length; i++) {
			if (commands[i].commandName.indexOf(commandName) != -1) {
				commands.splice(i, 1);
				break;
			}
		}

		return commands;
	}
}


export = CommandManger;


interface ParseMessageCB {
	[name: string]: any;

	type?: string;
	message?: string;
	commandName?: string;
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
	cb?: (params: Array<string>) => any;
};
