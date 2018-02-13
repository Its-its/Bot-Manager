import Command = require('../../command');

class Interval extends Command {
	constructor() {
		super(['interval', 'every']);

		this.perms = [
			'commands.interval'
		].concat([
			'list',
			'create',
			'remove',
			'toggle',
			'set',
			'set.minutes',
			'set.message',
			'set.name'
		].map(i => 'commands.interval.' + i));

		this.addParams(0, (params, userOptions, message) => {
			var blacklisted = userOptions.moderation.blacklisted;

			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage', 
						[	'list', 
							'create <minutes>',
							'<id> remove',
							'<id> toggle',
							'<id> set minutes <minutes>',
							'<id> set message <text>',
							'<id> set name <text>',
							// '<id> set onCall <text>',
							// '<id> set onReset <text>'
						].map(b => '!interval ' + b)
						.join('\n') 
					]
				]);
			}

			switch (params[0]) {
				case 'list':
					return Command.info([
						[	'Interval List',
							userOptions.intervals.length == 0 ? 'No intervals created' : 
							Command.table(
								['ID', 'Status', 'Repeat'], 
								userOptions.intervals.map((i, index) => [(index + 1), i.active ? 'Active' : 'Disabled', i.every]))
						]
					]);
				case 'create':
					var minutes = parseInt(params[1]);
					if (isNaN(minutes)) return;
					if (message.channel.type != 'text') return;

					var pos = userOptions.addInterval(minutes, message.guild.id, message.channel.id);
					userOptions.save();
					return Command.info([
						[ 'Interval', 'Interval with ID ' + pos + ' created.\nSeconds set to ' + seconds ]
					]);
				default:
					var id = parseInt(params[0]);
					if (isNaN(id)) return Command.error([[ 'Interval', 'Invalid Interval ID.' ]]);

					switch (params[1]) {
						case 'remove':
							userOptions.removeInterval(id);
							userOptions.save();
							return Command.info([
								[ 'Interval', 'Interval with ID ' + id + ' removed.' ]
							]);
						case 'toggle':
							var togglePos = userOptions.toggleInterval(id);
							userOptions.save();
							return Command.info([
								[ 'Interval', 'Interval with ID ' + id + ' is now ' + (togglePos ? 'Active' : 'Disabled') ]
							]);
						case 'set':
							var type = params[2];
							
							switch (type) {
								case 'minutes':
									var seconds = parseInt(params[3]);
									if (isNaN(seconds)) return Command.error([[ 'Interval', 'Invalid Seconds.' ]]);
									userOptions.setIntervalTime(id, seconds);
									userOptions.save();
									return Command.info([
										[ 'Interval', 'Interval ' + id + ' time update to ' + seconds + ' seconds.' ]
									]);
								case 'message': 
									var text = params.slice(3).join(' ');
									userOptions.setIntervalMessage(id, text);
									userOptions.save();
									return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
								case 'name':
									var text = params.slice(3).join(' ');
									userOptions.setIntervalName(id, text);
									userOptions.save();
									return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
								// ? case 'onCall': // TODO: SECURE IT
								// ? 	var text = params.slice(3).join(' ');
								// ? 	userOptions.setIntervalEvent(id, 'onCall', text);
								// ? 	userOptions.save();
								// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
								// ? case 'onReset':
								// ? 	var text = params.slice(3).join(' ');
								// ? 	userOptions.setIntervalEvent(id, 'onReset', text);
								// ? 	userOptions.save();
								// ? 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
								// ! case 'beforeCall':
								// ! 	var text = params.slice(3).join(' ');
								// ! 	userOptions.setIntervalEvent(id, 'beforeCall', text);
								// ! 	userOptions.save();
								// ! 	return Command.info([[ 'Interval', 'Interval ' + id + ' updated.' ]]);
							}
							break;
					}
			}

			// return Command.success([['Blacklist', resp]]);
		});
	}
}

export = Interval;