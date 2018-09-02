import Music = require('./music');
import Logs = require('./logs');
import RSSFeed = require('./rssfeed');
import Leveling = require('./leveling');
import Events = require('./events');

export = [
	new Leveling(),
	new Music(),
	new Logs(),
	new RSSFeed(),
	new Events()
];