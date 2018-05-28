export default async function ({ system, wait }) {

    let s = location.pathname.substr(1, 2);
    const lang = ['es', 'en'].indexOf(s) !== -1 ? s : 'es';
    this.redirectUrl = location.pathname === '/' ? '/'+lang : location.pathname;
    system.initStorage({ lang });

    await wait.all([
        system.loadStageFiles('system').start(),
        system.navigateTo(`/${lang}`, {}, false, true)
    ]);


}