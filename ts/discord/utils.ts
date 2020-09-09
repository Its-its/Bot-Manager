import Discord = require('discord.js');

import Command = require('./bot/command');

import { Nullable } from '@type-manager';
import utils = require('@base/discord/utils');


const startDate = Date.now();


const DefaultColor = 0xb0a79e;
const SuccessColor = 0x43f104;
const InfoColor = 0x46a0c0;
const WarningColor = 0xc4d950;
const ErrorColor = 0xd91582;

function noPermsMessage(cmdName: string) {
	return errorMsg([[cmdName, 'You don\'t have perms to access this.']]);
}

function defCall(color: number, array: any[][] | { embed: any; }): { type: 'echo', embed: any } {
	return {
		type: 'echo',
		embed: Array.isArray(array) ? {
			color: color,
			fields: array.map(a => { return { name: a[0], value: a[1] } })
		} : array.embed
	};
}

function defaultMsg(array: [string, string][]) {
	return defCall(DefaultColor, array);
}

function successMsg(array: [string, string][]) {
	return defCall(SuccessColor, array);
}

function errorMsg(array: [string, string][]) {
	return defCall(ErrorColor, array);
}

function warningMsg(array: [string, string][]) {
	return defCall(WarningColor, array);
}

function infoMsg(array: [string, string][]) {
	return defCall(InfoColor, array);
}

//! Text is different widths if not in code blocks.
// TODO: Max cell width
function tableMsg(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; monospaced?: boolean; }) {
	let compOpts = Object.assign({
		delimiter: ' ',
		spacing: 2,
		monospaced: true
	}, opts);

	let largestCell: number[] = [];
	let rows: string[] = [];

	// Column Lengths
	header.forEach((h, i) => largestCell[i] = String(h).length);
	body.forEach(b => {
		b.forEach((c, i) => {
			let len = String(c).length;
			let curLen = largestCell[i];

			if (curLen == null) {
				largestCell[i] = len;
			} else if (curLen < len) {
				largestCell[i] = len;
			}
		});
	});

	rows.push(header.map((h, i) => h + ' '.repeat(largestCell[i] - String(h).length + compOpts.spacing)).join(compOpts.delimiter));

	rows.push('='.repeat(rows[0].length));

	body.forEach(ro => {
		rows.push(ro.map((c, i) => c + ' '.repeat(largestCell[i] - String(c).length + compOpts.spacing)).join(compOpts.delimiter));
	});


	let comp = rows.join('\n');


	if (compOpts.monospaced) comp = '```' + comp + '```';


	// if (comp.length > 1024) throw 'Table is too large. ' + comp.length + '/1024';

	return comp;
}


function strpToId(str?: string): Nullable<string> {
	if (str == null) return null;

	if (!str.startsWith('<@') && !str.startsWith('<#')) return str;

	if (str.length < 3) return null;

	let sub = str.substr(2, str.length - 3);

	// Roles are <@&1234>
	if (sub[0] == '&') return sub.substr(1);

	// Nicks are <@!1234>
	if (sub[0] == '!') return sub.substr(1);

	return sub;
}


function getIdType(str: string): Nullable<'role' | 'member' | 'channel'> {
	if (str == null || str.length < 3) return null;

	if (str.startsWith('<@&') || str == '@everyone') return 'role';
	if (str.startsWith('<@')) return 'member';
	if (str.startsWith('<#')) return 'channel';

	return null;
}



function timeSince(time: number) {
	let seconds = Math.floor((new Date().getTime() - time) / 1000);

	let interval = Math.floor(seconds / 31536000);

	if (interval > 1) return interval + ' years';

	interval = Math.floor(seconds / 2592000);
	if (interval > 1) return interval + ' months';

	interval = Math.floor(seconds / 86400);
	if (interval > 1) return interval + ' days';

	interval = Math.floor(seconds / 3600);
	if (interval > 1) return interval + ' hours';

	interval = Math.floor(seconds / 60);
	if (interval > 1) return interval + ' minutes';

	return Math.floor(seconds) + ' seconds';
}


