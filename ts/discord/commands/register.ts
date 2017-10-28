// When bot joins a server it needs to be registered by the person who invited it.

import Command = require('../command');

class Register extends Command {
	constructor() {
		super('register', false, false);
	}
}

export = Register;