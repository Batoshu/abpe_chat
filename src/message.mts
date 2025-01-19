import {db} from './database.mjs';

/**
 * Represents message
 */
export class Message {
	static #stmt = {
		find: db.prepare(`SELECT * FROM Messages WHERE uuid = ?`),
		update: db.prepare(`UPDATE Messages SET
				author_uuid = :author_uuid,
				message = :message,
				updated_at = :updated_at
			WHERE uuid = :uuid`),
		insert: db.prepare(`INSERT INTO Messages (
	            uuid,
	            author_uuid,
	            message, 
	            updated_at,
	            created_at) 
			VALUES (
			    :uuid,
			    :author_uuid,
			    :message,
			    :updated_at,
			    :created_at)`),
		fetch: db.prepare(`SELECT * FROM Messages WHERE created_at < :before ORDER BY created_at DESC LIMIT :limit`)
	}

	/**
	 * Finds message by UUID
	 * @param uuid User UUID
	 */
	static find(uuid: string) : Message | undefined {
		const results = this.#stmt.find.get(uuid);
		if (!results) return;

		return new Message(results);
	}

	/**
	 * Fetches messages before specified date
	 * @param before Date
	 */
	static fetchBefore(before: Date) : Message[] {
		const results = this.#stmt.fetch.all({before: before.getTime(), limit: 50});
		return results.map(data => new Message(data));
	}

	/**
	 * Creates new message
	 */
	static create() : Message {
		return new Message({uuid: crypto.randomUUID(), createdAt: Date.now()});
	}

	/**
	 * Message's UUID
	 */
	uuid: string;

	/**
	 * Message author's UUID
	 */
	authorUuid: string;

	/**
	 * Message content
	 */
	message: string;

	/**
	 * When message was created
	 */
	createdAt: Date;

	/**
	 * When message was last updated
	 */
	updatedAt: Date;

	/**
	 * Creates new Message instance
	 * @param data Message data
	 */
	constructor(data) {
		this.uuid = data.uuid;
		this.authorUuid = data.author_uuid;
		this.message = data.message;
		this.createdAt = new Date(data.created_at);
		this.updatedAt = new Date(data.updated_at);
	}

	/**
	 * Save message in database
	 */
	save() {
		if (!this.uuid || !this.authorUuid || !this.message) return false;

		this.updatedAt = new Date();
		if (!this.createdAt) {
			this.createdAt = new Date();
			Message.#stmt.insert.run({
				uuid: this.uuid,
				author_uuid: this.authorUuid,
				message: this.message,
				created_at: this.createdAt.getTime(),
				updated_at: this.updatedAt.getTime(),
			});
		}

		Message.#stmt.update.run({
			uuid: this.uuid,
			author_uuid: this.authorUuid,
			message: this.message,
			updated_at: this.updatedAt.getTime()
		});
	}
}