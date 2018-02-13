import Command = require('../../command');

class Create extends Command {
	constructor() {
		super('phrase', false);

		this.addParams(0, 0, (params, client, message) => {
			message.channel.send(Command.info([[
				'Phrase',
				[
					'list',
					'create <phrase,> <response>',
					'add <ID> <phrase,>',
					'remove <ID> [phrase,]',
					'response <ID> <response,>'
				].map(i => '!phrase ' + i).join('\n')
			]]));
		});

		this.addParams(1, (params, client, message) => {
			var type = params.shift();
			switch (type) {
				case 'list':
					var args = [
						[	'Phrase List',
							'Phrase Count: ' + client.phrases.length ]
					];

					args = args.concat(client.phrases.map((p, i) => [ 'ID: ' + (i + 1), 'Phrases: ' + p.phrases.join(', ') + '\nResponse: ' + p.responses.join(', ') ]));

					message.channel.send(Command.info(args));
					break;
				case 'create':
					if (params.length < 2) return;
					var phrase = client.createPhrase(params.shift().split(','));
					if (phrase == null) return;

					var resp = params.join(' ')
					.split(',', 2)
					.map(p => {
						var spl = p.split(' ');

						if (spl.length > 0) {
							if (spl[0].toLowerCase() == 'interval') {
								if (isNaN(parseInt(spl[1])) || ['reset'].indexOf(spl[2].toLowerCase()) == -1)
									return;
							} else if (!p.startsWith('echo')) {
								p = 'echo ' + p;
							}
						}

						return p;
					});

					phrase.responses = resp;
					client.save(() => message.channel.send(Command.info([['Phrase', 'Created Phrase Successfully.']])));
					break;
				case 'add':
					if (params.length < 2) return;
					var id = parseInt(params.shift());
					if (isNaN(id)) return;

					client.addPhrase(id, params.join(' ').split(','));
					client.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
					break;
				case 'remove':
					if (params.length < 1) return;
					var id = parseInt(params.shift());
					if (isNaN(id)) return;

					var phrases = null;
					if (params.length != 0) phrases = params.join(' ').split(',');

					client.removePhrase(id, phrases);
					client.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
					break;
				case 'response':
					if (params.length < 2) return;
					var id = parseInt(params.shift());
					if (isNaN(id)) return;

					client.setPhraseResponse(id, params.join(' ').split(','));
					client.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
					break;
			}
		});
	}
}

export = Create;