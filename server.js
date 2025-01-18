const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const FindHostMatch = require("./FindHostMatch");
const loadConf = require("./loadConf");
const serv = http.createServer(handler);
const vservReportMsg = "\n\n---- Suggestion ----\nPlease report this to the %s.\n (or if you are the %s, please %s)";
const servadmin = "website administrator";
const manuf = "software manufacturer";
let conf = loadConf(true);
let plugin_preload = {};
let plugin_ns = {};

const https_serv = https.createServer({
	key: conf.keyPath ? fs.readFileSync(conf.keyPath) : null,
	cert: conf.certPath ? fs.readFileSync(conf.certPath) : null
}, handler);

serv.on("upgrade", upgradeHandler);
https_serv.on("upgrade", upgradeHandler);

async function handler(req, res) {
	if (req.headers["x-loop-prevent"] == "vservs") return res.writeHeader(502).end("vservs found a loop in the server configuration." + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "check the proxying configuration"));
	let conf = loadConf();
	if (!req.headers) return res.writeHeader(400).end("The request does not contain any headers." + vservReportMsg.replace("%s", manuf).replace("%s", manuf).replace("%s", "check if your software creates HTTP headers"));
	if (!conf.servers) return res.writeHeader(500).end("No servers configured on the vservs server you're attempting to access." + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "create a proxying configuration"));
	if (!req.headers.host) return res.writeHeader(400).end("The request does not have a Host header." + vservReportMsg.replace("%s", manuf).replace("%s", manuf).replace("%s", "check if your software transfers the Host header"));
	let reqId = crypto.randomBytes(16).toString("hex");
	let ath = { "X-Request-Id": reqId }; // Append to Headers; specifically about the request ID
	let host = FindHostMatch(req.headers.host, conf.servers);
	if (!host) for (let plugin in plugin_ns.hostmatch) {
		try {
			host = await plugin_ns.hostmatch[plugin].runHostMatch(req.headers.host, req);
		} catch (e) {
			console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
			return res.writeHeader(500, ath).end("Failed to run plugin named " + plugin + "\nRequest ID: " + reqId + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "check the proxying configuration and troubleshoot the server; problem in the response part"));	
		}
		if (host) break;
	}
	if (!host) return res.writeHeader(404).end("The specified hostname was not defined." + vservReportMsg.replace("%s", manuf).replace("%s", manuf).replace("%s", "check if your software transfers the Host header correctly"));
	let modifiedHeaders = req.headers;
	modifiedHeaders = { ...modifiedHeaders, ...conf.appendRequestHeaders, ...conf.appendBidirectionalHeaders };
	modifiedHeaders["X-Loop-Prevent"] = "vservs";
	modifiedHeaders[conf.realIP || "X-Real-IP"] = req.socket.remoteAddress;
	modifiedHeaders["X-Forwarded-Proto"] = (req.socket.encrypted ? "https" : "http");
	try {
		let clientReq = (host.startsWith("http:") ? http : https).request(host + (host.endsWith("/") ? "" : "/") + req.url.replace("/", ""), {
			headers: modifiedHeaders,
			method: req.method
		}, function(clientRes) {
			res.writeHead(clientRes.statusCode, { ...clientRes.headers, ...conf.appendResponseHeaders, ...conf.appendBidirectionalHeaders });
			clientRes.pipe(res);
			clientRes.on("error", function(e) {
				res.end("Failed to contact the server configured to answer this request.\nRequest ID: " + reqId + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "check the proxying configuration and troubleshoot the server; problem in the response part"));
				console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
				clientReq.destroy();
				clientRes.destroy();
			});
		});
		req.pipe(clientReq);
		clientReq.on("error", function(e) {
			res.writeHeader(502, ath).end("Failed to contact the server configured to answer this request.\nRequest ID: " + reqId + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "check the proxying configuration and troubleshoot the server; problem in the request part"));
			console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
			clientReq.destroy();
		});
	} catch (e) {
		res.writeHeader(502, ath).end("Failed to contact the server configured to answer this request.\nRequest ID: " + reqId + vservReportMsg.replace("%s", servadmin).replace("%s", servadmin).replace("%s", "check the proxying configuration; the URL must be incorrect"));
		console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
	}
	req.on("error", console.error);
	res.on("error", console.error);
}

