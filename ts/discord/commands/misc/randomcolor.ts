import Command = require('../../command');

class RandColor extends Command {
	constructor() {
		super(['randomcolor', 'color'], true, false);

		this.addParams(0, 0, (params) => {
			var color = RandColor.randomColor();
			return {
				type: 'echo',
				embed: {
					color: parseInt(color),
					fields: [
						{
							name: 'Color Chosen!',
							value: 'I\'ve generated "' + color + '" for you.'
						}
					]
				}
			};
		});
	}


	static randomColor(): string {
		return '0x' + Math.floor(Math.random() * 16777215).toString(16);
	}
}

export = RandColor;