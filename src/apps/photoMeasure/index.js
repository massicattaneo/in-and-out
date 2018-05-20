import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';
import createAnAccountTemplate from '../../common/createAnAccount.html';


function takeSnapshot(image, video, photoWidth) {
    const canvas = document.createElement('canvas'),
        width = video.videoWidth,
        height = video.videoHeight,
        context = canvas.getContext('2d');
    canvas.width = width * photoWidth;
    canvas.height = height;
    const srcX = (1 - photoWidth) / 2;
    context.drawImage(video, width * srcX, 0, width * photoWidth, height, 0, 0, width * photoWidth, height);
    const imageDataURL = canvas.toDataURL('image/png');
    image.setAttribute('src', imageDataURL);
}

function photoMeasure({ system }) {
    return async function({ parent }) {
        let obj = {};
        let stream;
        const locale = await system.locale(`/localization/photoMeasure/es.json`);
        await locale.load(`/localization/common/es.json`);
        const view = HtmlView(template, styles, locale.get());
        const videoEl = view.get('video');
        const form = view.get('wrapper');
        const moveEvent = system.deviceInfo().deviceType === 'desktop' ? 'mousemove' : 'touchmove';
        const endEvent = system.deviceInfo().deviceType === 'desktop' ? 'mouseup' : 'touchend';
        const startEvent = system.deviceInfo().deviceType === 'desktop' ? 'mousedown' : 'touchstart';
        const listeners = [];

        const state = ({
            hor: 100,
            ver: 0,
            offsetHor: 30,
            offsetVer: 30,
            photoWidth: 1,
            takingPhoto: true,
            camera: 'user' //user | environment
        }).reactive();

        const disconnect = ({
            deviceType: () => system.deviceInfo().deviceType,
            orientation: () => system.deviceInfo().orientation,
            hor: () => state.hor,
            ver: () => state.ver,
            offsetHor: () => state.offsetHor,
            offsetVer: () => state.offsetVer,
            photoWidth: () => state.photoWidth,
            camera: () => state.camera,
            takingPhoto: () => state.takingPhoto
        })
            .reactive()
            .connect(function ({ orientation, deviceType, hor, ver, offsetHor, offsetVer, takingPhoto, photoWidth, camera }) {
                view.style(orientation, {
                    imagecontainer: { display: !takingPhoto ? 'block' : 'none' },
                    videocontainer: { display: takingPhoto ? 'block' : 'none' },
                    boxcontainer: { width: `${photoWidth * 100}%`, marginLeft: `${(1 - photoWidth) * 50}%` },
                    back: { display: !takingPhoto ? 'block' : 'none' },
                    snap: { display: takingPhoto ? 'block' : 'none' },
                    camera: { display: (!takingPhoto || deviceType === 'desktop') ? 'none' : 'block' },
                    horline1: { top: hor - offsetHor },
                    horline2: { top: hor },
                    horline3: { top: hor + offsetHor },
                    verline1: { left: ver - offsetVer },
                    verline2: { left: ver },
                    verline3: { left: ver + offsetVer }
                });
                if (camera !== 'environment') {
                    view.get('video').style.transform = 'rotateY(180deg)';
                    view.get('image').style.transform = 'rotateY(180deg)';
                }
            });

        obj.destroy = function () {
            stream && stream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            listeners.forEach(Function.identity);
            disconnect();
        };

        parent.appendChild(view.get());

        async function start() {
            if (system.store.logged) {
                stream = await runStream(system, videoEl, state.camera);
                setTimeout(function () {
                    const width = window.getComputedStyle(videoEl).width.replace('px', '');
                    const height = window.getComputedStyle(videoEl).height.replace('px', '');
                    state.photoWidth = height > 200 ? 1 : 0.5;
                    state.ver = (parseInt(width, 10) / 2) - 15;
                }, 500);


                form.takePhoto = function () {
                    takeSnapshot(view.get('image'), videoEl, state.photoWidth);
                    state.takingPhoto = false;
                    videoEl.src = '';
                    stream.getVideoTracks().forEach(function(track) {
                        track.stop();
                    });
                };

                form.back = async function() {
                    stream = await runStream(system, videoEl, state.camera);
                    state.takingPhoto = true;
                };

                form.cameraToggle = async function() {
                    state.camera = state.camera === 'user' ? 'environment' : 'user';
                    stream.getVideoTracks().forEach(function(track) {
                        track.stop();
                    });
                    stream = await runStream(system, videoEl, state.camera);
                };

                function listener(selector, storeName, onMove, e) {
                    const start = state[storeName];
                    const direction = selector.indexOf('hor') !== -1 ? 'clientY' : 'clientX';
                    const mouseStart = system.deviceInfo().deviceType === 'desktop'
                        ? e[direction]
                        : e.touches[0][direction];

                    function move(e) {
                        e.preventDefault();
                        const newPosition = system.deviceInfo().deviceType === 'desktop'
                            ? e[direction]
                            : e.touches[0][direction];
                        onMove(start, mouseStart - newPosition);
                    }

                    view.get(selector).addEventListener(moveEvent, move);
                    view.get(selector).addEventListener(endEvent, function() {
                        view.get(selector).removeEventListener(moveEvent, move);
                    });

                }

                function addListener(target, stateProp, onMove) {
                    const partial = listener.partial(target, stateProp, onMove);
                    view.get(target).addEventListener(startEvent, partial);
                    return () => view.get(target).removeEventListener(startEvent, partial);
                }

                listeners.push(addListener('horline1', 'offsetHor', (start, offset) => state.offsetHor = start + offset));
                listeners.push(addListener('horline2', 'hor', (start, offset) => state.hor = start - offset));
                listeners.push(addListener('horline3', 'offsetHor', (start, offset) => state.offsetHor = start - offset));
                listeners.push(addListener('verline1', 'offsetVer', (start, offset) => state.offsetVer = start + offset));
                listeners.push(addListener('verline2', 'ver', (start, offset) => state.ver = start - offset));
                listeners.push(addListener('verline3', 'offsetVer', (start, offset) => state.offsetVer = start - offset));
            }
            else {
                form.innerHTML = '';
                form.appendChild(HtmlView(createAnAccountTemplate, [], locale.get()).get());
            }
        }

        function runStream(system, video, camera) {
            return new Promise(function(res, reject) {
                const videoConfig = {
                    width: { exact: 1280 },
                    height: { exact: 720 }
                };
                if (system.deviceInfo().deviceType !== 'desktop') {
                    videoConfig.facingMode = { exact: camera };
                }
                navigator.getUserMedia({
                        audio: false,
                        video: videoConfig
                    },
                    function(stream) {
                        video.srcObject = stream;
                        res(stream);
                    },
                    function(err) {
                        system.navigateTo(locale.get('urls.home'));
                        system.throw('camera-forbidden');
                    }
                );
            });
        }

        ({ logged: () => system.store.logged }).reactive().connect(function({ logged }) {
            setTimeout(start, 0);
        });

        return obj;
    };
}

plugin(photoMeasure);