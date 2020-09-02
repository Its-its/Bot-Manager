import Discord = require('discord.js');
import DiscordServer = require('../../GuildServer');

import Command = require('../../command');
import { Nullable } from '@type-manager';


const PERMS = {
	MAIN: 'commands.rank',
	LIST: 'list',
	JOIN: 'join',
	LEAVE: 'leave',
	ADD: 'add',
	REMOVE: 'remove'
};

for(let name in PERMS) {
	// @ts-ignore
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}

// TODO: Make ranks store sperately from main json. Lots of ranks on players (which are common) on large servers will cause major lag spikes every time it has to parse it.

class Rank extends Command {
	constructor() {
		super('rank');

		this.description = 'Lets players join a rank you created. By themselves.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		let ranks = server.ranks;

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', ['list', 'join <name>', 'leave <name>'].map(b => server.getPrefix() + 'rank ' + b).join('\n') ]
			]);
		}

		let guildNember = message.member!;
		let roleId: Nullable<string>;

		let parameterBeingCalled = params.shift();
		let valueOfParameter = params.shift();

		switch (parameterBeingCalled) {
			case 'list':
				if (!this.hasPerms(guildNember, server, PERMS.LIST)) return Command.noPermsMessage('Rank');

				if (ranks.length == 0) return Command.info([[ 'Public Ranks:', 'No Ranks Public' ]]);

				let roles = ranks.map(b => {
					let role = message.guild!.roles.cache.get(b);
					if (role == null) return null;
					return [role.name, role.members.size + ' members'];
				}).filter(f => f != null);

				return Command.info([[ 'Public Ranks:', Command.table([], <string[][]>roles) ]]);

			case 'join':
				if (!this.hasPerms(guildNember, server, PERMS.JOIN)) return Command.noPermsMessage('Rank');

				if (valueOfParameter == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if ((roleId = getRoleId(valueOfParameter)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				if (!server.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
				if (guildNember.roles.cache.has(valueOfParameter)) return Command.error([['ERROR!', 'You already have the role!']]);

				guildNember.roles.add(roleId, 'Public Rank - User requested.')
				.then(s => {}, reason => { console.error(' - ' + reason); })
				.catch(reason => console.error(reason));

				break;

			case 'leave':
				if (!this.hasPerms(guildNember, server, PERMS.LEAVE)) return Command.noPermsMessage('Rank');

				if (valueOfParameter == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if ((roleId = getRoleId(valueOfParameter)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				if (!server.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
				if (!guildNember.roles.cache.has(valueOfParameter)) return Command.error([['ERROR!', 'You already have the role!']]);

				guildNember.roles.remove(roleId, 'Public Rank - User requested.')
				.then(s => {}, reason => { console.error(' - ' + reason); })
				.catch(reason => console.error(reason));

				break;

			// Add/Remove role from public ranks.
			case 'add':
				if (!this.hasPerms(guildNember, server, PERMS.ADD)) return Command.noPermsMessage('Rank');

				if (valueOfParameter == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if (server.isRank(valueOfParameter)) return Command.error([['ERROR!', 'Rank already exists!']]);
				if ((roleId = getRoleId(valueOfParameter)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);

				server.addRank(roleId);

				break;

			case 'remove':
				if (!this.hasPerms(guildNember, server, PERMS.REMOVE)) return Command.noPermsMessage('Rank');

				if (valueOfParameter == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if (!server.isRank(valueOfParameter)) return Command.error([['ERROR!', 'Rank already removed!']]);
				if ((roleId = getRoleId(valueOfParameter)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);

				server.removeRank(roleId);

				break;
		}

		server.save();

		function getRoleId(name: string): Nullable<string> {
			name = name.toLowerCase();

			let roles = message.guild!.roles.cache.array();
			for(let i = 0; i < roles.length; i++) {
				let role = roles[i];
				if (role.name.toLowerCase() == name)
					return role.id;
			}

			return null;
		}

		// return Command.success([['', resp]]);
	}
}

export = Rank;