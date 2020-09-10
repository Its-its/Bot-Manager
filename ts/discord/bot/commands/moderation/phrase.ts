import Discord = require('discord.js');
import { Server as DiscordServer } from '@discord/bot/GuildServer';

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

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

class Phrase extends Command {
	constructor() {
		super('phrase', false);

		this.description = 'Create phrases, when triggered reply with a message.';

		this.perms = Object.values(PERMS);
	}

	public async call(params: string[], server: DiscordServer, message: Discord.Message) {
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
						'<ID> add response <response>',
						'<ID> remove response [response]',
						'<ID> ignorecase <true/false>'
					].map(i => server.getPrefix() + 'phrase ' + i).join('\n')
				]
			]);
		}

		let cmdCallOrPhraseId = params.shift()!;

		switch (cmdCallOrPhraseId) {
			case 'list': {
				if (!this.hasPerms(message.member!, server, PERMS.LIST)) return Command.noPermsMessage('Phrase');

				await message.channel.send([
					'**Phrase List**',
					'Phrase Count: ' + server.phrases.items.length,
					Command.table(
						[ 'ID', 'Phrases', 'Response' ],
						server.phrases.items.map(
							p => [
								p.pid,
								p.phrases.join(', '),
								p.responses.map(r => server.phrases.phraseResponseToString(r)).join('\n')
							]
						)
					)
				].join('\n'));

				break;
			}

			case 'create': {
				if (!this.hasPerms(message.member!, server, PERMS.CREATE)) return Command.noPermsMessage('Phrase');

				if (params.length < 2) return;

				let phraseName = params.shift();

				if (phraseName == null) return Command.error([['Phrase', 'Invalid Params']]);

				if (!/^[a-z0-9]+$/i.test(phraseName)) return Command.info([['Phrase', 'Phrase name must only have A-Z 0-9 in it.']]);

				let phrase = await server.phrases.createPhrase(message.member!, phraseName.split(','));

				let resp = params.join(' ');

				phrase.responses = [ { type: 'echo', message: resp } ];

				await server.save();
				await message.channel.send(Command.info([['Phrase', 'Created Phrase Successfully.']]));

				break;
			}

			case 'ignorecase': {
				if (!this.hasPerms(message.member!, server, PERMS.IGNORECASE)) return Command.noPermsMessage('Phrase');

				if (params.length < 2) return Command.error([['Phrase', 'Invalid Params']]);

				let id = parseInt(params.shift()!);
				if (isNaN(id)) return;

				await server.phrases.setPhraseIgnoreCase(id, params.shift() == 'true');

				await server.save();
				await message.channel.send(Command.info([['Phrase', 'Changed Phrase Ignore Case.']]));

				break;
			}

			default: {
				let dodis = params.shift();
				let name = params.shift();

				if (dodis == null || name == null) return;

				if (dodis == 'add') {
					if (name == 'phrase') {
						if (!this.hasPerms(message.member!, server, PERMS.ADD_PHRASE)) return Command.noPermsMessage('Phrase');

						await server.phrases.addPhrase(cmdCallOrPhraseId, params.join(' ').split(','));

						await server.save();
						await message.channel.send(Command.info([['Phrase', 'Added Phrase']]))
					} else if (name == 'response') {
						if (!this.hasPerms(message.member!, server, PERMS.ADD_RESPONSE)) return Command.noPermsMessage('Phrase');

						await server.phrases.setPhraseResponse(cmdCallOrPhraseId, params.join(' ').split(',').map(i => { return { type: 'echo', message: i } }));

						await server.save();
						await message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']]))
					}
				} else if (dodis == 'remove') {
					if (name == 'phrase') {
						if (!this.hasPerms(message.member!, server, PERMS.REMOVE_PHRASE)) return Command.noPermsMessage('Phrase');

						let phrases = undefined;
						if (params.length != 0) phrases = params.join(' ').split(',');

						await server.phrases.removePhrase(cmdCallOrPhraseId, phrases);

						await server.save();
						await message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']]))
					} else if (name == 'response') {
						if (!this.hasPerms(message.member!, server, PERMS.REMOVE_RESPONSE)) return Command.noPermsMessage('Phrase');
						return Command.info([['Phrase', 'Not implemented yet. :/']])
					}
				}
			}

			// case 'add':
			// 	if (params.length < 2) return;
			// 	let id = parseInt(params.shift());
			// 	if (isNaN(id)) return;

			// 	server.addPhrase(id, params.join(' ').split(','));
			// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
			// 	break;
			// case 'remove':
			// 	if (params.length < 1) return;
			// 	let id = parseInt(params.shift());
			// 	if (isNaN(id)) return;

			// 	let phrases = null;
			// 	if (params.length != 0) phrases = params.join(' ').split(',');

			// 	server.removePhrase(id, phrases);
			// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
			// 	break;
			// case 'response':
			// 	if (params.length < 2) return;
			// 	let id = parseInt(params.shift());
			// 	if (isNaN(id)) return;

			// 	server.setPhraseResponse(id, params.join(' ').split(','));
			// 	server.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
			// 	break;
		}

		return Promise.resolve();
	}
}

export = Phrase;