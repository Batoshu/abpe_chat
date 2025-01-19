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

    window.ui = ui;
})().catch(console.error);