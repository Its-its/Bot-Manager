import CommandManager = require('../command-manager');

class Command implements Command {
	public commandName: Array<string>;
	public params: Array<CommandParams> = [];

	public togglable: boolean;
	public botHasToBeRegistered: boolean;

	constructor(commandName: string | Array<string>, togglable?: boolean, botHasToBeRegistered?: boolean) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.botHasToBeRegistered = (botHasToBeRegistered == null ? true : botHasToBeRegistered);
	}

	public is(name: string): boolean {
		return this.commandName.indexOf(name) != -1;
	}

	public addParams(
		minLength?: number | ((params: Array<string>) => any), 
		maxLength?: number | ((params: Array<string>) => any), 
		cb?: (params: Array<string>) => any) {

		if (typeof minLength == 'function') {
			cb = minLength;
			minLength = 0;
			maxLength = -1;
		} else if (typeof maxLength == 'function') {
			cb = maxLength;
			maxLength = -1;
		}

		// TODO: sort by minLength, maxLength
		// 10, 2
		// 10, 1
		// 9, 3
		this.params.push({
			id: this.params.length,
			minLength: minLength,
			maxLength: maxLength,
			cb: cb
		});
	}
}

export = Command;


interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParams>;

	addParams(minLength: number, maxLength: number, cb: (params: Array<string>) => any);
	addParams(minLength: number, cb: (params: Array<string>) => any);
	addParams(cb: (params: Array<string>) => any);
}

interface CommandParams {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: object) => any;
};