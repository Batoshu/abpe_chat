import {db} from './database.mjs';

/**
 * Represents user
 */
export class User {
	static #find_stmt = db.prepare(`SELECT * FROM Users WHERE uuid = ?`);

	static #update_stmt = db.prepare(`UPDATE Users SET
			nickname = :nickname,
			session_token = :session_token,
			latest_ip = :latest_ip,
			updated_at = :updated_at
		WHERE uuid = :uuid`);

	static #insert_stmt = db.prepare(`INSERT INTO Users (
            uuid, 
            nickname, 
            session_token, 
            latest_ip, 
            updated_at,
            created_at) 
		VALUES (
		    :uuid,
		    :nickname,
		    :session_token,
		    :latest_ip,
		    :updated_at,
		    :created_at)`);

	static #find_by_nickname_stmt = db.prepare(`SELECT * FROM Users WHERE nickname LIKE ?`);

	/**
	 * Finds user by UUID
	 * @param uuid User UUID
	 */
	static find(uuid: string) : User | undefined {
		const results = this.#find_stmt.get(uuid);
		if (!results) return;

		return new User(results);
	}

	/**
	 * Finds user by nickname
	 * @param nickname User nickname
	 */
	static findByNickname(nickname: string) : User | undefined {
		const results = this.#find_by_nickname_stmt.get(nickname);
		if (!results) return;

		return new User(results);
	}

	/**
	 * Creates new user
	 */
	static create() : User {
		return new User({uuid: crypto.randomUUID()});
	}

	/**
	 * User's UUID
	 */
	uuid: string;

	/**
	 * User's nickname
	 */
	nickname: string;

	/**
	 * User's session token
	 */
	sessionToken: string;

	/**
	 * User's latest IP
	 */
	latestIp: string;

	/**
	 * When user was created
	 */
	createdAt: Date;

	/**
	 * When user's data was lastly updated
	 */
	updatedAt: Date;

	/**
	 * Creates new User instance
	 * @param data User data
	 */
	constructor(data) {
		this.uuid = data.uuid;
		this.nickname = data.nickname;
		this.sessionToken = data.session_token;
		this.latestIp = data.latest_ip;
		this.createdAt = new Date(data.created_at);
		this.updatedAt = new Date(data.updated_at);
	}

	/**
	 * Returns JSON user string with censored IP
	 */
	get json() {
		return JSON.stringify({
			uuid: this.uuid,
			nickname: this.nickname,
			ip: this.latestIp.replace(/(\d{1,3}).(\d{1,3}).(\d{1,3}).(\d{1,3})/, "$1.*.*.$4"),
		});
	}

	/**
	 * Save user in database
	 */
	save() {
		if (!this.uuid || !this.nickname || !this.sessionToken || !this.latestIp) return false;
		this.updatedAt = new Date();
		if (!this.createdAt) {
			this.createdAt = new Date();
			User.#insert_stmt.run({
				uuid: this.uuid,
				nickname: this.nickname,
				session_token: this.sessionToken,
				latest_ip: this.latestIp,
				updated_at: this.updatedAt.getTime(),
				created_at: this.createdAt.getTime(),
			});
			return true;
		}

		User.#update_stmt.run({
			uuid: this.uuid,
			nickname: this.nickname,
			session_token: this.sessionToken,
			latest_ip: this.latestIp,
			updated_at: this.updatedAt.getTime(),
		});
		return true;
	}
}