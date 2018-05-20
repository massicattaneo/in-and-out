export default async function ({ system, wait }) {
    let s = location.pathname.substr(7, 2);
    const lang = ['es'].indexOf(s) !== -1 ? s : 'es';
    this.redirectUrl = location.pathname === '/' ? '/admin/'+lang : location.pathname + location.search;
    system.initStorage({ lang });

    await wait.all([
        system.loadStageFiles('system').start(),
        system.navigateTo(`/admin/${lang}`)
    ]);

}