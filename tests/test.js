let CommandManager = require('../src/command-manager');

let defaultCommands = require('../src/discord/commands');


let redisGuild = {
	commands: [
		{
			commandName: [ 'ip' ],
			disabled: false,
			params: [
				{
					minPerms: 0,
					id: 0,
					length: 0,
					onCalled: 'ECHO The ip is something.'
				},
				{
					minPerms: 0,
					id: 1,
					minLength: 1,
					maxLength: -1,
					paramReg: '-1',
					onCalled: 'SET ip 0 ECHO %1' // Sets command "ip" id 0 onCalled to arg %1
				}
			]
		}
	]
};


let commandManager = new CommandManager(cb => cb(redisGuild.commands), defaultCommands);

// commandManager.parseMessage('ip google/asdf 23431', (value) => {
// 	console.log(value);
// });

commandManager.parseMessage('create tp https://google.com', (value) => {
	switch(value.type) {
		case 'echo': return console.log('OUT: ' + value.message);
		case 'create':
			console.log('Create: !' + value.commandName + ' = "' + value.message + '"');
			return;
	}
	console.log(value);
});