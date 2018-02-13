import Command = require('../../command');

class Rank extends Command {
	constructor() {
		super('rank');

		this.addParams(0, (params, userOptions, message) => {
			var ranks = userOptions.ranks;

			if (params.length == 0) {
				return Command.info([
					[ 'Command Usage', ['list', 'join <name>', 'leave <name>'].map(b => '!rank ' + b).join('\n') ]
				]);
			}

			var member = message.member;
			var roleId;

			var val = params[1];

			switch (params[0]) {
				case 'list':
					if (ranks.length == 0) return Command.info([[ 'Public Ranks:', 'No Ranks Public' ]]);
					
					var roles = ranks.map(b => {
						var role = message.guild.roles.get(b);
						return [role.name, role.members.size + ' members'];
					});

					return Command.info([[ 'Public Ranks:', Command.table([], roles) ]]);

				case 'join':
					if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
					if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
					if (!userOptions.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
					if (member.roles.has(val)) return Command.error([['ERROR!', 'You already have the role!']]);
					member.addRole(roleId, 'Public Rank - User requested.')
					.then(s => {}, reason => { console.error(' - ' + reason); })
					.catch(reason => console.error(reason));
					break;

				case 'leave':
					if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
					if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
					if (!userOptions.isRank(roleId)) return Command.error([['ERROR!', 'That is not a public rank!']]);
					if (!member.roles.has(val)) return Command.error([['ERROR!', 'You already have the role!']]);
					member.removeRole(roleId, 'Public Rank - User requested.')
					.then(s => {}, reason => { console.error(' - ' + reason); })
					.catch(reason => console.error(reason));
					break;
				
				// Add/Remove role from public ranks.
				case 'add':
					if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
					if (userOptions.isRank(val)) return Command.error([['ERROR!', 'Rank already exists!']]);
					if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
					userOptions.addRank(roleId);
					break;

				case 'remove':
					if (val == null) return Command.error([['ERROR!', 'Please specify the role!']]);
					if (!userOptions.isRank(val)) return Command.error([['ERROR!', 'Rank already removed!']]);
					if ((roleId = getRoleId(val)) == null) return Command.error([['ERROR!', 'That is not a valid role name!']]);
					userOptions.removeRank(roleId);
					break;
			}

			userOptions.save();

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
		});
	}
}

export = Rank;