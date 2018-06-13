import Command = require('../../command');

import Commands = require('../index');

class Help extends Command {
	constructor() {
		super('help', true, false);

		// !help
		this.addParams(0, (params) => {
			var commands = (<{[str: string]: Command[]}>Commands.list());
			var categoryNames: any = Object.keys(commands).map(c => [ c, c.toLowerCase(), commands[c].length ]);

			if (params.length == 0) {
				var commandTotal = 0;

				var lines = [
					'Total Commands: ',
					'_Excluding custom commands._',
					'!help all'
				];


				for(var i = 0; i < categoryNames.length; i++) {
					var cat = categoryNames[i];

					commandTotal += cat[2];
					lines.push('!help ' + cat[1]);
				}
				
				lines[0] += commandTotal;

				return Command.info([
					[
						'Help',
						lines.join('\n')
					]
				]);
			}

			var name = params.shift().toLowerCase();

			if (name == 'all') {
				var str = [ '_Temporary design_' ];

				for(var i = 0; i < categoryNames.length; i++) {
					var categoryName = categoryNames[i];
	
					var categoryCommands = commands[categoryName[0]];
					str.push('**' + categoryName[0] + '**');
					str = str.concat(categoryCommands.map(c => '!' + c.commandName[0] + ' | ' + (c.description || 'No Desc.')));
				}

				return Command.info([[
					'All Commands',
					str.join('\n')
				]]);
			}

			// List commands in a category
			for(var i = 0; i < categoryNames.length; i++) {
				var categoryName = categoryNames[i];

				if (categoryName[1] == name) {
					var categoryCommands = commands[categoryName[0]];
					return Command.info([[
						'Commands in Category ' + categoryName[0],
						'_Temporary design_\n' + categoryCommands.map(c => '!' + c.commandName[0] + ' | ' + (c.description || 'No Description Available.')).join('\n')
					]]);
				}
			}

			// TODO: Commands instead of categories
		});
	}
}

export = Help;