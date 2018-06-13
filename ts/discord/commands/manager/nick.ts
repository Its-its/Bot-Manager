import Command = require('../../command');


class Nick extends Command {
	constructor() {
		super('nick');

		this.description = 'Change the bots nickname.';

		this.addParams(0, (params, serverOptions, message) => {
			if (params.length == 0) {
				return Command.info([
					[
						'Command Usage',
						'!nick <name>'
					]
				]);
			}

			var name = params.join(' ');

			message.guild.me.setNickname(name, 'Request by ' + message.member.user.tag)
			.then(() => {
				message.channel.send(Command.success([[ 'Nick', 'Sucessfully changed my nickname.' ]]));
			}, e => console.error(e))
			.catch(e => console.error(e));
		});
	}
}

export = Nick;