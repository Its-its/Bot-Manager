const child = require('child_process');
const path = require('path');
const fs = require('fs');

const WAIT_TIME = 3000;

var buildTimeout;
var isBuilding = false;
var shouldBuildAgain = false;


runBuild();

fs.watch(path.join(__dirname, '../ts'), { recursive: true  }, (event, filename) => {
	runTimeout(event + ' - ' + filename);
});


function runTimeout(event) {
	if (isBuilding) return;

	if (buildTimeout != null) clearTimeout(buildTimeout);
	buildTimeout = setTimeout(() => runBuild(event), WAIT_TIME);
}


function runBuild(event) {
	if (!isBuilding) {
		console.log('Building..');
		shouldBuildAgain = false;
		isBuilding = true;

		let proc_1 = child.exec(
			'tsc -p tsconfig.json',
			{ cwd: path.join(__dirname, '..') },
			(err, stdout, stderr) => {
				console.log('--- TYPESCRIPT FINISHED COMPILING ---');

				let proc_2 = child.exec(
					'node node_modules/@ef-carbon/tspm/dist/bin/tspm',
					{ cwd: path.join(__dirname, '..') },
					(err, stdout, stderr) => {
						console.log('Build Completed.. Waiting for more changes..');

						isBuilding = false;
						if (shouldBuildAgain) runTimeout();
						else buildTimeout = null;
					}
				);

				proc_2.stdout.on('data', (data) => console.log(data));
				proc_2.stderr.on('data', (data) => console.log(data));
			}
		);

		proc_1.stdout.on('data', (data) => console.log(data));
		proc_1.stderr.on('data', (data) => console.log(data));
	} else {
		shouldBuildAgain = true;
	}
}