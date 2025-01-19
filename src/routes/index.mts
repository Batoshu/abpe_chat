import * as http from 'node:http';

export * as home from './home.mjs';
export * as scripts from './scripts.mjs';
export * as styles from './styles.mjs';

/* Error handler */
export function error(error: number) {
	return async (req: http.IncomingMessage, res: http.ServerResponse) => {
		res.statusCode = error;
		res.setHeader('Content-Type', 'text/plain');
		res.write(`Error ${error}: ${res.statusMessage}`);
		res.end();
	};
}

export const error404 = error(404);
export const error500 = error(500);