export default async function ({ system, thread }) {

    window.addEventListener('keydown', function(event) {
        system.store.keysPressed.push(event.key);
    });

    window.addEventListener('keyup', function(event) {
        while (system.store.keysPressed.indexOf(event.key) !== -1) {
            system.store.keysPressed.splice(system.store.keysPressed.indexOf(event.key), 1);
        }
    });
}