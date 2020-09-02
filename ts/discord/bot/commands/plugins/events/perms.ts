
const PERMS = {
	MAIN: 'commands.events',
	ADD: 'add',
	EDIT: 'edit'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

export = PERMS;