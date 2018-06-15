import Command = require('../../command');


class Ignore extends Command {
	constructor() {
		super('ignore');

		this.description = 'Lets the bot know what to ignore.';
	}

	public call(params, server, message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Command Usage',
					[
						'list', 
						'channel [#channel]', 
						'user [@user]', 
						'[@user/#channel]'
					].map(s => server.getPrefix() + 'ignore ' + s).join('\n')
				]
			]);
		}

		var type = params[0];

		switch (type) {
			case 'list':
				var mod = server.moderation;
				return Command.success([
					[
						'Ignored Channels', 
						mod.ignoredChannels.length == 0 ? 
							'None' : 
							mod.ignoredChannels.map(c => ' - <#' + c + '>').join('\n')],
					[
						'Ignored Users', 
						mod.ignoredUsers.length == 0 ? 
							'None' : 
							mod.ignoredUsers.map(c => ' - <@' + c + '>').join('\n')]
				]);
			case 'clear':
				var clear = (params[1] || '').toLowerCase();

				if (clear == 'channel') {
					server.clearIgnoreList('channel');
				} else if (clear == 'user') {
					server.clearIgnoreList('member');
				} else if (clear == 'all') {
					server.clearIgnoreList('all');
				} else return Command.error([['Error on Clearing', 'Unknown clear option "' + clear + '" Use: "channel", "user", "all"']]);

				server.save();
				
				break;
			case 'channel':
				var id = params[1];
				if (isMention(id)) {
					var id = id.slice(2, id.length - 1);
					var channel = message.guild.channels.get(id);
					if (channel != null) {
						server.ignore('channel', id);
						server.save();
						return Command.success([['Ignore', 'Now ignoring channel "' + channel.name + '"']]);
					} else return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);
				}
				break;
			case 'user':
				var id = params[1];
				if (isMention(id)) {
					var id = id.slice(2, id.length - 1);
					var member = message.guild.member(id);
					if (member != null) {
						server.ignore('member', id);
						server.save();
						return Command.success([['Ignore', 'Now ignoring user "' + member.displayName + '"']]);
					} else return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);
				}
				break;
			case 'role': break;
			default:
				if (isMention(type)) {
					var isUser = type[1] == '@';
					var id = type.slice(2, type.length - 1);

					if (isUser) {
						var member = message.guild.member(id);
						if (member != null) {
							server.ignore('member', id);
							server.save();
							return Command.success([['Ignore', 'I am now ignoring user "' + member.displayName + '"']]);
						} else return Command.error([['Ignore', 'Unable to find member! Does it Exist?!']]);
					} else {
						var channel = message.guild.channels.get(id);
						if (channel != null) {
							server.ignore('channel', id);
							server.save();
							return Command.success([['Ignore', 'I am now ignoring channel "#' + channel.name + '"']]);
						} else return Command.error([['Ignore', 'Unable to find channel! Does it Exist?!']]);
					}
				}
				break;
		}

		return Command.error([[
			'Ignore',
			'An Unknown error Occured.'
		]]);
	}
}

function isMention(str: string): boolean {
	if (str == null || str.length < 3 || str[0] != '<' || str[str.length - 1] != '>' || (str[1] != '@' && str[1] != '#')) return false;
	return true;
}

export = Ignore;