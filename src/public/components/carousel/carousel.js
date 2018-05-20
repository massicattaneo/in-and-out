import {Node, HtmlStyle, HtmlView} from 'gml-html';
import * as styles from './carousel.scss';
import template from './carousel.html';

let reference = 0;
export default async function ({ system, context, parent, config }) {
    const obj = {};
    const view = HtmlView(template, styles);
    const { imagesManifest } = config;
    const store = ({ images: null }).reactive();

    ({
        deviceType: () => system.deviceInfo().deviceType,
        height: () => system.deviceInfo().height,
        orientation: () => system.deviceInfo().orientation,
        images: () => store.images,
    })
        .reactive()
        .connect(function ({ orientation, deviceType, height, images }) {
            view.style(`${deviceType}_${orientation}`, {wrapper: {height: height - 280}});
            if (images) {
                view.get('pagevisible').appendChild(images[0])
            }
        });

    parent.appendChild(view.get());
    
    let stage = `carousel-${reference++}`;
    const res = await system
        .addFileManifest(imagesManifest, {stage})
        .loadStageFiles(stage)
        .start();
    store.images = res[0].map(i => i.data);

    return obj;

}