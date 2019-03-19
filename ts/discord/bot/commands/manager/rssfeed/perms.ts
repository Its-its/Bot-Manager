

const PERMS = {
	MAIN: 'commands.rssfeed',
	ADD: 'add',
	REMOVE: 'remove',
	FORMAT: 'format',
	LIST: 'list'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


export = PERMS;