function secondsToHMS(duration: number) {
	return new Date(duration * 1000).toISOString().substr(11, 8);
}


type Sites = 'youtube';


function videoIdToUrl(site: Sites, id: string) {
	if (site == 'youtube') return 'https://youtu.be/' + id;
	return 'Unkown: ' + id + ' - ' + site;
}


function generateFullSong(
	title: string, id: string, icon: string,
	videoTitle: string, videoThumb: string, duration: number,
	channel: string, uploaded: string) {
	return {
		embed: {
			title: videoTitle,
			url: 'https://youtu.be/' + id,
			color: 0x46a0c0,
			timestamp: uploaded,
			footer: {
				icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
				text: 'Youtube'
			},
			thumbnail: {
				url: videoThumb
			},
			author: {
				name: title,
				url: 'https://its.rip/for/bots',
				icon_url: icon
			},
			fields: [
				{
					name: 'Duration',
					value: secondsToHMS(duration),
					inline: true
				},
				{
					name: 'Channel',
					value: channel,
					inline: true
				}
				// {
				// 	name: "Position",
				// 	value: "best",
				// 	inline: true
				// }
			]
		}
	};
}

const DISCORD_FLAGS = {
	CREATE_INSTANT_INVITE: 1 << 0,
	KICK_MEMBERS: 1 << 1,
	BAN_MEMBERS: 1 << 2,
	ADMINISTRATOR: 1 << 3,
	MANAGE_CHANNELS: 1 << 4,
	MANAGE_GUILD: 1 << 5,
	ADD_REACTIONS: 1 << 6,
	VIEW_AUDIT_LOG: 1 << 7,

	VIEW_CHANNEL: 1 << 10,
	SEND_MESSAGES: 1 << 11,
	SEND_TTS_MESSAGES: 1 << 12,
	MANAGE_MESSAGES: 1 << 13,
	EMBED_LINKS: 1 << 14,
	ATTACH_FILES: 1 << 15,
	READ_MESSAGE_HISTORY: 1 << 16,
	MENTION_EVERYONE: 1 << 17,
	USE_EXTERNAL_EMOJIS: 1 << 18,

	CONNECT: 1 << 20,
	SPEAK: 1 << 21,
	MUTE_MEMBERS: 1 << 22,
	DEAFEN_MEMBERS: 1 << 23,
	MOVE_MEMBERS: 1 << 24,
	USE_VAD: 1 << 25,

	CHANGE_NICKNAME: 1 << 26,
	MANAGE_NICKNAMES: 1 << 27,
	MANAGE_ROLES: 1 << 28,
	MANAGE_WEBHOOKS: 1 << 29,
	MANAGE_EMOJIS: 1 << 30,
};

type PermissionTypes = number | Permissions | Array<string> | string;

class Permissions {
	public bitfield: number;

	constructor(permissions: PermissionTypes) {
		this.bitfield = Permissions.resolve(permissions);
	}

	has(permission: PermissionTypes, checkAdmin = true): boolean {
		if (permission instanceof Array) return permission.every(p => this.has(p, checkAdmin));
			permission = Permissions.resolve(permission);
		if (checkAdmin && (this.bitfield & Permissions.FLAGS.ADMINISTRATOR) > 0) return true;
			return (this.bitfield & permission) === permission;
	}

	missing(permissions: PermissionTypes, checkAdmin = true) {
		if (!(permissions instanceof Array)) permissions = new Permissions(permissions).toArray(false);
			return permissions.filter(p => !this.has(p, checkAdmin));
	}

	freeze() {
		return Object.freeze(this);
	}

