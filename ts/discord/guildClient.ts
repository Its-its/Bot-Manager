import redis = require('redis');

import DiscordServers = require('../site/models/discord_servers');


let redisGuildsClient = redis.createClient({ db: '0' });


function edit(serverId: string, value: Client, cb?: redis.Callback<'OK'>) {
	redisGuildsClient.set(serverId, JSON.stringify(value), cb);
}

function get(serverId: string, cb: (client: Client) => any) {
	redisGuildsClient.get(serverId, (err, str) => {
		if (err != null) { console.error(err); cb(null); }
		if (str == null) cb(null);

		cb(JSON.parse(str));
	});
}


function addRole(roles: Array<Role>, role: Role): Array<Role> {
	if (getRoleIndex(roles, role.id) == -1) {
		roles.push(role);
		roles.sort((r1, r2) => r2.position - r1.position);
	}

	return roles;
}

function removeRole(roles: Array<Role>, roleId: string): Array<Role> {
	var index = getRoleIndex(roles, roleId);
	if (index != -1) roles.splice(index, 1);
	return roles;
}

function getRoleIndex(roles: Array<Role>, roleId: string): number {
	for (var i = 0; i < roles.length; i++) {
		if (roles[i].id == roleId) return i;
	}

	return -1;
}

function getRole(roles: Array<Role>, roleId: string): Role {
	var index = getRoleIndex(roles, roleId);
	return index == -1 ? null : roles[index];
}



export {
	edit,
	get,
	addRole,
	removeRole
};


interface Client {
	commands: Array<Command>;
	roles: Array<Role>;
}

interface Role {
	id: string;
	name: string;
	color: number;
	hoist: boolean;
	position: number;
	permissions: number;
	managed: boolean;
	mentionable: boolean;
}

interface Command {
	commandName: Array<string>;
	disabled: boolean;
	params: Array<CommandParam>;
}

interface CommandParam {
	id: number;
	onCalled?: string;

	length?: number;
	minLength?: number;
	maxLength?: number;

	paramReg?: string;
	minPerms?: number;
	cb?: (params: Array<string>) => any;
};
