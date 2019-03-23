

const COMMAND_DELAY = 3000;

interface Calls {
	guild_commands: {
		[id: string]: number;
	}
}

const NEXT_CALLS: Calls = {
	guild_commands: {
		// 'guild id': Date.now() + next_call
	}
};


function canCallCommand(guild_id: string): boolean {
	if (NEXT_CALLS.guild_commands[guild_id] != null && NEXT_CALLS.guild_commands[guild_id] > Date.now()) return false;

	NEXT_CALLS.guild_commands[guild_id] = Date.now() + COMMAND_DELAY;

	return true;
}


function guildDelete(guild_id: string) {
	delete NEXT_CALLS.guild_commands[guild_id];
}

export {
	NEXT_CALLS,

	canCallCommand,
	guildDelete
};