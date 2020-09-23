import Discord = require('discord.js');

import { Server as DiscordServer } from '@discord/bot/GuildServer';

import { Command } from '@discord/bot/command';

import comm = require('./commands');

import PERMS = require('./perms');

import { DiscordBot, Optional } from '@type-manager';
import utils = require('@base/discord/utils');


// TODO: Correctly handle <@channelID> in variables obj.

class Events extends Command {
	constructor() {
		super('events');

		this.perms = Object.values(PERMS);
		this.description = 'Events from Player joins to Player reacts.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('events')) return Command.error([['Error', 'Please enable the Events Plugin!']]);

		const events = server.plugins.events!;

		if (events.groups == null) {
			events.groups = [];
		}

		const callType = params.shift();

		switch(callType == null ? null : callType.toLowerCase()) {
			case 'list': return comm.List.call(params, server, message);
			case 'create': return comm.Create.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			case 'edit': return comm.Edit.call(params, server, message);

			default: return comm.Help.call(params, server, message);
		}
	}

	public async onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User | Discord.PartialUser, server: DiscordServer) {
		if (!server.isPluginEnabled('events') || reaction.message.guild == null) return false;

		console.log(reaction.emoji.identifier);

		const eventGroup = idea;

		const success = await doEventCondition(
			{
				exists: true,
				reaction: reaction,
				guild: reaction.message.guild,
				channel: reaction.message.channel,
				caller: user
			},
			eventGroup.variables,
			eventGroup.onEvent
		);

		return true;
	}

	public async onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User | Discord.PartialUser, server: DiscordServer) {
		if (!server.isPluginEnabled('events') || reaction.message.guild == null) return false;

		console.log(reaction.emoji.identifier);

		const eventGroup = idea;

		const success = await doEventCondition(
			{
				exists: false,
				reaction: reaction,
				guild: reaction.message.guild,
				channel: reaction.message.channel,
				caller: user
			},
			eventGroup.variables,
			eventGroup.onEvent
		);

		return true;
	}
}

interface EventOptions {
	exists?: boolean;

	reaction?: Discord.MessageReaction;

	guild: Discord.Guild;
	channel: Discord.Channel;
	caller: Discord.User | Discord.PartialUser;
}

async function doEvents(
	opts: EventOptions,
	variables: Optional<DiscordBot.PluginEvents.Variables>,
	event: DiscordBot.PluginEvents.BaseEvents
) {
	switch (event.type) {
		case 'condition': return doEventCondition(opts, variables, event);
		case 'modify': return doEventModify(opts, variables, event);
		case 'wait': {
			console.log(' - Waiting: ' + event.duration + 'ms');
			await utils.asyncTimeout(event.duration);
			return true;
		}

		default: return false;
	}
}

async function doEventModify(
	opts: EventOptions,

	variables: Optional<DiscordBot.PluginEvents.Variables>,
	modify: DiscordBot.PluginEvents.Modify.EventModify
) {
	modify.id = correctString(modify.id, variables);

	switch (modify.name) {
		case 'react': {
			switch (modify.do) {
				case 'add': {
					// Called Event was a reaction event.
					if (opts.reaction != null) {
						// Current reaction removed equals specified modify one.
						if (opts.reaction.emoji.identifier == modify.id && !opts.exists!) {
							opts.reaction.users.add(opts.caller.id);
							return true;
						}
					}

					break;
				}

				case 'remove': {
					// Called Event was a reaction event.
					if (opts.reaction != null) {
						// Current reaction added equals specified modify one.
						if (opts.reaction.emoji.identifier == modify.id && opts.exists!) {
							await opts.reaction.users.remove(opts.caller.id);
							return true;
						}
					}

					break;
				}

				case 'create': {
					break;
				}

				case 'delete': {
					break;
				}
			}

			break;
		}

		case 'role': {
			switch (modify.do) {
				case 'add': {
					const member = await opts.guild.members.fetch(opts.caller.id);

					if (member != null) {
						await member.roles.add(modify.id);

						return true;
					}

					break;
				}

				case 'remove': {
					const member = await opts.guild.members.fetch(opts.caller.id);

					if (member != null) {
						await member.roles.remove(modify.id);

						return true;
					}

					break;
				}

				case 'create': {
					break;
				}

				case 'delete': {
					break;
				}
			}

			break;
		}
	}

	return false;
}


