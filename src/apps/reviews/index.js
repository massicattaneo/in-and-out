import {plugin} from 'gml-system';
import {HtmlView} from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import reviewTemplate from './review.html';

function reviews({ system }) {
    return async function ({ parent, thread }) {
        let obj = {};
        const locale = await system.locale(`/localization/reviews/es.json`);
        const view = HtmlView(template, styles, locale.get());

        const addReviewEl = view.get('addreview');

        view.appendTo('staraverage', `<span>${system.store.reviewsAverage.toFixed(1)}</span>`);

        function getStarTemplate(rate) {
            return new Array(Number(rate)).fill(0)
                .map(() => '<span class="fa fa-star green-color"></span>').join('');
        }

        function checkForm() {
            if (addReviewEl['rating'].value === '') {
                system.throw('missing-star-rating');
                return false;
            }
            if (addReviewEl['description'].value === '') {
                system.throw('missing-review');
                return false;
            }
            return true;
        }

        addReviewEl.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (checkForm()) {
                const item = await thread.execute('reviews/add', {
                    rate: Number(addReviewEl['rating'].value),
                    description: addReviewEl['description'].value,
                    lang: system.info().lang
                });
                view.appendFirst('reviews', reviewTemplate, [], { item, stars: getStarTemplate(item.rate) });
                system.store.reviews.push('');
                const ele = addReviewEl['rating'];
                for (let i = 0; i < ele.length; i++) ele[i].checked = false;
                addReviewEl['description'].value = '';
            }
        });

        const disconnect = ({
            orientation: () => system.deviceInfo().orientation,
            logged: () => system.store.logged
        })
            .reactive()
            .connect(function ({ orientation, logged }) {
                view.style(orientation, { add: { display: logged ? 'block' : 'none' } });
            });

        parent.appendChild(view.get());

        obj.destroy = function () {
            system.setStorage({ reviews: system.store.reviews });
            system.store.notifications = Math.random();
            disconnect()
        };

        let loadCounter = 0;
        obj.loadContent = async function () {
            if (loadCounter >= 0) {
                const list = await thread.execute('reviews/get', {counter: loadCounter});
                loadCounter = (list.length) ? loadCounter + 1 : -1;
                list.forEach(function (item) {
                    view.appendTo('reviews', reviewTemplate, [], { item, stars: getStarTemplate(item.rate) });
                });
            } else {
                view.get('loading').style.display = 'none';
                await new Promise(res => setTimeout(res, 0));
            }
        };

        parent.appendChild(view.get());
        return obj;
    }
}

plugin(reviews);