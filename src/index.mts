import {config} from './config.mjs';
import {webServer, wsServer} from './server.mjs';

// Start web server
webServer.listen(config.port, config.host, () => {
	const addr = webServer.address() as {address: string, port: number, family: string};
	console.log(`Listening on ${addr.address}:${addr.port}`);
});