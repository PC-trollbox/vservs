// This is the code for a function.

function matchGlob(str, pattern) {
    const regex = pattern
      .split('*')
      .map(s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
  
    return new RegExp(`^${regex}$`).test(str);
}

module.exports = function (header, hosts) {
	if (hosts[header]) return hosts[header];
	if (hosts[header.split(":")[0]]) return hosts[header.split(":")[0]];
	for (let host in hosts) {
        if (matchGlob(header, host)) return hosts[host];
        if (matchGlob(header.split(":")[0], host)) return hosts[host];
	}
	if (hosts["*"]) return hosts["*"];
	return undefined;
}  