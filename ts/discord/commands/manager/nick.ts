import Command = require('../../command');


class Nick extends Command {
	constructor() {
		super('nick');

		this.description = 'Changes the bots nickname for your discord server.';
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					server.getPrefix() + 'nick <name>'
				]
			]);
		}

		var name = params.join(' ');

		message.guild.me.setNickname(name, 'Requested by ' + message.member.user.tag)
		.then(() => {
			message.channel.send(Command.success([[ 'Nick', 'Sucessfully changed nickname.' ]]));
		}, e => console.error(e));
	}
}

export = Nick;