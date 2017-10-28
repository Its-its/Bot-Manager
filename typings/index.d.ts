
declare interface CommandClient {
	commands: Array<Command>;
}


declare interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParam>;
}

declare interface CommandParam {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: Array<string>) => any;
};
