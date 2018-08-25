const startDate = Date.now();


const DefaultColor = 0xb0a79e;
const SuccessColor = 0x43f104;
const InfoColor = 0x46a0c0;
const WarningColor = 0xc4d950;
const ErrorColor = 0xd91582;


function defCall(color: number, array: [string, string][]) {
	return {
		type: 'echo',
		embed: {
			color: color,
			fields: array.map(a => { return { name: a[0], value: a[1] } })
		}
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

// TODO: Text is different widths
function tableMsg(header: string[], body: any[][], opts?: { delimiter?: string; spacing?: number; }): string {
	opts = Object.assign({
		delimiter: ' ',
		spacing: 2
	}, opts);

	var largestCell: number[] = [];
	var rows: string[] = [];

	// Column Lengths
	header.forEach((h, i) => largestCell[i] = String(h).length);
	body.forEach(b => {
		b.forEach((c, i) => {
			var len = String(c).length;
			var curLen = largestCell[i];

			if (curLen == null) {
				largestCell[i] = len;
			} else if (curLen < len) {
				largestCell[i] = len;
			}
		});
	});

	//
	rows.push(header.map((h, i) => h + ' '.repeat(largestCell[i] - String(h).length + opts.spacing)).join(opts.delimiter));

	body.forEach(ro => {
		rows.push(ro.map((c, i) => c + ' '.repeat(largestCell[i] - String(c).length + opts.spacing)).join(opts.delimiter));
	});

	return rows.join('\n');
}


function strpToId(str: string): string {
	if (str == null) return null;

	if (!str.startsWith('<@') && !str.startsWith('<#')) return str;

	if (str.length < 3) return null;

	var sub = str.substr(2, str.length - 3);

	// Roles are <@&1234>
	if (sub[0] == '&') return sub.substr(1);
	
	return sub;
}


function getIdType(str: string): 'role' | 'member' | 'channel' {
	if (str == null || str.length < 3) return null;

	if (str.startsWith('<@&') || str == '@everyone') return 'role';
	if (str.startsWith('<@')) return 'member';
	if (str.startsWith('<#')) return 'channel';

	return null;
}



function timeSince(time: number) {
	var seconds = Math.floor((new Date().getTime() - time) / 1000);

	var interval = Math.floor(seconds / 31536000);

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

class Permissions {
	public bitfield: number;

	constructor(permissions: number | Permissions | Array<string> | string) {
		this.bitfield = Permissions.resolve(permissions);
	}

	has(permission: number | Permissions | Array<string> | string, checkAdmin = true) {
		if (permission instanceof Array) return permission.every(p => this.has(p, checkAdmin));
			permission = Permissions.resolve(permission);
		if (checkAdmin && (this.bitfield & Permissions.FLAGS.ADMINISTRATOR) > 0) return true;
			return (this.bitfield & permission) === permission;
	}

	missing(permissions: number | Permissions | Array<string> | string, checkAdmin = true) {
		if (!(permissions instanceof Array)) permissions = new Permissions(permissions).toArray(false);
			return permissions.filter(p => !this.has(p, checkAdmin));
	}

	freeze() {
		return Object.freeze(this);
	}

	add(...permissions) {
		let total = 0;
		for (let p = permissions.length - 1; p >= 0; p--) {
			const perm = Permissions.resolve(permissions[p]);
			total |= perm;
		}
		if (Object.isFrozen(this)) return new Permissions(this.bitfield | total);
		this.bitfield |= total;
		return this;
	}

	remove(...permissions) {
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
		const serialized = {};
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

	static resolve(permission: number | Permissions | Array<string> | string): number {
		if (typeof permission === 'number' && permission >= 0) return permission;
		if (permission instanceof Permissions) return permission.bitfield;
		if (Array.isArray(permission)) return permission.map(p => this.resolve(p)).reduce((prev, p) => prev | p, 0);
		if (typeof permission === 'string') return this.FLAGS[permission];
		throw new Error('PERMISSIONS_INVALID');
	}

	static FLAGS = DISCORD_FLAGS;

	static ALL = (<any>Object).values(Permissions.FLAGS).reduce((all, p) => all | p, 0);

	static DEFAULT = 104324097;
}


function getPermissions(p: number | Permissions | Array<string> | string) {
	return new Permissions(p);
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

	startDate,
	strpToId,
	getIdType,

	// Music
	videoIdToUrl,
	generateFullSong,
	timeSince,
	secondsToHMS
}