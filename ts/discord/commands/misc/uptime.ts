import Command = require('../../command');

let started = Date.now();

class Uptime extends Command {
	constructor() {
		super('uptime');

		this.addParams((params) => {
			return {
				type: 'echo',
				embed: {
					color: Command.SuccessColor,
					fields: [
						{
							name: 'Bot Uptime',
							value: Math.floor((Date.now() - started)/60000) + ' Minutes.'
						}
					]
				}
			}
		})
	}
}

export = Uptime;