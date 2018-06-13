import Command = require('../../command');

class Whitelist extends Command {
	constructor() {
		super('whitelist');

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