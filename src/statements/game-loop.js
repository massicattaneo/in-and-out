export default function ({system, gos, thread }) {
    const context = this;
    context.FPS = 50;
    let previous = new Date().getTime();
    let lag = 0;

    function loop(time) {
        context.globalTimestamp = time;
        const current = new Date().getTime();
        const elapsed = current - previous;
        const MS_PER_UPDATE = 1000/context.FPS;
        previous = current;
        lag += elapsed;
        while (lag >= MS_PER_UPDATE) {
            thread.execute('update');
            lag -= MS_PER_UPDATE;
        }
        thread.execute('render');
        context.interpolation = lag / MS_PER_UPDATE;
        requestAnimationFrame(loop);
    }

    setTimeout(loop, 200);
}