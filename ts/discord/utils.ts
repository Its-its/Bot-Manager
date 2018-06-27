const startDate = Date.now();


const DefaultColor = 0xb0a79e;
const SuccessColor = 0x43f104;
const InfoColor = 0x46a0c0;
const WarningColor = 0xc4d950;
const ErrorColor = 0xd91582;


function defCall(color: number, array: string[][]) {
	return {
		type: 'echo',
		embed: {
			color: color,
			fields: array.map(a => { return { name: a[0], value: a[1] } })
		}
	};
}

function defaultMsg(array: string[][]) {
	return defCall(DefaultColor, array);
}

function successMsg(array: string[][]) {
	return defCall(SuccessColor, array);
}

function errorMsg(array: string[][]) {
	return defCall(ErrorColor, array);
}

function warningMsg(array: string[][]) {
	return defCall(WarningColor, array);
}

function infoMsg(array: string[][]) {
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


export {
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