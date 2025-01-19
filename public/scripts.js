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


    window.ui = ui;
})().catch(console.error);