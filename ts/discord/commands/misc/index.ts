import Info = require('./info');
import Help = require('./help');
import Uptime = require('./uptime');
import Random = require('./random');

export = [
	new Help(),
	new Info(),
	new Uptime(),
	new Random()
];