import fs = require('fs');

import Server = require('../discordserver');
import Base = require('./base');

let migrations: typeof Base[] = [
	require('./001_phrase_seperation')
];

function check(server: Server, cb?: (ok: boolean, updated: boolean) => any) {
	var pos = 0;

	next(true, false);

	function next(ok, updated) {
		if (pos == migrations.length || !ok) return (cb && cb(ok, updated));
		var Clazz = migrations[pos++];

		if (server.migration < Clazz.migration) {
			new Clazz().up(server, ok => next(ok, true));
		} else {
			next(true, false);
		}
	}
}

export = {
	check
};