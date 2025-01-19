(async function IIFE() {
    /* UI manager */
    const ui = {
        get body() {return document.body},
        alert(message, type = 'error', persistent = false) {
            const alert = document.createElement('div');
            alert.classList.add('notification-box');
            alert.classList.add(type);
            alert.innerHTML = message;

            ui.body.append(alert);

            let timeout;
            let remove = () => {
                clearTimeout(timeout);
                ui.body.removeChild(alert);
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
            if (this.status === 'online')
                element.style.color = 'green';
            else
                element.style.color = 'red';
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

    window.ui = ui;
})().catch(console.error);