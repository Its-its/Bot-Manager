import Discord = require('discord.js');

import DiscordServer = require('@discord/bot/GuildServer');

import Command = require('@discord/bot/command');

import comm = require('./commands');

import PERMS = require('./perms');

import { DiscordBot } from '@type-manager';


class Events extends Command {
	constructor() {
		super('events');

		this.perms = Object.values(PERMS);
		this.description = 'Events from Player joins to Player reacts.';
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (!server.isPluginEnabled('events')) return Command.error([['Error', 'Please enable the Events Plugin!']]);

		let events = server.plugins.events!;

		if (events.groups == null) {
			events.groups = [];
		}

		let callType = params.shift();

		switch(callType == null ? null : callType.toLowerCase()) {
			case 'list': return comm.List.call(params, server, message);
			case 'create': return comm.Create.call(params, server, message);
			case 'remove': return comm.Remove.call(params, server, message);
			case 'edit': return comm.Edit.call(params, server, message);

			default: return comm.Help.call(params, server, message);
		}
	}
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
		reactionName: ':check:',
		memberRoleId: '0101'
	},
	onEvent: [
		{
			// If channel is id.
			type: 'condition',
			name: 'if',

			conditions: [
				{
					type: 'channel',
					id: '010101010101010101'
				}
			],

			thenDo: [
				{
					type: 'event',
					name: 'react_add',

					// Reaction name.
					reactionName: '{reactionName}',
					// Message ID
					messageId: '{rulesMessageId}',

					thenDo: [
						{ // Check if role is already on member.
							type: 'condition',
							name: 'if',

							conditions: [
								// Missing Role ID.
								{
									type: 'role',
									isMissing: true,
									id: '{memberRoleId}'
								}
							],

							thenDo: [
								{ // Add role to member.
									type: 'event',
									name: 'role_add',
									// Role ID
									id: '{memberRoleId}'
								}
							]
						},
						{ // Wait 500ms. Fail safe incase player is spamming it.
							type: 'wait',
							duration: 500
						},
						{ // Remove Reaction from member if exists still (concurrency.)
							type: 'event',
							name: 'react_remove',
							reactionName: '{reactionName}'
						}
					]
				}
			]
		}
	]
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


export = Events;