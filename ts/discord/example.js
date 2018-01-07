// Storing
//  - Commands
//  - Plugins
//  - Enabled/Disabled Items
//  - temp values EX: last command called, last rss request, etc.

var clientOptions = {
	"plugins": {
		//
	},

	"disabledCommands": [
		"number"
	],

	"values": {
		"lastRSSGrab": 000000
	},
	
	"commands": [
		{
			"commandName": [
				"ip"
			],
			"disabled": false,
			"params": [
				{
					"minPerms": 0,
					"id": 0,
					"length": 0,
					"onCalled": "ECHO play.cosmicpvp.com"
				},
				{
					"minPerms": 0,
					"id": 1,
					"minLength": 1,
					"maxLength": -1,
					"paramReg": "-1",
					"onCalled": "SET ip 0 ECHO %1"
				}
			]
		},
		{
			"commandName": [
				"tp"
			],
			"disabled": false,
			"params": [
				{
					"id": 0,
					"onCalled": "ECHO The Texturepack is google.com",
					"length": 0
				}
			]
		}
	]
}