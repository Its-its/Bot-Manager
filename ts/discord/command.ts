import Server = require('./discordserver');

import info = require('./utils');

import Discord = require('discord.js');

class Command {
	public commandName: Array<string>;
	public togglable: boolean;
	public description: string;

	public adminOnly: boolean;
	public perms: Array<string> = [];

	constructor(commandName: string | Array<string>, togglable = true, adminOnly = true) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.adminOnly = adminOnly;
		
		this.description = 'Nothing written yet.';
	}

	public hasPerms(discordPerms: Discord.PermissionResolvable | Discord.PermissionResolvable[], member: Discord.GuildMember) {
		// TODO: Custom Perms

		if (member.hasPermission(discordPerms)) return true;
		return false;
	}

	public is(name: string): boolean {
		return this.commandName.indexOf(name) != -1;
	}

	public call(params: string[], userOptions: Server, message: Discord.Message) {}

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

	static DefaultColor = info.DefaultColor;
	static SuccessColor = info.SuccessColor;
	static InfoColor = info.InfoColor;
	static WarningColor = info.WarningColor;
	static ErrorColor = info.ErrorColor;

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