	add(...permissions: PermissionTypes[]) {
		let total = 0;
		for (let p = permissions.length - 1; p >= 0; p--) {
			const perm = Permissions.resolve(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new Permissions(this.bitfield | total);
		this.bitfield |= total;
		return this;
	}

	remove(...permissions: PermissionTypes[]) {
		let total = 0;
		for (let p = permissions.length - 1; p >= 0; p--) {
			const perm = Permissions.resolve(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new Permissions(this.bitfield & ~total);
		this.bitfield &= ~total;
		return this;
	}

	serialize(checkAdmin = true) {
		const serialized: { [name: string]: boolean } = {};

		for (const perm in Permissions.FLAGS)
			serialized[perm] = this.has(perm, checkAdmin);

		return serialized;
	}

	toArray(checkAdmin = true): string[] {
		return Object.keys(Permissions.FLAGS).filter(perm => this.has(perm, checkAdmin));
	}

	*[Symbol.iterator]() {
		const keys = this.toArray();
		while (keys.length) yield keys.shift();
	}

	static resolve(permission: PermissionTypes): number {
		if (typeof permission === 'number' && permission >= 0) return permission;
		if (permission instanceof Permissions) return permission.bitfield;
		if (Array.isArray(permission)) return permission.map(p => this.resolve(p)).reduce((prev, p) => prev | p, 0);
		// @ts-ignore
		if (typeof permission === 'string') return this.FLAGS[permission];

		throw new Error('PERMISSIONS_INVALID');
	}

	static FLAGS = DISCORD_FLAGS;

	static ALL = Object.values(Permissions.FLAGS).reduce((all, p) => all | p, 0);

	static DEFAULT = 104324097;
}

// TODO: Remove. Use Discords instead.
function getPermissions(p: PermissionTypes) {
	return new Permissions(p);
}



// Page



type GChannel = Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel;

function createPageSelector(responder: string, channel: GChannel, cb?: (value: MessagePage) => any) {
	if (cb == null) return new MessagePage({ author_id: responder, channel: channel });

	channel.send('Please wait...')
	.then(c => {cb(new MessagePage({ author_id: responder, editingMessage: Array.isArray(c) ? c[0] : c, channel }))});
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


const DEFAULT_CONFIG_VALUES = {
	removeReply: true,
	timeoutMS: 1000 * 60 * 2,
}

const DELAY_BETWEEN_SELECTIONS = 3 * 1000;

// const pageReplaceValues = [ '{input}', '{name}' ];

const formatReplaceValues: { [name: string]: (page: MessagePage) => string } = {
	'{page_items}': (page: MessagePage) => page.selections.map(s => s == null ? '' : page.pageSelectionFormat(s)).join('\n'),
	'{pagination}': (page: MessagePage) => '_Pagination goes here_'
};

class MessagePage {
	public author_id: string;

	// Last ran command. Used to prevent rate limits.
	public lastUpdated: number;

	// If user has ran a command.
	public processingInput: boolean;

	// Use cached data on back button from child.
	public useCachedOnBack: boolean;

	public onMessage?: (value: string) => Promise<boolean> = undefined;

	public channel: GChannel;
	public editingMessage?: Discord.Message;

	public collector?: Discord.MessageCollector;

	public selectionCalls: { [name: string]: (value: MessagePage) => Promise<any> } = {};
	public selections: (PageSelection | null)[] = [];

	public removeReply: boolean;
	public timeoutMS?: number;

	public parent?: MessagePage;

	public initiated = false;

	public format: string[] | (() => string[]) = [];
	public pageSelectionFormat = (item: PageSelection) => item.input + ' > ' + item.description;

	constructor(config: MessagePageConfig) {
		Object.assign(config, DEFAULT_CONFIG_VALUES);

		this.useCachedOnBack = true;
		this.lastUpdated = Date.now();
		this.processingInput = false;
		this.author_id = config.author_id;

		this.editingMessage = config.editingMessage;
		this.channel = config.channel;

		this.parent = config.parent;
		this.removeReply = (config.removeReply == null ? false : config.removeReply);
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

		let channel: GChannel = this.editingMessage != null ? this.editingMessage.channel : this.channel;

		this.createCollector(channel);
	}

	createCollector(channel: GChannel) {
		this.collector = channel.createMessageCollector(m => m.author.id == this.author_id, { time: this.timeoutMS });

		this.collector.on(
			'collect',
			utils.asyncFnWrapper(
				async collectedMsg => {
					if (this.processingInput) return;

					this.processingInput = true;

					await this.onCollect(collectedMsg);

					this.processingInput = false;
				},
				async err => {
					await this.collectorError(err);
					this.processingInput = false;
				}
			)
		);

		this.collector.on(
			'end', utils.asyncFnWrapper(
				async (_, reason) => this.onEnd(<any>reason),
				async err => this.collectorError(err)
			)
		);
	}

	async collectorError(err: any) {
		console.error(err);

		await this.close('exit');

		await this.temporaryMessage(Command.error([[
			'An Error Occured.',
			'Please try again in a few minutes..\n\n' + err
		]]), 3000);
	}

	public async onCollect(userMessage: Discord.Message) {
		let input = userMessage.cleanContent.toLowerCase().trim();

		if (Date.now() < this.lastUpdated + DELAY_BETWEEN_SELECTIONS) {
			await asyncTimeout(Date.now() - this.lastUpdated);
		}

		if (this.removeReply) {
			await userMessage.delete();
			await asyncTimeout(500);
		}

		if (await this.select(input)) return;

		// Stops current one, creates new one to refresh the time.
		if (this.collector != null) this.collector.stop('invalid-input');

		// Pick the editingMessage channel if it exists otherwise cached channel.
		let channel = this.editingMessage != null ? this.editingMessage.channel : this.channel;

		this.createCollector(channel);

		if (this.editingMessage != null) {
			let m = await this.editingMessage.channel.send(Command.error([[ 'Input Error', `"${input}" is not a valid selection input.` ]]));

			await m.delete({ timeout: 2000, reason: 'Invalid Selection Input.' });
		}
	}

	public async onEnd(reason: 'time' | 'exit' | 'delete') {
		console.log('End: ' + reason);

		if (reason == 'time') {
			if (this.editingMessage == null) return;

			await this.editingMessage.delete();

			this.editingMessage = undefined;
			await this.temporaryMessage(Command.error([[ 'Time limit exceeded.', 'Removing page selections...' ]]), 3000);
		} else if (reason == 'exit') {
			await this.edit(Command.error([['Pages', 'Exiting...']]));

			if (this.editingMessage == null) return;

			await this.editingMessage.delete({ timeout: 3000, reason: 'Exiting Page.' });

			this.editingMessage = undefined;
		} else if (reason == 'delete') {
			if (this.editingMessage == null) return;

			await this.editingMessage.delete();

			this.editingMessage = undefined;
		}
	}

	public async display() {
		if (this.parent != null) {
			await this.parent.close('delete');

			this.addSelection(
				'Back',
				'Return to previous page.',
				async _ => this.back()
			);
		}

		this.addSelection(
			'Exit',
			'Exits out of the selection.',
			async _ => this.close('exit')
		);

		await this.refresh();

		return this;
	}

	public async refresh() {
		if (this.editingMessage == null) {
			let m = await this.channel.send(this.compileMessage());

			this.editingMessage = m;
			this.init();
		} else {
			await this.edit(this.compileMessage());

			this.init();
		}

		return this;
	}

	public async close(reason: 'close' | 'delete' | 'time' | string = 'close') {
		if (this.collector != null && !this.collector.ended) {
			this.collector.stop(reason);
		} else {
			if (this.editingMessage != null && reason != 'close') {
				await this.editingMessage.delete();
				this.editingMessage = undefined;
			}
		}

		this.collector = undefined;
		this.initiated = false;
	}

	public async back() {
		if (this.parent == null) return;

		this.parent.lastUpdated = Date.now();

		await this.close('delete');

		await asyncTimeout(500);

		await this.parent.display();
	}

	// TODO: Handle Async | setup: (value: MessagePage) => Promise<any> | void
	public addSelection(inputValue: string, description: string, setup: (value: MessagePage) => Promise<any>): MessagePage {
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
		for(let i = 0; i < this.selections.length; i++) {
			let selection = this.selections[i];

			if (selection != null && selection.input == inputValue) {
				Object.assign(selection, opts);
				break;
			}
		}

		return this;
	}

	public listen(cb: (value: string) => Promise<boolean>) {
		this.onMessage = cb;
	}

	public async select(inputValue: string): Promise<boolean> {
		if (this.selectionCalls[inputValue] == null) {
			if (this.onMessage != null) {
				return this.onMessage(inputValue);
			} else {
				return false;
			}
		}

		let newPage = new MessagePage({ author_id: this.author_id, channel: this.channel, parent: this });

		await this.selectionCalls[inputValue](newPage);

		return true;
	}

	public async temporaryMessage(contents: any, deletion: number) {
		await this.close(); // No need to select anything anymore.

		if (this.editingMessage == null) return Promise.resolve();

		let msg = await this.editingMessage.edit(contents);

		await msg.delete({ timeout: deletion, reason: 'Temporary message.' });

		return Promise.resolve();
	}

	public async edit(newMessage: any) {
		// this.close(); // No need to select anything anymore.

		if (this.editingMessage == null) return;

		let m = await this.editingMessage.edit(newMessage);

		this.setEditing(m);

		return m;
	}


	public compileMessage() {
		let format: string[];

		if (!Array.isArray(this.format)) {
			format = this.format();
		} else {
			format = this.format;
		}

		return infoMsg([[
			'Pages',
			format.map(f => {
				for(let format in formatReplaceValues) {
					if (f == format) return formatReplaceValues[format](this);
				}
				return f;
			}).join('\n')
		]]);
	}

	public setFormat(format: string[] | (() => string[])) {
		this.format = format;
		return this;
	}

	public setCollectionFormat(format: (item: PageSelection) => string) {
		this.pageSelectionFormat = format;
		return this;
	}

	public setEditing(message: Discord.Message) {
		if (this.parent != null) this.parent.setEditing(message);
		this.editingMessage = message;
		return this;
	}
}


// ASYNC

/**
 * Uses setTimeout to wait.
 */
async function asyncTimeout(timeout: number) {
	return new Promise(res => setTimeout(res, timeout));
}

/**
 * Catches Promise error by outputting to [value, error]
 */
async function asyncCatch<P>(value: Promise<P>): Promise<[Nullable<P>, Nullable<any>]> {
	return new Promise(res => {
		value.then(v => res([v, null]))
		.catch(e => res([null, e]));
	});
}

/**
 * Catches Promise error by outputting as Value or NULL
 */
async function asyncCatchAsNull<P>(value: Promise<P>): Promise<Nullable<P>> {
	return new Promise(res => {
		value.then(v => res(v))
		.catch(e => res(null));
	});
}

/**
 * Catches Promise errors by outputting as true or false if it was a success.
 */
async function asyncCatchBool<P>(value: Promise<P>): Promise<boolean> {
	return new Promise(res => {
		value.then(_ => res(true))
		.catch(_ => res(false));
	});
}

/**
 * Catches Promise errors by outputting as true or false if it was a success.
 */
async function asyncCatchError<P>(value: Promise<P>): Promise<any | null> {
	return new Promise(res => {
		value.then(_ => res(null))
		.catch(e => res(e));
	});
}


/**
 * Wraps a function to catch errors. Useful for function blocks that don't support async.
 */
function asyncFnWrapper<P, V extends any[]>(
	complete: (...args: V) => Promise<P>,
	ifError?: (error: any, ...args: V) => Promise<P>
): (...args: V) => void {
	return function(...args) {
		complete.call(null, ...args)
		.catch(e => {
			if (ifError != null) {
				// @ts-ignore
				ifError.call(null, e, ...args)
				.catch(console.error);
			} else {
				console.error(e)
			}
		});
	}
}




export {
	getPermissions,
	Permissions,

	DefaultColor,
	SuccessColor,
	InfoColor,
	WarningColor,
	ErrorColor,

	tableMsg,
	defCall,
	defaultMsg,
	successMsg,
	errorMsg,
	warningMsg,
	infoMsg,
	noPermsMessage,

	startDate,
	strpToId,
	getIdType,

	// Music
	videoIdToUrl,
	generateFullSong,
	timeSince,
	secondsToHMS,

	// Page
	MessagePage,
	createPageSelector,

	// Async
	asyncTimeout,
	asyncCatch,
	asyncCatchBool,
	asyncCatchAsNull,
	asyncFnWrapper,
	asyncCatchError
}