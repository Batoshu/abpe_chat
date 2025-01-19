import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import {existsSync} from 'fs';
import * as path from 'node:path';

/**
 * Handles requests to '/styles.css'
 * @param req Request
 * @param res Response
 */
export async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
	const filePath = path.join(process.cwd(), 'public/styles.css');

	if (!existsSync(filePath))
		throw new Error(`${filePath} does not exist`);

	const content = await fs.readFile(filePath, 'utf8');
	res.writeHead(200, { 'Content-Type': 'text/css' });
	res.end(content);
}