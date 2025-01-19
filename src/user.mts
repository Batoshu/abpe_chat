import {db} from './database.mjs';

/**
 * Represents user
 */
export class User {
	static #stmt = {
		find: db.prepare(`SELECT * FROM Users WHERE uuid = ?`),
		update: db.prepare(`UPDATE Users SET
				nickname = :nickname,
				session_token = :session_token,
				latest_ip = :latest_ip,
				updated_at = :updated_at
			WHERE uuid = :uuid`),
		insert: db.prepare(`INSERT INTO Users (
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
			    :created_at)`),
		findByNickname: db.prepare(`SELECT * FROM Users WHERE nickname LIKE ?`)
	}

	/**
	 * Finds user by UUID
	 * @param uuid User UUID
	 */
	static find(uuid: string) : User | undefined {
		const results = this.#stmt.find.get(uuid);
		if (!results) return;

		return new User(results);
	}

	/**
	 * Finds user by nickname
	 * @param nickname User nickname
	 */
	static findByNickname(nickname: string) : User | undefined {
		const results = this.#stmt.findByNickname.get(nickname);
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
		this.createdAt = data.created_at ? new Date(data.created_at) : null;
		this.updatedAt = data.updated_at ? new Date(data.updated_at) : null;
	}

	/**
	 * Returns user data with censored IP
	 */
	get data() {
		return {
			uuid: this.uuid,
			nickname: this.nickname,
			ip: this.latestIp.replace(/(\d{1,3}).(\d{1,3}).(\d{1,3}).(\d{1,3})/, "$1.*.*.$4"),
		};
	}

	/**
	 * Save user in database
	 */
	save() {
		if (!this.uuid || !this.nickname || !this.sessionToken || !this.latestIp) return false;
		this.updatedAt = new Date();
		if (!this.createdAt) {
			this.createdAt = new Date();
			User.#stmt.insert.run({
				uuid: this.uuid,
				nickname: this.nickname,
				session_token: this.sessionToken,
				latest_ip: this.latestIp,
				updated_at: this.updatedAt.getTime(),
				created_at: this.createdAt.getTime(),
			});
			return true;
		}

		User.#stmt.update.run({
			uuid: this.uuid,
			nickname: this.nickname,
			session_token: this.sessionToken,
			latest_ip: this.latestIp,
			updated_at: this.updatedAt.getTime(),
		});
		return true;
	}
}