/* eslint require-jsdoc: 'off' */
export default function Resources({ device }) {
    const obj = {};
    let fileList = [];
    const resources = {};
    
    obj.addManifest = (json) => {
        const newFiles = json
            .files.map(file => Object.assign(file, { url: json.base + file.url, requested: false }));
        fileList = fileList.concat(newFiles);
    };

    obj.loadByTag = async(tagName, progress) => new Promise((resolve) => {
        const filteredImages = fileList
            .filter(o => !o.requested && o.tags.indexOf(tagName) !== -1 && o.qualities.indexOf(device.quality) !== -1);
        filteredImages.forEach((image) => {
            image.requested = true;
        });
        resolve();
    });

    obj.get = () => {
        return resources;
    };

    return obj;
}
