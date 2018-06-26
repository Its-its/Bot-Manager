import Server = require('./discordserver');

import info = require('./utils');

import Discord = require('discord.js');

class Command {
	public commandName: string[];
	public togglable: boolean;
	public description: string;

	public adminOnly: boolean;
	public perms: string[] = [];

	constructor(commandName: string | string[], togglable = true, adminOnly = true) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.adminOnly = adminOnly;
		
		this.description = 'Nothing written yet.';
	}

	public hasPermsCount(member: Discord.GuildMember, server: Server, perms: string[]): number {
		var count = 0;

		var lastFound = null;

		for(var i = 0; i < perms.length; i++) {
			var perm = perms[i];

			if (lastFound != null) {
				if (perm.startsWith(lastFound)) {
					count++;
					continue;
				} else {
					lastFound = null;
				}
			}

			if (server.userHasPerm(member, perm)) {
				lastFound = perm;
				count++;
			}
		}

		return count;
	}

	public hasPerms(member: Discord.GuildMember, server: Server, perms: string): boolean {
		if (member == null) return false;

		if (server.userHasPerm(member, perms)) return true;

		return false;
	}

	public is(name: string): boolean {
		return this.commandName.indexOf(name) != -1;
	}

	public call(params: string[], userOptions: Server, message: Discord.Message): any {}

	static DefaultColor = info.DefaultColor;
	static SuccessColor = info.SuccessColor;
	static InfoColor = info.InfoColor;
	static WarningColor = info.WarningColor;
	static ErrorColor = info.ErrorColor;

	static noPermsMessage(cmdName) {
		return Command.error([[cmdName, 'You don\'t have perms to access this.']]);
	}

	static defCall(color: number, array: string[][] | { embed: any; }) {
		return {
			type: 'echo',
			embed: Array.isArray(array) ? {
				color: color,
				fields: array.map(a => { return { name: a[0], value: a[1] } })
			} : array.embed
		};
	}

	static default(array: string[][] | { embed: any; }) {
		return Command.defCall(Command.DefaultColor, array);
	}

	static success(array: string[][] | { embed: any; }) {
		return Command.defCall(Command.SuccessColor, array);
	}

	static error(array: string[][] | { embed: any; }) {
		return Command.defCall(Command.ErrorColor, array);
	}

	static warning(array: string[][] | { embed: any; }) {
		return Command.defCall(Command.WarningColor, array);
	}

	static info(array: string[][] | { embed: any; }) {
		return Command.defCall(Command.InfoColor, array);
	}

	// TODO: Text is different widths if not in code blocks.
	static table(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; monospaced?: boolean; }): string {
		opts = Object.assign({
			delimiter: ' ',
			spacing: 2,
			monospaced: true
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

		rows.push(header.map((h, i) => h + ' '.repeat(largestCell[i] - String(h).length + opts.spacing)).join(opts.delimiter));

		rows.push('='.repeat(rows[0].length));

		body.forEach(ro => {
			rows.push(ro.map((c, i) => c + ' '.repeat(largestCell[i] - String(c).length + opts.spacing)).join(opts.delimiter));
		});


		var comp = rows.join('\n');


		if (opts.monospaced) comp = '```' + comp + '```';


		// if (comp.length > 1024) throw 'Table is too large. ' + comp.length + '/1024';

		return comp;
	}
}

export = Command;