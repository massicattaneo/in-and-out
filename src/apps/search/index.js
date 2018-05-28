import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
// import suggestionsTpl from './suggestions.html';
import Icon from '../../public/components/icon/icon';
import resultsTpl from './results.html';
import * as styles from './index.scss';

function search({ system }) {
    return async function ({ parent, context }) {
        let obj = {};
        const locale = await system.locale(`/localization/static.json`);
        await locale.load(`/localization/search/es.json`);
        const view = HtmlView(template, styles, Object.assign({ searchString: system.store.search }, locale.get()));
        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        // view.get().suggest = async function () {
        //     view.clear('suggestions');
        //     const value = view.get('searchfield').value;
        //     if (value.length > 0) {
        //         const req = RetryRequest(`/api/search/suggestion?q=${value}`, { headers: { 'Content-Type': 'application/json' } });
        //         const res = await req.get();
        //         const suggestions = JSON.parse(res.responseText);
        //         if (suggestions.length) {
        //             view.appendTo('suggestions', suggestionsTpl, [], { suggestions });
        //         }
        //     }
        // };

        view.get().suggest = async function (e) {
            system.store.search = view.get('searchfield').value;
            if (system.store.search === '')
                view.clear('results');
        };

        const disconnectSearch = window.rx.connect
            .partial({ search: () => system.store.search })
            .filter(p => p.search.length > 2)
            .subscribe(async function ({ search } ={}) {
                view.clear('results');
                const req = RetryRequest(`/api/search/result?q=${search}`, { headers: { 'Content-Type': 'application/json' } });
                const res = await req.get();
                const results = JSON.parse(res.responseText);
                if (results.length) {
                    view.appendTo('results', resultsTpl, [], {
                        results: results.map(i => {
                            Icon({
                                system,
                                context,
                                parent: view.clear('temp').get('temp'),
                                config: { name: i.type },
                                autoDisconnect: true
                            });
                            return Object.assign({
                                icon: view.get('temp').innerHTML
                            }, i);
                        })
                    });
                }
                view.clear('temp');
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            disconnectSearch();
            disconnect();
        };

        obj.navigateTo = function (a = '') {
            system.store.search = a.replace('/feed/', '').split('-').join(' ');
            view.get('searchfield').value = system.store.search;
        };

        return obj;
    };
}

plugin(search);