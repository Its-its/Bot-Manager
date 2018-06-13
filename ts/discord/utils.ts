let startDate = Date.now();


let DefaultColor = 0xb0a79e;
let SuccessColor = 0x43f104;
let InfoColor = 0x46a0c0;
let WarningColor = 0xc4d950;
let ErrorColor = 0xd91582;


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
	if (!str.startsWith('<@') && !str.startsWith('<#')) return str;

	if (str.length < 3) return null;

	var sub = str.substr(2, str.length - 3);
	if (sub[0] == '@' || sub[0] == '#') return sub.substr(1);
	
	return sub;
}


function getIdType(str: string): 'role' | 'user' | 'channel' {
	if (str == null || str.length < 4 || !str.startsWith('<') || !str.endsWith('>')) return null;
	if (str[2] == '&') return 'role';
	if (str[1] == '@') return 'user';
	if (str[1] == '#') return 'channel';
	return null;
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
	getIdType
}