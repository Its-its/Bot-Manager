import Discord = require('discord.js');
import DiscordServer = require('../../discordserver');

import Command = require('../../command');


const PERMS = {
	MAIN: 'commands.rank',
	LIST: 'list',
	JOIN: 'join',
	LEAVE: 'leave',
	ADD: 'add',
	REMOVE: 'remove'
};

for(var name in PERMS) {
	if (name != 'MAIN') PERMS[name] = `${PERMS.MAIN}.${PERMS[name]}`;
}


class Rank extends Command {
	constructor() {
		super('rank');

		this.description = 'Lets players join a rank you created. By themselves.';

		this.perms = Object.values(PERMS);
	}

	public call(params: string[], server: DiscordServer, message: Discord.Message) {
		var ranks = server.ranks;

		if (params.length == 0) {
			return Command.info([
				[ 'Description', this.description ],
				[ 'Command Usage', ['list', 'join <name>', 'leave <name>'].map(b => server.getPrefix() + 'rank ' + b).join('\n') ]
			]);
		}

		var member = message.member;
		var roleId;

		var type = params.shift();
		var val = params.shift();

		switch (type) {
			case 'list':
				if (!this.hasPerms(message.member, server, PERMS.LIST)) return Command.noPermsMessage('Rank');

				if (ranks.length == 0) return Command.info([[ 'Public Ranks:', 'No Ranks Public' ]]);
				
				var roles = ranks.map(b => {
					var role = message.guild.roles.get(b);
					return [role.name, role.members.size + ' members'];
				});

				return Command.info([[ 'Public Ranks:', Command.table([], roles) ]]);

			case 'join':
				if (!this.hasPerms(message.member, server, PERMS.JOIN)) return Command.noPermsMessage('Rank');

				if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				if (!server.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
				if (member.roles.has(val)) return Command.error([['ERROR!', 'You already have the role!']]);
				member.addRole(roleId, 'Public Rank - User requested.')
				.then(s => {}, reason => { console.error(' - ' + reason); })
				.catch(reason => console.error(reason));
				break;

			case 'leave':
				if (!this.hasPerms(message.member, server, PERMS.LEAVE)) return Command.noPermsMessage('Rank');

				if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				if (!server.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
				if (!member.roles.has(val)) return Command.error([['ERROR!', 'You already have the role!']]);
				member.removeRole(roleId, 'Public Rank - User requested.')
				.then(s => {}, reason => { console.error(' - ' + reason); })
				.catch(reason => console.error(reason));
				break;
			
			// Add/Remove role from public ranks.
			case 'add':
				if (!this.hasPerms(message.member, server, PERMS.ADD)) return Command.noPermsMessage('Rank');

				if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if (server.isRank(val)) return Command.error([['ERROR!', 'Rank already exists!']]);
				if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				server.addRank(roleId);
				break;

			case 'remove':
				if (!this.hasPerms(message.member, server, PERMS.REMOVE)) return Command.noPermsMessage('Rank');

				if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
				if (!server.isRank(val)) return Command.error([['ERROR!', 'Rank already removed!']]);
				if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
				server.removeRank(roleId);
				break;
		}

		server.save();

		function getRoleId(name: string): string {
			name = name.toLowerCase();

			var roles = message.guild.roles.array();
			for(var i = 0; i < roles.length; i++) {
				var role = roles[i];
				if (role.name.toLowerCase() == name)
					return role.id;
			}
			return null;
		}

		// return Command.success([['', resp]]);
	}
}

export = Rank;