export default function ({ useCases, events = [], errors = [], gos, system, config }) {
    const obj = {};
    let state = '';
    const onError = (e) => {
        alert(e.type);
    };

    events.forEach(function (e) {
        gos[e.go].on(e.event, async() => {
            // try {
                await e.exe.call(obj, system, gos, config);
            // } catch (error) {
            //     onError(error);
            // }
            return true;
        });
    });

    obj.enter = async(ucName) => {
        state = ucName;
        // try {
            await useCases[ucName].call(obj, system, gos, config);
        // } catch (error) {
        //     onError(error);
        // }

        return true;
    };

    let id;
    function animate(time) {
        Object.keys(gos).forEach((k) => {
            gos[k].update && gos[k].update(time);
        });
        system.screen.render();
        id = requestAnimationFrame(animate);
    }

    obj.startAnimating = () => {
        animate(performance.now());
    };

    obj.stopAnimating = () => {
        cancelAnimationFrame(id);
    };

    obj.getState = function () {
        return state;
    };




    return obj;
}
