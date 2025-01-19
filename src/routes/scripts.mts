import * as http from 'node:http';
import * as fs from 'node:fs/promises';

/**
 * Handles requests to '/scripts.js'
 * @param req Request
 * @param res Response
 */
export async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
	res.write("Not implemented");
	res.end();
}