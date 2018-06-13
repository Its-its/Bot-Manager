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
					'<ID> add phrase <phrase,>',
					'<ID> remove phrase [phrase,]',
					'<ID> add response <phrase,>',
					'<ID> remove response [phrase,]',
					// 'response <ID> <response,>',
					'<ID> ignorecase <true/false>'
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

					args = args.concat(client.phrases.map((p, i) => [ 'ID: ' + p.pid , 'Phrases: ' + p.phrases.join(', ') + '\nResponse: ' + p.responses.join(', ') ]));

					message.channel.send(Command.info(args));
					break;
				case 'create':
					if (params.length < 2) return;
					client.createPhrase(message.member, params.shift().split(','), (phrase) => {
						if (phrase == null) return;

						var resp = params.join(' ');
						// TODO
						// .split(',', 2)
						// .map(p => {
						// 	var spl = p.split(' ');

						// 	if (spl.length > 0) {
						// 		if (spl[0].toLowerCase() == 'interval') {
						// 			if (isNaN(parseInt(spl[1])) || ['reset'].indexOf(spl[2].toLowerCase()) == -1)
						// 				return;
						// 		} else if (!p.startsWith('echo')) {
						// 			p = 'echo ' + p;
						// 		}
						// 	}

						// 	return p;
						// });

						phrase.responses = [ { type: 'echo', message: resp } ];
						client.save(() => message.channel.send(Command.info([['Phrase', 'Created Phrase Successfully.']])));
					});
					break;
				default:
					var dodis = params.shift();
					var name = params.shift();

					if (dodis == null || name == null) return;

					if (dodis == 'add') {
						if (name == 'phrase') {
							client.addPhrase(type, params.join(' ').split(','));
							client.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
						} else if (name == 'response') {
							client.setPhraseResponse(type, <any>params.join(' ').split(',').map(i => { return { type: 'echo', message: i } }));
							client.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
						}
					} else if (dodis == 'remove') {
						if (name == 'phrase') {
							var phrases = null;
							if (params.length != 0) phrases = params.join(' ').split(',');

							client.removePhrase(type, phrases);
							client.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
						} else if (name == 'response') {
							//
						}
					}
				// case 'add':
				// 	if (params.length < 2) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	client.addPhrase(id, params.join(' ').split(','));
				// 	client.save(() => message.channel.send(Command.info([['Phrase', 'Added Phrase']])));
				// 	break;
				// case 'remove':
				// 	if (params.length < 1) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	var phrases = null;
				// 	if (params.length != 0) phrases = params.join(' ').split(',');

				// 	client.removePhrase(id, phrases);
				// 	client.save(() => message.channel.send(Command.info([['Phrase', 'Successfully Removed Phrase']])));
				// 	break;
				// case 'response':
				// 	if (params.length < 2) return;
				// 	var id = parseInt(params.shift());
				// 	if (isNaN(id)) return;

				// 	client.setPhraseResponse(id, params.join(' ').split(','));
				// 	client.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Response.']])));
				// 	break;
				case 'ignorecase':
					if (params.length < 2) return;
					var id = parseInt(params.shift());
					if (isNaN(id)) return;

					client.setPhraseIgnoreCase(id, params.shift() == 'true');
					client.save(() => message.channel.send(Command.info([['Phrase', 'Changed Phrase Ignore Case.']])));
					break;
			}
		});
	}
}

export = Create;