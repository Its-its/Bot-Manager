import Server = require('./GuildServer');

import info = require('../utils');

import Discord = require('discord.js');
import { DiscordBot } from '@type-manager';

class Command {
	public commandName: string[];
	public togglable: boolean;
	public description: string;

	public ownerOnly: boolean;
	public adminOnly: boolean;
	public perms: string[] = [];

	constructor(commandName: string | string[], togglable = true, adminOnly = true) {
		this.commandName = (typeof commandName == 'string' ? [commandName] : commandName);
		this.togglable = (togglable == null ? true : togglable);
		this.adminOnly = adminOnly;
		this.ownerOnly = false;

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

	// Events

	public onGuildRemove(guild: Discord.Guild, server?: Server) { return false; }
	public onGuildCreate(guild: Discord.Guild, server?: Server) { return false; }

	// Channels
	public onChannelCreate(channel: Discord.GuildChannel, server?: Server) { return false; }
	public onChannelDelete(channel: Discord.GuildChannel, server?: Server) { return false; }

	// Users
	public onGuildMemberAdd(member: Discord.GuildMember | Discord.PartialGuildMember, server?: Server) { return false; }
	public onGuildMemberRemove(member: Discord.GuildMember | Discord.PartialGuildMember, server?: Server) { return false; }
	public onGuildMemberRoleAdd(member: Discord.GuildMember | Discord.PartialGuildMember, roles: Discord.Role[], server?: Server) { return false; }
	public onGuildMemberRoleRemove(member: Discord.GuildMember | Discord.PartialGuildMember, roles: Discord.Role[], server?: Server) { return false; }

	// Roles
	public onRoleDelete(role: Discord.Role, server?: Server) { return false; }
	public onRoleCreate(role: Discord.Role, server?: Server) { return false; }
	public onRoleUpdate(oldRole: Discord.Role, newRole: Discord.Role, server?: Server) { return false; }

	//
	public onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User, server?: Server) { return false; }
	public onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User, server?: Server) { return false; }

	public onMessage(message: Discord.Message, server?: Server) { return false; }
	public onMessageDelete(message: Discord.Message, server?: Server) { return false; }
	public onMessageDeleteBulk(messages: Discord.Collection<string, Discord.Message>, server?: Server) { return false; }
	public onMessageUpdate(oldMessage: Discord.Message, newMessage: Discord.Message, server?: Server) { return false; }

	// Statics

	static DefaultColor = info.DefaultColor;
	static SuccessColor = info.SuccessColor;
	static InfoColor = info.InfoColor;
	static WarningColor = info.WarningColor;
	static ErrorColor = info.ErrorColor;

	static noPermsMessage(cmdName: string) {
		return info.noPermsMessage(cmdName);
	}

	static defCall(color: number, array: any[][] | { embed: any; }) {
		return info.defCall(color, array);
	}

	static default(array: any[][] | { embed: any; }) {
		return Command.defCall(Command.DefaultColor, array);
	}

	static success(array: any[][] | { embed: any; }) {
		return Command.defCall(Command.SuccessColor, array);
	}

	static error(array: any[][] | { embed: any; }) {
		return Command.defCall(Command.ErrorColor, array);
	}

	static warning(array: any[][] | { embed: any; }) {
		return Command.defCall(Command.WarningColor, array);
	}

	static info(array: any[][] | { embed: any; }) {
		return Command.defCall(Command.InfoColor, array);
	}

	static table(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; monospaced?: boolean; }): string {
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

export = Command;