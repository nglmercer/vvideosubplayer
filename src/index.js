import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';
import subtitleStrings from './sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.ass?raw';

console.log('Subtitle string:', subtitleStrings);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <video id="my-video" controls crossorigin playsinline>
      <source src="./src/sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.mp4" type="video/mp4" />
      <p>
        Tu navegador no soporta video HTML5.
      </p>
    </video>
  `;
  document.body.appendChild(container);

  const player = new Plyr('#my-video', {
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
    autoplay: false,
    captions: { active: true, update: true }
  });

  player.on('ready', () => {
    console.log('Plyr player initialized', player);
    const videoElement = player.elements.container.querySelector('video');

    const renderer = new JASSUB({
      video: videoElement,
      subContent: subtitleStrings,
      workerUrl,
      wasmUrl,
      prescaleFactor: 0.8,
      dropAllAnimations: false,
      asyncRenderMode: true
    });

    // Store JASSUB instance on player
    player.jassub = renderer;

    console.log('Subtitle renderer initialized');
  });

  // Clean up on destroy
  player.on('destroy', () => {
    if (player.jassub) {
      player.jassub.destroy();
    }
  });
});