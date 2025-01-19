import {db} from './database.mjs';

/**
 * Represents message
 */
export class Message {
	static #find_stmt = db.prepare(`SELECT * FROM Messages WHERE uuid = ?`);

	static #update_stmt = db.prepare(`UPDATE Messages SET
			author_uuid = :author_uuid,
			message = :message,
			updated_at = :updated_at
		WHERE uuid = :uuid`);

	static #insert_stmt = db.prepare(`INSERT INTO Messages (
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
		    :created_at)`);

	static #fetch_fifty = db.prepare(`SELECT * FROM Messages WHERE created_at < :before ORDER BY created_at DESC LIMIT 50`);

	/**
	 * Finds message by UUID
	 * @param uuid User UUID
	 */
	static find(uuid: string) : Message | undefined {
		const results = this.#find_stmt.get(uuid);
		if (!results) return;

		return new Message(results);
	}

	/**
	 * Fetches 50 messages before specified date
	 * @param before Date
	 */
	static fetchFifty(before: Date) : Message[] {
		const results = this.#fetch_fifty.all(before.getTime());
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
			Message.#insert_stmt.run({
				uuid: this.uuid,
				author_uuid: this.authorUuid,
				message: this.message,
				created_at: this.createdAt.getTime(),
				updated_at: this.updatedAt.getTime(),
			});
		}

		Message.#update_stmt.run({
			uuid: this.uuid,
			author_uuid: this.authorUuid,
			message: this.message,
			updated_at: this.updatedAt.getTime()
		});
	}
}