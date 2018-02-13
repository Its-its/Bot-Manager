import CommandManager = require('../command-manager');

import { Server } from './guildClient';

import Discord = require('discord.js');

class Command implements Command {
	public commandName: Array<string>;
	public togglable: boolean;
	public description: string;

	public adminOnly: boolean;
	public perms: Array<string> = [];

	public params: Array<CommandParams> = [];

	constructor(commandName: string | Array<string>, togglable = true, adminOnly = true) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.adminOnly = adminOnly;
	}

	public is(name: string): boolean {
		return this.commandName.indexOf(name) != -1;
	}

	public validate(params: String[]): boolean {
		for(var i = 0; i < this.params.length; i++) {
			var param = this.params[i];
			// TODO: Validate numbers, booleans, etc.
			if (params.length >= param.minLength && (param.maxLength == -1 || params.length <= param.maxLength)) return true;
		}
		return false;
	}

	public addParams(
		minLength?: number | ((params: Array<string>, userOptions: object, message: Discord.Message) => any), 
		maxLength?: number | ((params: Array<string>, userOptions: object, message: Discord.Message) => any), 
		cb?: (params: Array<string>, userOptions: Server, message: Discord.Message) => any,
		validParams?: string[]) {

		if (typeof minLength == 'function') {
			cb = minLength;
			minLength = 0;
			maxLength = -1;
		} else if (typeof maxLength == 'function') {
			cb = maxLength;
			maxLength = -1;
		}

		this.params.push({
			id: this.params.length,
			minLength: minLength,
			maxLength: maxLength,
			validParams: validParams || [],
			cb: cb
		});

		// 0, 0
		// 1, 1
		// 3, 4
		// 1, 10
		this.params.sort((a, b) => {
			var ad = (a.maxLength - a.minLength), bd = (b.maxLength - b.minLength);
			return ad == bd ? a.minLength - b.minLength : ad - bd
		});
	}

	static paramsExpanded(params: string[]): string[] {
		return params.map(p => {
			// number.2 string.2
			var fields = p.split(' ');
			
			return fields.map(f => {
				// number.2
				var spl = f.split('.');

				var val = spl[0];
				var amo = spl[1] == null ? 1 : parseInt(spl[1]);

				if (amo == 1) return val;
				if (amo == -1) return val + '..';

				var a = [];

				for(var i = 0; i < amo; i++) a.push(val);

				return a.join(' ');
			}).join(' ');
		});
	}

	static paramsToReadable(params: string[]): string[] {
		var cleaned = Command.paramsExpanded(params);

		return cleaned.map(c => {
			return c
			.split(' ')
			.map(s => {
				var prefix = s[0] == '?' ? '[]' : '<>';

				s = s.replace('?', '');

				return prefix[0] + s
				.replace('string', 'text')
				.replace('boolean', 'true/false')
				.toUpperCase() + prefix[1];
			})
			.join(' ');
		});
	}

	static DefaultColor = 0xb0a79e;
	static SuccessColor = 0x43f104;
	static InfoColor = 0x46a0c0;
	static WarningColor = 0xc4d950;
	static ErrorColor = 0xd91582;

	static defCall(color: number, array: string[][]) {
		return {
			type: 'echo',
			embed: {
				color: color,
				fields: array.map(a => { return { name: a[0], value: a[1] } })
			}
		};
	}

	static default(array: string[][]) {
		return Command.defCall(Command.DefaultColor, array);
	}

	static success(array: string[][]) {
		return Command.defCall(Command.SuccessColor, array);
	}

	static error(array: string[][]) {
		return Command.defCall(Command.ErrorColor, array);
	}

	static warning(array: string[][]) {
		return Command.defCall(Command.WarningColor, array);
	}

	static info(array: string[][]) {
		return Command.defCall(Command.InfoColor, array);
	}

	// TODO: Text is different widths
	static table(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; }): string {
		opts = Object.assign({
			delimiter: ' ',
			spacing: 2
		}, opts);

		var largestCell: number[] = [];
		var rows: string[] = [];

		// Column Lengths
		header.forEach((h, i) => largestCell[i] = String(h).length);
		body.forEach(b => {
			b.forEach((c, i) => {
				var len = String(c).length;
				var curLen = largestCell[i];

				if (curLen == null) {
					largestCell[i] = len;
				} else if (curLen < len) {
					largestCell[i] = len;
				}
			});
		});

		//
		rows.push(header.map((h, i) => h + ' '.repeat(largestCell[i] - String(h).length + opts.spacing)).join(opts.delimiter));

		body.forEach(ro => {
			rows.push(ro.map((c, i) => c + ' '.repeat(largestCell[i] - String(c).length + opts.spacing)).join(opts.delimiter));
		});

		return rows.join('\n');
	}
}

export = Command;


interface Command {
	// disabled: boolean;

	addParams(minLength: number, maxLength: number, cb: (params: Array<string>, userOptions: Server, message: Discord.Message) => any);
	addParams(minLength: number, cb: (params: Array<string>, userOptions: Server, message: Discord.Message) => any);
	addParams(cb: (params: Array<string>, userOptions: Server, message: Discord.Message) => any);
}

interface CommandParams {
	id: number;
	onCalled?: string;

	validParams?: string[]; // [ string, any, number, boolean ]

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: object, userOptions: object, message: Discord.Message) => any;
};