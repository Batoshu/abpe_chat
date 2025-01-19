(async function IIFE() {
    /* UI manager */
    const ui = {
        setConnectionState(state) {
            const status = document.querySelector('#chat-connection-status');
            switch(state) {
                case 'connected':
                    status.textContent = 'Connected';
                    status.className = 'text-success';
                    break;
                case 'disconnected':
                    status.textContent = 'Disconnected';
                    status.className = 'text-error';
                    break;
                case 'connecting':
                    status.textContent = 'Connecting...';
                    status.className = 'text-alert';
                    break;
                default:
                    status.textContent = 'Unknown status';
                    status.className = 'text-error';
                    break;
            }
        },
        alert(message, type = 'error', persistent = false) {
            const body = document.body;
            const alert = document.createElement('div');
            alert.classList.add('notification-box');
            alert.classList.add(type);
            alert.innerHTML = message;

            body.append(alert);

            let timeout;
            let remove = () => {
                clearTimeout(timeout);
                body.removeChild(alert);
            }

            alert.onclick = remove;
            if (!persistent)
                timeout = setTimeout(remove, 6000);
        },
        hideLoginOverlay() {
            const overlay = document.querySelector('#login-overlay');
            overlay.classList.add('hidden');
        },
        enableLoginButton() {
            const button = document.querySelector('#login-button');
            button.removeAttribute('disabled');
        },
        addMessage(message) {
            const box = document.querySelector('#chat-window');
            box.insertBefore(message.element, box.firstChild);
        },
        refreshUsers() {
            const users = User.users.values();
            const list = document.querySelector('#chat-online-list');
            list.innerHTML = '';
            users.forEach(user => {
               list.append(user.element);
               user.render().catch(console.error);
            });
        }
    };

    /* Fetched user */
    class User {
        static users = new Map();
        static async get(userUuid) {
            if (this.users.has(userUuid))
                return this.users.get(userUuid);
            return null;
            // TODO: Implement user data fetcher from server when not found in cache
        }

        constructor(data) {
            if (User.users.has(data.uuid)) return;

            this.uuid = data.uuid;
            this.nickname = data.nickname;
            this.ip = data.ip;
            this.status = data.status;

            this.element = document.createElement('li');
            User.users.set(this.uuid, this);
        }

        updateStatus(status) {
            this.status = status;
            this.render().catch(console.error);
        }

        async render() {
            const element = this.element;

            element.textContent = this.nickname;
            return element;
        }
    }

    /* Fetched message */
    class Message {
        static messages = new Set();

        static async fetchMessages(limit = 50, before = undefined) {
            // TODO: Implement message fetcher
        }

        constructor(data) {
            this.uuid = data.uuid;
            this.userUuid = data.userUuid;
            this.author = null;
            this.message = data.message;
            this.timestamp = new Date(data.timestamp);

            this.element = document.createElement('li');
            Message.messages.add(this);
        }

        get time() {
            return this.timestamp.toLocaleString();
        }

        async render() {
            const element = this.element;
            if (!this.author)
                this.author = User.get(this.userUuid);

            element.innerHTML = `<span class="username">
                    ${this.author.nickname ?? 'Unknown Author'} 
                    <span class="datetime">${this.time}</span>
                </span>
                <span class="message">${this.message}</span>`;

            return this.element;
        }
    }

    class ChatClient extends EventTarget {
        #conn = null;

        constructor() {
            super();
        }

        async connect() {
            if (this.#conn) return;
            return this.#reconnect();
        }

        send(action, data, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const token = crypto.randomUUID();
                const message = {
                    token: token,
                    action: action,
                    data: data
                };

                this.#conn.send(JSON.stringify(message));

                let listener = e => {
                    this.removeEventListener(token, listener);
                    return resolve(e.detail)
                };
                this.addEventListener(token, listener);

                setTimeout(() => {
                    this.removeEventListener(token, listener);
                    reject();
                }, timeout);
            });
        }

        async login(nickname, sessionToken) {
            let results = await this.send('login', {nickname: nickname, sessionToken: sessionToken});
            if (results.success) {
                ui.hideLoginOverlay();
                ui.alert(`Logged in as ${nickname}`, 'success');

                if (!await User.get(results.data.user.uuid)) new User(results.data.user);
                ui.refreshUsers();

                // Save nickname and session token
                localStorage.setItem('nickname', nickname);
                localStorage.setItem('sessionToken', results.data.sessionToken);
            } else {
                ui.alert(results.message, 'error');
            }
        }

        #reconnect() {
            return new Promise((resolve, reject) => {
                const url = new URL(window.location.href);
                url.pathname = '/socket';
                url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

                const conn = new WebSocket(url);
                this.#conn = conn;

                conn.addEventListener('open', () => {
                    this.#handleOpen();
                    resolve();
                });

                conn.addEventListener('close', () => {
                    this.#handleClose();
                    reject();
                })

                conn.addEventListener('error', e => {
                    this.#handleError(e);
                    reject();
                });

                conn.addEventListener('message', this.#handleMessage.bind(this));
            });
        }

        #handleOpen() {
            ui.setConnectionState('connected');
            ui.enableLoginButton();
        }

        #handleError(err) {
            console.error(err);
            ui.setConnectionState('disconnected');
        }

        #handleClose() {
            console.error("Connection closed");
            ui.setConnectionState('disconnected');
        }

        #handleMessage(message) {
            console.log(message.data);
            if (!message.data) return;
            const data = JSON.parse(message.data);

            if (!data.token) return;
            this.dispatchEvent(new CustomEvent(data.token, {detail: data}));
        }
    }

    const client = new ChatClient();

    document.addEventListener('DOMContentLoaded', async e => {
        ui.setConnectionState('connecting');
        await client.connect();
        if (localStorage.getItem('nickname') !== null && localStorage.getItem('sessionToken') !== null) {
            await client.login(localStorage.getItem('nickname'), localStorage.getItem('sessionToken'));
        }

        // Handle login button
        document.querySelector(`#login-form`).addEventListener('submit', e => {
            e.preventDefault();
            const nickname = document.querySelector('#login-username').value;
            if (!nickname || nickname.length < 3) return ui.alert('Nickname too short', 'error');

            client.login(nickname).catch(console.error);
        });
    });
    window.ui = ui;
})().catch(console.error);