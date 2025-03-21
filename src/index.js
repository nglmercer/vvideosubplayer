import 'video.js/dist/video-js.css';
import videojs from 'video.js';
import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';
import subtitleStrings from '../public/subtitles/sample.ass?raw';
console.log('Subtitle string:', subtitleStrings);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <video id="my-video" class="video-js vjs-default-skin" controls preload="auto" width="640" height="360">
      <source src="https://vjs.zencdn.net/v/oceans.mp4" type="video/mp4" />
      <p class="vjs-no-js">
        Para ver este video, por favor activa JavaScript y considera actualizar a un
        navegador web que soporte video HTML5
      </p>
    </video>
  `;
  document.body.appendChild(container);

  const player = videojs('my-video', {
    controls: true,
    autoplay: false,
    preload: 'auto',
  }, function() {
    console.log('Video player initialized', this);
    const videoElement = this.el().querySelector('video');
    
    const renderer = new JASSUB({
      video: videoElement,
      subContent: subtitleStrings,
      workerUrl,
      wasmUrl,
      prescaleFactor: 0.8,
      dropAllAnimations: false,
      asyncRenderMode: true
    });
    
    this.jassub = renderer;
    
    this.on('dispose', () => {
      if (this.jassub) {
        this.jassub.destroy();
      } 
    });
    
    console.log('Subtitle renderer initialized');
  });

});