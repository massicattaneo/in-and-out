function createHTMLNode(markup) {
    var div = document.createElement('div');
    div.innerHTML = markup;
    return div.children[0];
}

export default function Renderer({id = 'gml-canvas'} = {}) {
    var obj = {};
    const view = createHTMLNode('<canvas id="'+id+'" />');
    const views = [];

    view.style.position = 'absolute';
    view.style.display = 'block';
    document.body.appendChild(view);
    
    obj.resize = function({ renderWidth, renderHeight , windowWidth, windowHeight }) {
        view.style.width = windowWidth + 'px';
        view.style.height = windowHeight + 'px';
        view.width = renderWidth;
        view.height = renderHeight;
    };
    
    obj.render = function (view) {
        if (view) {
            view.render();
            return;
        }
        console.log(views)
        views.forEach(view => view.render())
    };
    
    obj.getContext = function () {
        return view.getContext('2d');    
    };
    
    obj.append = function (child) {
        views.push(child);    
    };
    
    return obj;
}

Renderer.PIVOT_CENTER = function () {
    return function (width, height) {
        return [width / 2, height / 2];
    }
};