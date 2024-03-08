// This is the code for a function.
const fs = require("fs");

module.exports = function(critical = false) {
    let conf;
	try {
		conf = fs.readFileSync(__dirname + "/config.json");
		conf = JSON.parse(conf);
	} catch (e) {
		console.error(e);
		if (critical) return process.exit(1);
	}
	return conf;
}