

const PERMS = {
	MAIN: 'commands.rssfeed',
	TOGGLE: 'toggle',
	ADD: 'add',
	REMOVE: 'remove',
	MOVE: 'move',
	EDIT_TEMPLATE: 'template',
	LIST: 'list'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


export = PERMS;