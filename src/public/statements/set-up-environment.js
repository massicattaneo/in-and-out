import imageManifest from '../../assets/images/image.manifest.json';
import fontManifest from '../../assets/fonts/font.manifest.json';
import spriteManifest from '../../assets/sprites/sprite.manifest.json';
import appsManifest from '../../apps/apps.manifest.json';
import ImageLoader from 'gml-image-loader';
import FontLoader from 'gml-font-loader';
import PhaserSpriteLoader from 'gml-phaser-json-sprite-loader';
import XmlSpriteLoader from 'gml-xml-sprite-loader';
import ScriptLoader from 'gml-scripts-loader'

export default async function ({ system, wait }) {

    this.appsManifest = appsManifest;

    system
        .setMaximumDeviceAssetsQuality(1, () => true)
        .addFileManifest(imageManifest)
        .addFileManifest(fontManifest)
        .addFileManifest(spriteManifest)
        .addFileManifest(appsManifest)
        .addFileManifest([
            {stage: 'system', type: 'script', url: 'https://js.stripe.com/v3/'},
            {stage: 'faceModelingScript', type: 'script', url: '/assets/vendor/clmtrackr.js'}
        ])
        .addFileLoader(['image'], ImageLoader())
        .addFileLoader(['font'], FontLoader())
        .addFileLoader(['application', 'script'], ScriptLoader())
        .addFileLoader(['phaser-sprite'], PhaserSpriteLoader())
        .addFileLoader(['xml-sprite'], XmlSpriteLoader());

}
