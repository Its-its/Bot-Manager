import Discord = require('discord.js');

import Command = require('../command');

type GChannel = Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel;

function createPageSelector(responder: string, channel: GChannel, cb?: (value: MessagePage) => any) {
	if (cb == null) return new MessagePage({ author_id: responder, channel: channel });

	channel.send('Please wait...')
	.then((c: Discord.Message) => cb(new MessagePage({ author_id: responder, editingMessage: c, channel })));
}

interface MessagePageConfig {
	author_id: string;

	channel: GChannel;
	editingMessage?: Discord.Message;

	parent?: MessagePage;

	removeReply?: boolean;
	timeoutMS?: number;
}

interface PageSelection {
	input?: string;
	description?: string;
}


const defaultConfigValues = {
	removeReply: true,
	timeoutMS: 1000 * 60 * 2
}

// const pageReplaceValues = [ '{input}', '{name}' ];

const formatReplaceValues = [
	'{page_items}',
	'{pagination}'
];

class MessagePage {
	public author_id: string;

	public channel: GChannel;
	public editingMessage: Discord.Message;

	public collector: Discord.MessageCollector;

	public selectionCalls: { [name: string]: (value: MessagePage, fin: (dontDisplay?: boolean) => any) => any } = {};
	public selections: PageSelection[] = [];

	public removeReply: boolean;
	public timeoutMS: number;

	public parent?: MessagePage;

	public initiated = false;

	// 
	public format: string[];
	public pageSelectionFormat = (item: PageSelection) => item.input + ') ' + item.description;

	constructor(config: MessagePageConfig) {
		Object.assign(config, defaultConfigValues);

		this.author_id = config.author_id;
		this.editingMessage = config.editingMessage;
		this.channel = config.channel;
		
		this.parent = config.parent;
		this.removeReply = config.removeReply;
		this.timeoutMS = config.timeoutMS;

		this.setFormat([
			'Pages are here:',
			'{page_items}',
			'Please select responsibly.'
		]);
	}

	public init() {
		if (this.initiated) return;
		this.initiated = true;

		this.collector = this.editingMessage.channel.createMessageCollector(m => m.author.id == this.author_id, { time: this.timeoutMS });
		this.collector.on('collect', (collectedMsg) => this.onCollect(collectedMsg));
		this.collector.on('end', (_, reason) => this.onEnd(reason));
	}

	public onCollect(userMessage: Discord.Message) {
		var input = userMessage.cleanContent.toLowerCase().trim();

		if (this.removeReply) {
			userMessage.delete()
			.catch(e => console.error(e));
		}

		if (this.select(input)) return;

		// Stops current one, creates new one to refresh the time.
		this.collector.stop('invalid-input');

		this.collector = this.editingMessage.channel.createMessageCollector(m => m.author.id == this.author_id, { time: this.timeoutMS });
		this.collector.on('collect', (collectedMsg) => this.onCollect(collectedMsg));
		this.collector.on('end', (_, reason) => this.onEnd(reason));

		// TODO: Ignore non-valid selection.

		// this.temporaryMessage(Command.error([[ 'Input Error', `"${input}" is not a valid selection input.` ]]), 3000, () => {
		// 	// 
		// });
		this.editingMessage.channel.send(Command.error([[ 'Input Error', `"${input}" is not a valid selection input.` ]]))
		.then((m: Discord.Message) => m.delete(2000).catch(e => console.error(e)))
		.catch(e => console.error(e));
	}

	public onEnd(reason: string) {
		console.log('End: ' + reason);
		if (reason == 'time') {
			this.editingMessage.delete();
			this.temporaryMessage(Command.error([[ 'Time limit exceeded.', 'Removing page selections...' ]]), 3000);
		} else if (reason == 'exit') {
			this.edit(Command.error([['Pages', 'Exiting...']]), () => {
				this.editingMessage.delete(3000)
				.catch(e => console.error(e));
			});
		} else if (reason == 'delete') {
			this.editingMessage.delete()
			.catch(e => console.error(e));
		}
	}

	public display() {
		if (this.parent != null) this.addSelection('Back', 'Return to previous page.', (page, cb) => { cb(true); this.back(); });
		this.addSelection('Exit', 'Exits out of the selection.', (page, cb) => { cb(true); this.close('exit'); });

		this.refresh();

		return this;
	}

	public refresh() {
		if (this.editingMessage == null) {
			this.channel.send(this.compileMessage())
			.then((c: Discord.Message) => {
				this.editingMessage = c;
				this.init();
			})
			.catch(e => console.error(e));
		} else {
			this.edit(this.compileMessage(), () => {
				this.init();
			});
		}

		return this;
	}

	public close(reason: 'close' | 'delete' | 'time' | string = 'close') {
		if (this.collector != null && !this.collector.ended) {
			this.collector.stop(reason); 
		}

		this.collector = null;
		this.initiated = false;
	}

	public back() {
		if (this.parent == null) return;

		this.close();
		this.parent.display();
	}

	public addSelection(inputValue: string, description: string, setup: (value: MessagePage, fin: (dontDisplay?: boolean) => any) => any): MessagePage {
		if (this.selectionCalls[inputValue.toLowerCase()] == null) {
			this.selectionCalls[inputValue.toLowerCase()] = setup;
			this.selections.push({ input: inputValue, description: description });
		}

		return this;
	}

	public addSpacer() {
		this.selections.push(null);
		return this;
	}

	public editSelection(inputValue: string, opts: PageSelection) {
		for(var i = 0; i < this.selections.length; i++) {
			if (this.selections[i].input == inputValue) {
				Object.assign(this.selections[i], opts);
				break;
			}
		}

		return this;
	}

	public select(inputValue: string): boolean {
		if (this.selectionCalls[inputValue] == null) return false;

		const doDisplayCrap = (dontDisplay: boolean) => {
			if (dontDisplay) return; // TODO: Remove

			this.close();
			newPage.display();
		};

		const newPage = new MessagePage({ author_id: this.author_id, editingMessage: this.editingMessage, channel: this.channel, parent: this });

		this.selectionCalls[inputValue](newPage, doDisplayCrap);

		return true;
	}

	public temporaryMessage(contents, deletion: number, cb?: () => any) {
		this.close(); // No need to select anything anymore.

		// channel.send
		this.editingMessage.edit(contents)
		.then((msg: Discord.Message) => {
			msg.delete(deletion)
			.then(() => cb && cb())
			.catch(e => console.error(e));
		})
		.catch(e => console.error(e));
	}

	public edit(newMessage, cb: (value: Discord.Message) => any) {
		this.close(); // No need to select anything anymore.

		this.editingMessage.edit(newMessage)
		.then(m => { this.setEditing(m); cb(m);})
		.catch(e => console.error(e));
	}


	public compileMessage() {
		return Command.info([[
			'Pages',
			this.format.map(f => {
				if (f == '{page_items}') return this.selections.map(s => s == null ? '\n' : this.pageSelectionFormat(s)).join('\n');
				if (f == '{pagination}') return '_Pagination goes here_';

				return f;
			}).join('\n')
		]]);
	}

	public setFormat(format: string[]) {
		this.format = format;
		return this;
	}

	public setCollectionFormat(format: (item: PageSelection) => string) {
		this.pageSelectionFormat = format;
		return this;
	}

	public setEditing(message: Discord.Message) {
		this.editingMessage = message;
		return this;
	}
}


export {
	MessagePage,

	createPageSelector
};