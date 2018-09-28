import sharding = require('./shards');

const argv = require('minimist')(process.argv.slice(2));

sharding.launch(argv.client);