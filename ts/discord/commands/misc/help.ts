import Command = require('../../command');

import Commands = require('../index');
// !help
// !help register


class Help extends Command {
	constructor() {
		super('help', true, false);

		// !help
		this.addParams(0, 0, (params) => {
			var commands = (<{[str: string]: Command[]}>Commands.list());

			var commandTotal = 0;

			var lines = [
				'Total Commands: ',
				'_Excluding custom commands._'
			];

			for (var category in commands) {
				var cmds = commands[category];
				commandTotal += cmds.length;

				lines.push('!help ' + category.toLowerCase());
			}
			
			lines[0] += commandTotal;

			return Command.info([
				[
					'Help',
					lines.join('\n')
				]
			]);
		});

		// !help ...args
		this.addParams(1, (params) => {
			// var command: Command;

			// TODO: "commands" "roles" "music" etc..
			
			// if ((command = Commands.get(params[0])) != null) {
			// 	return {
			// 		type: 'echo', 
			// 		embed: {
			// 			color: 0x43f104,
			// 			fields: [
			// 				{
			// 					name: 'HELP!',
			// 					value: 'Below is the Desription of the Command and the Params to use it.' 
			// 				},
			// 				{
			// 					name: 'Description',
			// 					value: command.description || 'Not Created Yet! GUESS IT!'
			// 				},
			// 				{
			// 					name: 'Parameters',
			// 					value: command.params.map(p => Command.paramsToReadable(p.validParams).map(v => '!' + params[0] + ' ' + v).join('\n')).join('\n')
			// 				}
			// 			]
			// 		}
			// 	}
			// }


			return Command.info([[
				'HELP!',
				'Not implemented yet. Patience.'
			]]);
		});
	}
}

export = Help;