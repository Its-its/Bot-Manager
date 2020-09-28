const PERMS = {
	MAIN: 'commands.recording',

	START: 'start',
	STOP: 'stop'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

export = PERMS;