async function upgradeHandler(req, socket, head) {
	if (req.headers["x-loop-prevent"] == "vservs") return socket.end("vservs:loopDetectedError");
	let conf = loadConf();
	if (!req.headers) return socket.end("vservs:noHeadersError");
	if (!conf.servers) return socket.end("vservs:noServersDefinedError");
	if (!req.headers.host) return socket.end("vservs:noHostHeaderError");
	let reqId = crypto.randomBytes(16).toString("hex");
	let host = FindHostMatch(req.headers.host, conf.servers);
	if (!host) for (let plugin in plugin_ns.hostmatch) {
		try {
			host = await plugin_ns.hostmatch[plugin].runHostMatch(req.headers.host, req);
		} catch (e) {
			console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
			return socket.end("vservs:pluginError:" + plugin + ":" + reqId);	
		}
		if (host) break;
	}
	if (!host) return socket.end("vservs:noServerDefinedError");
	let modifiedHeaders = req.headers;
	modifiedHeaders = { ...modifiedHeaders, ...conf.appendRequestHeaders, ...conf.appendBidirectionalHeaders };
	modifiedHeaders["X-Loop-Prevent"] = "vservs";
	modifiedHeaders[conf.realIP || "X-Real-IP"] = req.socket.remoteAddress;
	modifiedHeaders["X-Forwarded-Proto"] = (req.socket.encrypted ? "https" : "http");
	try {
		let clientReq = (host.startsWith("http:") ? http : https).request(host + (host.endsWith("/") ? "" : "/") + req.url.replace("/", ""), {
			headers: modifiedHeaders,
			method: req.method
		});
		clientReq.on("upgrade", function(clientRes, serverSocket, serverHead) {
			let allSentHeaders = { ...clientRes.headers, ...conf.appendResponseHeaders, ...conf.appendBidirectionalHeaders };
			socket.write("HTTP/" + clientRes.httpVersion + " " + clientRes.statusCode + " " + clientRes.statusMessage + "\r\n" +
				Object.keys(allSentHeaders).map(function(key) {
					return key + ": " + allSentHeaders[key];
				}).join("\r\n") + "\r\n\r\n");
			serverSocket.write(head);
			serverSocket.pipe(socket);
			socket.write(serverHead);
			socket.pipe(serverSocket);
		});
		req.pipe(clientReq);
		clientReq.on("error", function(e) {
			socket.end("vservs:connectionError:" + reqId);
			console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
			clientReq.destroy();
		});
	} catch (e) {
		console.error("[", new Date(), "]", req.socket.remoteAddress, reqId, e);
		socket.end("vservs:connectionError:" + reqId);
	}
	req.on("error", console.error);
	socket.on("error", console.error);
}
serv.on("error", console.error);
serv.on("clientError", console.error);
https_serv.on("error", console.error);
https_serv.on("clientError", console.error);
https_serv.on("tlsClientError", console.error);

const listenerLog = (secure) => () => console.log("[", new Date(), "]", "Listening for HTTP" + (secure ? "S" : "") + " started", (secure ? https_serv : serv).address());

if (conf.listenPort) serv.listen(conf.listenPort, listenerLog(false));
if (conf.listenPortSecure) https_serv.listen(conf.listenPortSecure, listenerLog(true));
if (!conf.listenPort && !conf.listenPortSecure) {
	console.error("[", new Date(), "]", "Listening for requests wasn't started, because no ports were provided.");
	process.exit(1);
}

for (let plugin of (conf.plugins || [])) {
	try {
		let plug = require(plugin);
		plugin_preload[plug.name] = plug;
		for (let feature of plug.features) plugin_ns[feature] = {...plugin_ns[feature], [plug.name]: plug};
	} catch (e) {
		console.error("[", new Date(), "]", "Failed to load plugin", plugin, e);
	}

}
