import { config } from './config.mjs';
import * as routes from './routes/index.mjs';
import * as http from 'node:http';
import {WebSocketServer} from 'ws';

/* Http Server */
export const webServer = new http.Server(async (req, res) => {
	const host = req.headers.host || `${config.host}:${config.port}`;
	const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
	const url = new URL(req.url, `http://${host}`);
	/*
	* Web server should only handle few paths:
	* - / - serves html of the application
	* - /scripts.js - client-side scripts
	* - /styles.css - client-side styles
	* - /socket - web socket (handled by upgrade event)
	* Everything else should result in 404 error
	* */
	try {
		switch(url.pathname) {
			case '/':
				await routes.home.handle(req, res);
				break;
			case '/scripts.js':
				await routes.scripts.handle(req, res);
				break;
			case '/styles.css':
				await routes.styles.handle(req, res);
				break;
			default:
				await routes.error404(req, res);
				break;
		}
	} catch(e) {
		console.error(`Connection error (${ip} to ${url})`, e);
		await routes.error500(req, res);
	}
});

/* Web Socket Server */
export const wsServer = new WebSocketServer({
	noServer: true,
});

wsServer.on('error', console.error);

wsServer.on('connection', ws => {
	ws.on('error', console.error);
	ws.on('message', msg => {

	});
});

/* Web Socket upgrade */
webServer.on('upgrade', (req, socket, head) => {
	const {pathname} = new URL(req.url, `ws://${config.host}:${config.port}`);
	if (pathname === '/socket') {
		wsServer.handleUpgrade(req, socket, head, ws => {
			wsServer.emit('connection', ws, req);
		});
	} else {
		socket.destroy();
	}
});