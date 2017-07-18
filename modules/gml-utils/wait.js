function Wait() {
    const obj = {};

    obj.time = async (time) => {
        return new Promise((resolve) => {
            setTimeout(resolve, time);
        });
    };

    obj.event = async (component, eventName) => {
        return new Promise((resolve) => {
            const remove = component.on(eventName, (a) => {
                remove();
                resolve(a);
            })
        });
    };

    obj.all = async (...array) => {
        return Promise.all(array);
    };

    obj.some = async (...array) => {
        return new Promise((resolve) => {
            array.forEach(p => p.then(resolve));
        });
    };

    obj.qaa = async (breakPoint) => {
        return Promise.resolve(breakPoint);
    };

    return obj;
}

export default Wait();
