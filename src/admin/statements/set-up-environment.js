import imageManifest from '../../assets/images/image.manifest.json';
import appsManifest from '../../apps/apps.manifest.json';
import fontManifest from '../../assets/fonts/font.manifest.json';
import ImageLoader from 'gml-image-loader';
import ScriptLoader from 'gml-scripts-loader'
import FontLoader from 'gml-font-loader';

export default async function ({ system }) {

    this.appsManifest = appsManifest;

    system
        .setMaximumDeviceAssetsQuality(1, () => true)
        .addFileManifest(fontManifest)
        .addFileManifest(imageManifest)
        .addFileManifest(appsManifest)
        .addFileLoader(['font'], FontLoader())
        .addFileLoader(['image'], ImageLoader())
        .addFileLoader(['application', 'script'], ScriptLoader())

}
