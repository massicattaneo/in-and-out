import { plugin } from 'gml-system';
import { Node, HtmlStyle, HtmlView } from 'gml-html';
import template from './index.html';
import * as styles from './index.scss';

function eyebrowsStudy({ system }) {
    return async function ({ parent }) {
        const obj = {};
        let stream;
        const locale = await system.locale(`/localization/static.json`);
        await system.loadStageFiles('faceModelingScript').start();
        const view = HtmlView(template, styles, locale.get());


        const disconnect =
            window.rx.connect({ orientation: () => system.deviceInfo().orientation }, function ({ orientation }) {
                view.style(orientation);
            });

        parent.appendChild(view.get());

        const videoInput = document.getElementById('inputVideo');
        const canvasInput = document.getElementById('drawCanvas');


        navigator.mediaDevices.enumerateDevices().then(function (devices) {
            const videoDev = devices.find(d => d.kind === 'videoinput');
            if (videoDev) {
                videoDev.getCapabilities();
                const width = videoDev.getCapabilities().width.max;
                const height = videoDev.getCapabilities().height.max;
                const ratio = width / height;
                const windowWidth = getComputedStyle(view.get()).width.replace('px', '');
                videoInput.width = windowWidth;
                videoInput.height = windowWidth / ratio;
                canvasInput.width = windowWidth;
                canvasInput.height = windowWidth / ratio;
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: width },
                        height: { ideal: height }
                    }
                }).then(gumSuccess).catch(console.log);
            }
        });




        function gumSuccess(videoStream) {

            const ctracker = new clm.tracker();
            ctracker.init();
            ctracker.start(videoInput);

            const cc = canvasInput.getContext('2d');

            function drawLoop() {
                requestAnimationFrame(drawLoop);
                cc.clearRect(0, 0, canvasInput.width, canvasInput.height);
                ctracker.draw(canvasInput);
            }

            drawLoop();

            // add camera stream if getUserMedia succeeded
            if ('srcObject' in videoInput) {
                stream = videoStream;
                videoInput.srcObject = videoStream;
                videoInput.play();
            } else {
                videoInput.src = (window.URL && window.URL.createObjectURL(videoStream));
            }
        }

        obj.destroy = function () {
            stream && stream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            disconnect();
        };

        return obj;
    };
}

plugin(eyebrowsStudy);