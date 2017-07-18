import { template } from './template.html';
import { style } from './style.scss';
import View from 'gml-components/View';

export default function (sys) {
    var obj = View(sys, template, style);

    return obj;
}
