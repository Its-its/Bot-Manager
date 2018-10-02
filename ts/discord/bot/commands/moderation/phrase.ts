import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.phrase',
	LIST: 'list',
	CREATE: 'create',
	ADD: 'add',
	ADD_PHRASE: 'add.phrase',
	ADD_RESPONSE: 'add.response',
	REMOVE: 'remove',
	REMOVE_PHRASE: 'remove.phrase',
	REMOVE_RESPONSE: 'remove.response',
	IGNORECASE: 'ignorecase'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

class Create extends Command {
	constructor() {
		super('phrase', false);

		this.description = 'Create phrases, when triggered reply with a message.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[
					'Phrase',
					[
						'list',
						'create <phrase,> <response>',
						'<ID> add phrase <phrase,>',
						'<ID> remove phrase [phrase,]',
						'<ID> add response <phrase,>',
						'<ID> remove response [phrase,]',
						// 'response <ID> <response,>',
						'<ID> ignorecase <true/false>'
					].map(i => server.getPrefix() + 'phrase ' + i).join('\n')
				]
			]);
		}

		var type = params.shift();
			switch (type) {
				case 'list':
					if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Phrase');

					var args = [
						[	'Phrase List',
							'Phrase Count: ' + server.phrases.length ]
					];

					args = args.concat(server.phrases.map((p, i) => [ 'ID: ' + p.pid , 'Phrases: ' + p.phrases.join(', ') + '\nResponse: ' + p.responses.join(', ') ]));

					message.channel.send(Command.info(args));
					break;

				case 'create':
					if (!this.hasPerms(message.member, server, PERMS.CREATE)) return Command.noPermsMessage('Phrase');

					if (params.length < 2) return;
					server.createPhrase(message.member, params.shift().split(','), (phrase) => {
						if (phrase == null) return;

						var resp = params.join(' ');

						phrase.responses = [ { type: 'echo', message: resp } ];
						server.save(() => message.channel.send(Command.info([['Phrase', 'Created Phrase Successfully.']])));
					});
					break;

				case 'ignorecase':
					if (!this.hasPerms(message.member, server, PERMS.IGNORECASE)) return Command.noPermsMessage('Phrase');

					if (params.length < 2) return;
					var id = parseInt(params.shift());
					if (isNaN(id)) return;

					server.setPhraseIgnoreCase(id, params.shift() == 'true');
					server.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Ignore Case.']])));
					break;

				default:
					var dodis = params.shift();
					var name = params.shift();

					if (dodis == null || name == null) return;

					if (dodis == 'add') {
						if (name == 'phrase') {
							if (!this.hasPerms(message.member, server, PERMS.ADD_PHRASE)) return Command.noPermsMessage('Phrase');

							server.addPhrase(type, params.join(' ').split(','));
							server.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
						} else if (name == 'response') {
							if (!this.hasPerms(message.member, server, PERMS.ADD_RESPONSE)) return Command.noPermsMessage('Phrase');

							server.setPhraseResponse(type, <any>params.join(' ').split(',').map(i => { return { type: 'echo', message: i } }));
							server.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
						}
					} else if (dodis == 'remove') {
						if (name == 'phrase') {
							if (!this.hasPerms(message.member, server, PERMS.REMOVE_PHRASE)) return Command.noPermsMessage('Phrase');

							var phrases = null;
							if (params.length != 0) phrases = params.join(' ').split(',');

							server.removePhrase(type, phrases);
							server.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
						} else if (name == 'response') {
							if (!this.hasPerms(message.member, server, PERMS.REMOVE_RESPONSE)) return Command.noPermsMessage('Phrase');
							return Command.info([['Phrase', 'Not implemented yet. :/']])
						}
					}

				// case 'add':
				// 	if (params.length < 2) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	server.addPhrase(id, params.join(' ').split(','));
				// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
				// 	break;
				// case 'remove':
				// 	if (params.length < 1) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	var phrases = null;
				// 	if (params.length != 0) phrases = params.join(' ').split(',');

				// 	server.removePhrase(id, phrases);
				// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
				// 	break;
				// case 'response':
				// 	if (params.length < 2) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	server.setPhraseResponse(id, params.join(' ').split(','));
				// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
				// 	break;
			}
	}
}

export = Create;