async function doEventCondition(
	opts: EventOptions,

	variables: Optional<DiscordBot.PluginEvents.Variables>,
	condition: Optional<DiscordBot.PluginEvents.Condition.GroupCondition>
) {
	if (condition == null) return false;

	switch (condition.name) {
		case 'if': {
			let all_events_correct = true;

			for (let i = 0; i < condition.conditions.length; i++) {
				const con_opts = condition.conditions[i];

				const result = await verifyCondition(con_opts);

				if (!result) {
					all_events_correct = false;
					console.log('Failed at: ', con_opts);
					break;
				}
			}

			// All conditions must be satisfied.
			if (all_events_correct) {
				for (let i = 0; i < condition.thenDo.length; i++) {
					const event = condition.thenDo[i];

					await doEvents(opts, variables, event)
				}

				return true;
			}

			break;
		}

		case 'or': {
			let at_least_one_correct = false;

			for (let i = 0; i < condition.conditions.length; i++) {
				const con_opts = condition.conditions[i];

				const result = await verifyCondition(con_opts);

				if (result) {
					at_least_one_correct = true;
					break;
				}
			}

			// At least one condition must be satisfied.
			if (at_least_one_correct) {
				for (let i = 0; i < condition.thenDo.length; i++) {
					const event = condition.thenDo[i];

					await doEvents(opts, variables, event);
				}

				return true;
			} else {
				console.log('Failed at: ', condition.conditions);
			}

			break;
		}
	}

	function verifyCondition(condition: DiscordBot.PluginEvents.Condition.EventCondition) {
		condition.id = correctString(condition.id, variables);

		switch (condition.type) {
			case 'role': {
				if (condition.for == 'member') {
					if (opts.caller != null) {
						const guildMember = opts.guild.members.resolve(opts.caller.id);

						if (guildMember != null) {
							const exists = guildMember.roles.cache.findKey(r => r.id == condition.id) != null;
							return condition.exists == exists;
						}
					}
				} else if (condition.for == 'guild') {
					const exists = opts.guild.roles.cache.findKey(r => r.id == condition.id) != null;
					return condition.exists == exists;
				}

				break;
			}

			case 'channel': {
				if (opts.channel != null) {
					return opts.channel.id == condition.id;
				}

				break;
			}

			case 'react': {
				if (opts.reaction != null) {
					return opts.reaction.emoji.identifier == condition.id && condition.exists == opts.exists!;
				}

				break;
			}
		}

		return false;
	}

	return false;
}

function correctString(str: string, variables: Optional<DiscordBot.PluginEvents.Variables>): string {
	if (variables != null && str.startsWith('{') && str.endsWith('}')) {
		for (const key in variables) {
			const value = variables[key];

			if (str.slice(1, str.length - 1) == key) {
				return value;
			}
		}
	}

	return str;
}

/**
 * If clicked reaction in channel # on message #.
 *  -
 */
const idea: DiscordBot.PluginEvents.Grouping = {
	enabled: true,
	id: 0,
	title: 'Agree to rules.',
	variables: {
		rulesMessageId: '010101',
		reactionId: '%E2%9C%85',
		memberRoleId: '373164745114648576'
	},
	onEvent: {
		// If channel is id.
		type: 'condition',
		name: 'if',

		conditions: [
			{
				type: 'channel',
				id: '314946214523174913'
			},
			{
				type: 'react',
				exists: true,
				id: '{reactionId}'
			}
		],

		thenDo: [
			{ // Check if role is already on member.
				type: 'condition',
				name: 'if',

				conditions: [
					// Missing Role ID.
					{
						type: 'role',
						for: 'member',
						exists: false,
						id: '{memberRoleId}'
					}
				],

				thenDo: [
					{ // Add role to member.
						type: 'modify',
						name: 'role',
						id: '{memberRoleId}',
						do: 'add'
					}
				]
			},
			{ // Wait 500ms. Fail safe incase player is spamming it.
				type: 'wait',
				duration: 500
			},
			{ // Remove Reaction from member if exists still (concurrency.)
				type: 'modify',
				name: 'react',
				id: '{reactionId}',
				do: 'remove'
			}
		]
	}
};

const idea2 = {
	enabled: true,
	id: 0,
	title: 'Send DM.',
	activeChannels: [ '010101010101010101' ],
	onEvent: [
		{
			name: 'member_add'
		}
	]
};


function getOrFetchUser(user: Discord.User | Discord.PartialUser): Promise<Discord.User> {
	if (user.username == null) {
		return user.fetch();
	} else {
		return Promise.resolve(user);
	}
}

function getOrFetchGuildMember(user: Discord.GuildMember | Discord.PartialGuildMember): Promise<Discord.GuildMember> {
	if (user.joinedTimestamp == null) {
		return user.fetch();
	} else {
		return Promise.resolve(user);
	}
}


export = Events;