const child = require('child_process');
const path = require('path');
const fs = require('fs');


console.log('Watching for file changes...');


const WAIT_TIME = 3000;

var buildTimeout;
var isBuilding = false;
var shouldBuildAgain = false;


fs.watch(path.join(__dirname, '../ts'), { recursive: true  }, (event, filename) => {
	runTimeout(event + ' - ' + filename);
});


function runTimeout(event) {
	if (buildTimeout != null) clearTimeout(buildTimeout);
	buildTimeout = setTimeout(() => runBuild(event), WAIT_TIME);
}


function runBuild(event) {
	if (!isBuilding) {
		console.log('Building..');
		shouldBuildAgain = false;
		isBuilding = true;

		var proc = child.exec(
			'npm run build:full',
			{ cwd: path.join(__dirname, '..') },
			(err, stdout, stderr) => {
				console.log('Build Completed.. Waiting for more changes..');

				isBuilding = false;
				if (shouldBuildAgain) runTimeout();
				else buildTimeout = null;
			}
		);

		proc.stdout.on('data', (data) => console.log(data));
		proc.stderr.on('data', (data) => console.log(data));
	} else {
		shouldBuildAgain = true;
	}
}