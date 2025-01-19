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
            const list = document.querySelector('#chat-online-list');
            list.innerHTML = '';
            const arr = Array.from(User.users.values()).sort((a, b) => {
                if (a.status !== b.status) return a.status < b.status ? 1 : -1;
                else return a.nickname < b.nickname ? -1 : 1;
            });

            for(const user of arr) {
                list.append(user.element);
                user.render().catch(console.error);
            }
        }
    };

    /* Fetched user */
    class User {
        static users = new Map();

        /**
         * Get user object
         * @param data
         * @returns {User|undefined}
         */
        static get(data) {
            if (!data.uuid || !data.nickname) return; // Most likely not a user object

            if (this.users.has(data.uuid))
                return this.users.get(data.uuid);

            const user = new User(data);

            this.users.set(data.uuid, user);
            ui.refreshUsers();
            return user;
        }

        constructor(data) {
            this.uuid = data.uuid;
            this.nickname = data.nickname;
            this.ip = data.ip;
            this.status = 'offline';
            this.element = document.createElement('li');
        }

        setOffline() {
            this.status = 'offline';
            this.render();
        }

        setOnline() {
            this.status = 'online';
            this.render();
        }

        async render() {
            const element = this.element;
            element.id = `user_${this.uuid}`;
            element.setAttribute('data-uuid', this.uuid);

            element.textContent = this.nickname;
            element.className = this.status === 'online' ? 'user online' :
                this.status === 'offline' ? 'user offline' : 'user unknown';
            return element;
        }
    }

    /* Fetched message */
    class Message {
        static OLDEST_TIMESTAMP = null;

        static messages = new Set();

        static async fetchMessages(limit = 50, before = Message.OLDEST_TIMESTAMP) {
            const results = await client.send('fetch_messages', {before: before?.getTime() || Date.now(), limit: limit});
            if (results.success) {
                results.data.messages.forEach(message => {
                    let m = new Message(message);
                    ui.addMessage(m);
                    m.render().catch(console.error);
                });
            } else {
                ui.alert(results.message, 'error');
            }
        }

        constructor(data) {
            this.uuid = data.uuid;
            this.authorUuid = data.authorUuid;
            this.author = User.get(data.author);
            this.message = data.message;
            this.timestamp = new Date(data.timestamp);

            if (!Message.OLDEST_TIMESTAMP || Message.OLDEST_TIMESTAMP < this.timestamp) {
                Message.OLDEST_TIMESTAMP = this.timestamp;
            }

            this.element = document.createElement('li');
            Message.messages.add(this);
        }

        get time() {
            return this.timestamp.toLocaleString();
        }

        async render() {
            const element = this.element;
            if (!this.author)
                this.author = await User.get(this.authorUuid);

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
                const user = User.get(results.data.user);
                user.setOnline();

                // Save nickname and session token
                localStorage.setItem('nickname', nickname);
                localStorage.setItem('sessionToken', results.data.sessionToken);

                // Load latest messages
                await Message.fetchMessages(50);
            } else {
                ui.alert(results.message, 'error');
            }
        }

        async message(message) {
            let results = await this.send('send_message', {message: message});
            if (results.success) {
                return true;
            } else {
                ui.alert(results.message, 'error');
                return false;
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

        async #handleMessage(message) {
            if (!message.data) return;
            const data = JSON.parse(message.data);

            if (data.event) {
                switch(data.event) {
                    case 'message':
                        let m = new Message(data.message);
                        ui.addMessage(m);
                        m.render().catch(console.error);
                        break;
                    case 'update_online':
                        const online = new Set(data.online);
                        // Iterate over all users
                        User.users.forEach(user => {
                            const entry = data.online.find(u => u.uuid === user.uuid);
                            if (entry) {
                                user.setOnline();
                                online.delete(entry);
                            } else {
                                user.setOffline();
                            }
                        });
                        // Add all new-found users
                        online.forEach(u => {
                           User.get(u).setOnline();
                        });
                        ui.refreshUsers();
                        break;
                }
            } else if (data.token) {
                this.dispatchEvent(new CustomEvent(data.token, {detail: data}));
            }
        }
    }

    const client = new ChatClient();

    document.addEventListener('DOMContentLoaded', async e => {
        ui.setConnectionState('connecting');
        await client.connect();
        if (localStorage.getItem('nickname') !== null && localStorage.getItem('sessionToken') !== null) {
            await client.login(localStorage.getItem('nickname'), localStorage.getItem('sessionToken'));
        }

        // Handle login form
        document.querySelector(`#login-form`).addEventListener('submit', e => {
            e.preventDefault();
            const nickname = document.querySelector('#login-username').value;
            if (!nickname || nickname.length < 3) return ui.alert('Nickname too short', 'error');

            client.login(nickname).catch(console.error);
        });

        // Handle send message form
        document.querySelector(`#send-message-form`).addEventListener('submit', e => {
            e.preventDefault();
            const messageInput = document.querySelector('#chat-message-input')
            const message = messageInput.value.trim();
            if (!message) return;

            client.message(message).catch(console.error).then(success => {
               if (success)
                   messageInput.value = '';
            });
        });
    });
    window.ui = ui;
})().catch(console.error);