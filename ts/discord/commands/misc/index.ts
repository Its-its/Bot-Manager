import Info = require('./info');
import RandomColor = require('./randomcolor');
import RandomNumber = require('./randomnumber');
import Help = require('./help');
import Uptime = require('./uptime');

export = [
	new Help(),
	new Info(),
	new Uptime(),
	new RandomColor(),
	new RandomNumber()
];