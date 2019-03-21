
const PERMS = {
	MAIN: 'commands.events',
	ADD: 'add',
	EDIT: 'edit'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

export = PERMS;