import { Command, Parser } from '@discord/bot/command';

import PERMS = require('./perms');
import commands = require('./commands');


const PARSER = new Parser(
	['record', 'recording'],
	[
		{
			name: 'help',
			defaultParameter: true,
			guildPermsRequired: ['SEND_MESSAGES'],
			callFunction: (_0, _1, message) => message.channel.send('help!')
		},
		{
			name: 'start',
			guildPermsRequired: ['SEND_MESSAGES'],
			callFunction: commands.start.call,
			params: [
				{
					defaultValue: null,
					name: '@channel'
				}
			]
		},
		{
			name: 'stop',
			guildPermsRequired: ['SEND_MESSAGES'],
			callFunction: commands.stop.call
		}
	]
);

class Recording extends Command {
	constructor() {
		super('recording');

		this.perms = Object.values(PERMS);
		this.description = 'Used to manage recordings in voice channels.';
		this.parser = PARSER;
	}
}

export = Recording;