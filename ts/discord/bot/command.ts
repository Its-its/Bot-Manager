/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */

import { Server } from './GuildServer';

import info = require('../utils');

import Discord = require('discord.js');
import { Nullable, DiscordBot } from '@type-manager';

class Command {
	public commandName: string[];
	public togglable: boolean;
	public description: string;

	public ownerOnly: boolean;
	public adminOnly: boolean;
	public perms: string[] = [];

	public parser: Nullable<Parser> = null;

	constructor(commandName: string | string[], togglable = true, adminOnly = true) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.adminOnly = adminOnly;
		this.ownerOnly = false;

		this.description = 'Nothing written yet.';
	}

	public hasPermsCount(member: Discord.GuildMember, server: Server, perms: string[]): number {
		let count = 0;

		let lastFound = null;

		for(let i = 0; i < perms.length; i++) {
			let perm = perms[i];

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

	public async call(_params: string[], _userOptions: Server, _message: Discord.Message): Promise<DiscordBot.PhraseResponses | DiscordBot.PhraseResponses[] | undefined | void> {
		return Promise.reject('CALL NOT IMPLEMENTED FOR ' + this.commandName);
	}

	// Events

	public async onGuildRemove(_guild: Discord.Guild, _server: Server) { return false; }
	public async onGuildCreate(_guild: Discord.Guild, _server: Server) { return false; }

	// Channels
	public async onChannelCreate(_channel: Discord.GuildChannel, _server: Server) { return false; }
	public async onChannelDelete(_channel: Discord.GuildChannel, _server: Server) { return false; }

	// Users
	public async onGuildMemberAdd(_member: Discord.GuildMember | Discord.PartialGuildMember, _server: Server) { return false; }
	public async onGuildMemberRemove(_member: Discord.GuildMember | Discord.PartialGuildMember, _server: Server) { return false; }
	public async onGuildMemberRoleAdd(_member: Discord.GuildMember | Discord.PartialGuildMember, _roles: Discord.Role[], _server: Server) { return false; }
	public async onGuildMemberRoleRemove(_member: Discord.GuildMember | Discord.PartialGuildMember, _roles: Discord.Role[], _server: Server) { return false; }

	// Roles
	public async onRoleDelete(_role: Discord.Role, _server: Server) { return false; }
	public async onRoleCreate(_role: Discord.Role, _server: Server) { return false; }
	public async onRoleUpdate(_oldRole: Discord.Role, _newRole: Discord.Role, _server: Server) { return false; }

	//
	public async onReactionAdd(_reaction: Discord.MessageReaction, _user: Discord.User | Discord.PartialUser, _server: Server) { return false; }
	public async onReactionRemove(_reaction: Discord.MessageReaction, _user: Discord.User | Discord.PartialUser, _server: Server) { return false; }

	public async onMessage(_message: Discord.Message, _server: Server) { return false; }
	public async onMessageDelete(_message: Discord.Message, _server: Server) { return false; }
	public async onMessageDeleteBulk(_messages: Discord.Collection<string, Discord.Message>, _server: Server) { return false; }
	public async onMessageUpdate(_oldMessage: Discord.Message, _newMessage: Discord.Message, _server: Server) { return false; }

	// Statics

	static DefaultColor = info.DefaultColor;
	static SuccessColor = info.SuccessColor;
	static InfoColor = info.InfoColor;
	static WarningColor = info.WarningColor;
	static ErrorColor = info.ErrorColor;

	static noPermsMessage(cmdName: string) {
		return info.noPermsMessage(cmdName);
	}

	static defCall(color: number, array: [string, string][] | { embed: any; }) {
		return info.defCall(color, array);
	}

	static default(array: [string, string][] | { embed: any; }) {
		return Command.defCall(info.DefaultColor, array);
	}

	static success(array: [string, string][] | { embed: any; }) {
		return Command.defCall(info.SuccessColor, array);
	}

	static error(array: [string, string][] | { embed: any; }) {
		return Command.defCall(info.ErrorColor, array);
	}

	static warning(array: [string, string][] | { embed: any; }) {
		return Command.defCall(info.WarningColor, array);
	}

	static info(array: [string, string][] | { embed: any; }) {
		return Command.defCall(info.InfoColor, array);
	}

	static table(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; monospaced?: boolean; }) {
		return info.tableMsg(header, body, opts);
	}

	static documentation: DiscordBot.CommandDoc = {
		title: 'Default Command',
		categories: [ 'unknown' ],
		alias: [ 'cmd', 'cmd2' ],
		permission: 'cmd',
		description: 'description testing',
		items: [
			{
				name: 'list',
				permission: 'list',
				description: 'Just a description.',
				opts: [
					{
						description: '',
						items: [
							{
								name: 'role',
								description: 'User Role',
								default: ''
							}
						]
					}
				]
			}
		]
	};
}

