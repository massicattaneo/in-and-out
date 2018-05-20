import HomePage from '../components/homePage/homePage';

export default async function ({ system, wait, thread }) {
    const context = this;
    const parent = document.getElementById('system');
    const boot = document.getElementById('boot');
    context.main = parent;

    await HomePage({ system, thread, context, parent });

    parent.className += ' fade-in';
    boot.className += ' fade-out';
    await wait.time(200);

    ({ loading: () => system.store.loading })
        .reactive()
        .connect(function ({ loading }) {
            boot.className = boot.className.replace('fade-out', '');
            document.getElementById('boot').style.display = !loading ? 'none' : 'block';
            document.getElementById('system').style.display = loading ? 'none' : 'block';
        });
}