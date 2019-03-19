const PERMISSIONS = {
	MAIN: 'commands.perms',
	LIST: 'list',
	USER: 'user',
	USER_LIST: 'user.list',
	USER_ADD: 'user.add',
	USER_REMOVE: 'user.remove',
	ROLE: 'role',
	ROLE_LIST: 'role.list',
	ROLE_ADD: 'role.add',
	ROLE_REMOVE: 'role.remove',
	GROUP: 'group',
	GROUP_LIST: 'group.list',
	GROUP_CREATE: 'group.create',
	GROUP_ADD: 'group.add',
	GROUP_REMOVE: 'group.remove',
	CHANNELS: 'channels'
};

for(var name in PERMISSIONS) {
	if (name != 'MAIN') PERMISSIONS[name] = `${PERMISSIONS.MAIN}.${PERMISSIONS[name]}`;
}


export = PERMISSIONS;