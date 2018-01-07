import Command = require('../../command');

import discord = require('../../index');


class Whitelist extends Command {
	constructor() {
		super('whitelist');

		discord.client.on('message', (message) => {
			//
		});

		this.addParams(1, (params) => {
			return {
				type: 'echo',
				embed: {
					color: Command.SuccessColor,
					fields: [
						{
							name: 'Color Chosen!',
							value: 'I\'ve generated for you.'
						}
					]
				}
			};
		});
	}
}

export = Whitelist;