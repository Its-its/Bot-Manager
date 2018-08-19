import sharding = require('./shard');

const argv = require('minimist')(process.argv.slice(2));

sharding.launch(argv.client);