import Command = require('../../command');

class RandNumber extends Command {
	constructor() {
		super(['number', 'randomnumber'], false);

		this.description = 'Generates a random number.';

		this.addParams(0, 2, (params) => {
			if (params.length == 1) {
				params[1] = params[0];
				params[0] = null;
			}

			var min = strToNumber(params[0], 0);
			var max = strToNumber(params[1], 100);

			if (min >= max) {
				return {
					type: 'echo', 
					embed: {
						color: 0xd91582,
						fields: [
							{
								name: 'Invalid Params!',
								value: 'Minimum number is larger than Max number'
							},
							{
								name: 'Values',
								value: 'Min: ' + min + ', Max: ' + max
							}
						]
					}
				};
			}


			return {
				type: 'echo', 
				embed: {
					color: 0x43f104,
					fields: [
						{
							name: 'Number Picked!',
							value: 'Picked ' + (Math.floor(Math.random() * (max - min + 1)) + min)
						},
						{
							name: 'Picked From',
							value: 'Min: ' + min + ', Max: ' + max
						},
					]
				}
			};
		}, [
			'?number', 
			'?number.2'
		]);
	}
}

function strToNumber(str: string, def: number): number {
	if (str == null) return def;
	var value = parseInt(str);
	return isNaN(value) ? def : value;
}

export = RandNumber;