class Parser {
	commandName: string[];
	subCommands: SubCommand[];
	commandArgs: string[];

	constructor(commandName: string[], subCommands: SubCommand[]) {
		this.commandName = commandName;
		this.subCommands = subCommands;
		this.commandArgs = [];

		this.generateArgs();
	}

	generateArgs() {
		for(let i = 0; i < this.subCommands.length; i++) {
			const cmd = this.subCommands[i];

			let generated = [this.commandName[0], cmd.name];

			if (cmd.params != null) {
				for(let j = 0; j < cmd.params.length; j++) {
					const param = cmd.params[j];

					if (param.defaultValue != null) {
						generated.push(`[${param.name}]`);
					} else {
						generated.push(`<${param.name}>`);
					}
				}
			}

			this.commandArgs.push(generated.join(' '));
		}
	}

	public async evaluate(strParams: string[]): Promise<Nullable<CallableParser>> {
		console.log('Eval:', strParams);
		// const baseName = strParams.shift();

		// if (baseName != null && this.commandName.some(c => c == baseName!.toLowerCase())) {
		// 	console.log(`Matching: ${strParams}`);
			return this.parseSubCommands(strParams);
		// }

		// return null;
	}

	public async parseSubCommands(strParams: string[]): Promise<Nullable<CallableParser>> {
		const defaultParameter = this.subCommands.find(c => c.defaultParameter);

		const cmdName = strParams.shift();

		for (let i = 0; i < this.subCommands.length; i++) {
			const cmd = this.subCommands[i];

			console.log(' - ' + cmd.name)

			if (cmd.name == cmdName) {
				if (cmd.params != null) {
					const parsedParams = await this.parseParamsArray(strParams, cmd.params);

					if (parsedParams == null) {
						break;
					}

					if (cmd.canPassParams && !cmd.canPassParams(parsedParams)) {
						return null;
					}

					return new CallableParser(this, cmd, parsedParams);
				} else {
					return new CallableParser(this, cmd, []);
				}
			}
		}

		if (defaultParameter != null) {
			return new CallableParser(this, defaultParameter, []);
		}

		return null;
	}

	public async parseParamsArray(strParams: string[], params: Param[]): Promise<CompiledParam[]> {
		let parsed: CompiledParam[] = [];

		for(let i = 0; i < params.length; i++) {
			const param = params[i];

			parsed.push(await this.parseParameter(strParams, param, parsed));
		}

		return parsed;
	}

	public async parseParameter(strParams: string[], param: Param, parsedParams: CompiledParam[]): Promise<CompiledParam> {
		const strValue = strParams.shift();

		if (strValue != null) {
			const value = (param.transformValue ? param.transformValue(strValue) : strValue);

			if (param.canPassValue && !param.canPassValue(value, parsedParams)) {
				return Promise.reject(`Command parameter error for "${param.name}" ${param.errorMsgPassValue ? param.errorMsgPassValue : 'Cannot Pass Values...'}`);
			}

			return {
				param,
				value,
				original: strValue
			};
		} else if (param.defaultValue !== undefined) {
			return {
				param,
				value: param.defaultValue,
				original: strValue
			};
		}

		return Promise.reject(`Command parameter error for "${param.name}" Missing parameter! Did you specify it?`);
	}
}
class CallableParser {
	parser: Parser;

	command: SubCommand;

	params: CompiledParam[];

	constructor(parser: Parser, command: SubCommand, params: CompiledParam[]) {
		this.parser = parser;
		this.command = command;
		this.params = params;
	}

	public call(userOptions: Server, message: Discord.Message) {
		return this.command.callFunction.call(this.parser, this.params, userOptions, message);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallFunction = (this: Parser, params: CompiledParam[], userOptions: Server, message: Discord.Message) => Promise<any>;

interface SubCommand<P = Param[]> {
	name: string;

	defaultParameter?: boolean;
	params?: P;

	canPassParams?: (params: CompiledParam[]) => boolean;
	callFunction: CallFunction;

	errorMsgPassParams?: string;

	// Discord
	guildPermsRequired?: Discord.PermissionString[];
	userPermsRequired?: string[];
}

type ParamValues = string | number | null;

interface Param<V = ParamValues> {
	name: string;

	defaultValue?: V;
	transformValue?: (v: string) => V;
	canPassValue?: (v: V, parsed: CompiledParam[]) => boolean;

	errorMsgPassValue?: string;
}

interface CompiledParam<P = Param, V = ParamValues> {
	param: P;
	value: V;
	original?: string;
}


export {
	Command,
	Parser,
	CallableParser,

	SubCommand,
	Param,
	CallFunction,
	CompiledParam,
	ParamValues
};