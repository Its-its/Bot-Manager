import fs = require('fs');

import Server = require('../discordserver');
import Base = require('./base');

let migrations: typeof Base[] = [
	require('./001_phrase_seperation')
];

function check(server: Server, cb?: (ok: boolean) => any) {
	var pos = 0;

	next(true);

	function next(ok) {
		if (pos == migrations.length || !ok) return (cb && cb(ok));
		var Clazz = migrations[pos++];

		if (server.migration < Clazz.migration) {
			new Clazz().up(server, ok => next(ok));
		} else {
			next(true);
		}
	}
}

export = {
	check
};