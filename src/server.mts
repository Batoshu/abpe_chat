import { config } from './config.mjs';
import * as routes from './routes/index.mjs';
import * as http from 'node:http';
import {WebSocketServer, WebSocket} from 'ws';
import {User} from './user.mjs';

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

// All currently connected clients
const clients = new Set<WebSocket>();

function broadcastEvent(event: string, data: any) {
	data.event = event;
	clients.forEach(ws => {
		ws.send(JSON.stringify(data));
	});
}

wsServer.on('connection', (ws, req) => {
	let user : User = null;
	let respond = (token: string, success: boolean, data: string | any) => {
		let obj : any = {
			success: success
		}
		success ? obj.data = data : obj.message = data;
		ws.send(JSON.stringify(data));
	}
	clients.add(ws);

	ws.on('close', () => {
		clients.delete(ws);
		if (user)
			broadcastEvent('user_offline', {user: user});
	});

	ws.on('message', msg => {
		try {
			const {token, action, data} = JSON.parse(msg.toString());
			switch(action) {
				case 'login':
					if (data.nickname?.length < 3)
						return respond(token, false, `Nickname too short`);
					const findByNickname = User.findByNickname(data.nickname);
					if (!findByNickname) {
						user = User.create();
						user.nickname = data.nickname;
						user.sessionToken = crypto.randomUUID();
					} else {
						if (data.sessionToken && findByNickname.sessionToken !== data.sessionToken)
							return respond(token, false, `Nickname taken`);
						else
							user = findByNickname;
					}

					user.latestIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
					user.save();

					respond(token, true, {
						user: user.data,
						sessionToken: data.sessionToken,
					});
					break;
				case 'send_message':
					return respond(token, false, `Not implemented`);
				case 'fetch_messages':
					return respond(token, false, `Not implemented`);
				case 'fetch_user':
					return respond(token, false, `Not implemented`);
				default:
					return respond(token, false, `Unknown action: ${action}`);
			}
		} catch(e) {
			console.error(`Message error`, e);
		}
	});
	ws.on('error', console.error);
});
wsServer.on('error', console.error);

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