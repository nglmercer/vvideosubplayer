import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';
import '/src/style.css';
import 'plyr/dist/plyr.css';
import { Parser } from 'm3u8-parser';
import Plyr from 'plyr';
import Hls from 'hls.js';
// Utility Functions
const fetchM3U8 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const text = await response.text();
    const parser = new Parser();
    parser.push(text);
    parser.end();
    return parser.manifest;
  } catch (error) {
    console.error('Error fetching M3U8:', error);
    return null;
  }
};

const fetchSubtitles = async (url) => {
  if (!url) {
    console.warn('No subtitle file specified');
    return null;
  }

  try {
    console.log('Fetching subtitles:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Server response error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();
    const subtitleData = isJson ? (data.subtitleFile || data.subtitle) : data;
    
    console.log('Subtitles fetched successfully:', isJson ? 'JSON' : 'Text');
    return subtitleData;
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return null;
  }
};
//video.getElementsByTagName("source")[0].setAttribute("src", "https://api.koinima.com/res2/video/master/"+urlParams.get('capitulo')+"?Authorization="+urlParams.get('Authorization'));
// Video Player Class
class VideoPlayer {
  constructor(videoElement, m3u8Url) {
    this.video = videoElement;
    this.m3u8Url = m3u8Url;
    this.player = null;
    this.jassub = null;
    this.subtitles = {
      ass: [],
      other: []
    };
    this.tracks = {
      video: [],
      audio: []
    };
    this.assActive = false;
  }

  async initialize() {
    await this.setupVideoSource();
    await this.parseManifest();
    this.setupTracks();
    this.setupPlayer();
    await this.setupSubtitles();
    this.setupEventListeners();
  }

  async setupVideoSource() {
      // Verificar si hls.js es soportado
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: true, // Activa el modo debug para ver más detalles en la consola
        });
        // establecemos window.hls para acceder a hls.js desde cualquier parte del código
        window.hls = hls;
        // Cargar el archivo .m3u8
        hls.loadSource(this.m3u8Url);
  
        // Vincular el elemento <video> a hls.js
        hls.attachMedia(this.video);
  
        // Evento cuando el manifiesto está listo
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('Manifiesto HLS cargado, iniciando reproducción...');
          this.video.play().catch((error) => {
            console.error('Error al iniciar la reproducción:', error);
          });
        });
  
        // Manejo de errores
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('Error de HLS:', data);
          if (data.fatal) {
            console.error('Error fatal detectado:', data.type);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Error de red, intentando reiniciar...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Error de medios, intentando recuperar...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Error irrecuperable, destruyendo instancia...');
                hls.destroy();
                break;
            }
          }
        });
      } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        // Soporte nativo (p. ej., Safari)
        this.video.src = this.m3u8Url;
        this.video.addEventListener('loadedmetadata', () => {
          this.video.play();
        });
      } else {
        console.error('HLS no es soportado en este navegador.');
      }
    
  }

  async parseManifest() {
    this.manifest = await fetchM3U8(this.m3u8Url);
    console.log('Manifest parsed:', this.manifest);
  }

  setupTracks() {
    // Video tracks (qualities)
    this.tracks.video = this.manifest.playlists.map(playlist => ({
      height: playlist.attributes.RESOLUTION?.height || 0,
      uri: new URL(playlist.uri, this.m3u8Url).href
    }));

    // Audio tracks
    const audioGroups = this.manifest.mediaGroups?.AUDIO?.audio || {};
    this.tracks.audio = Object.values(audioGroups).flat();

    // Subtitles
    const subtitleGroups = this.manifest.mediaGroups?.SUBTITLES?.subs || {};
    Object.values(subtitleGroups).flat().forEach(track => {
      const target = track.uri.endsWith('.ass') ? this.subtitles.ass : this.subtitles.other;
      target.push(track);
    });
  }

  setupPlayer() {
    const qualityOptions = [0, ...this.tracks.video.map(t => t.height)];
    const audioLabels = this.tracks.audio.reduce((acc, track, i) => ({
      ...acc,
      [i]: track.name || track.language || `Audio ${i + 1}`
    }), {});

    this.player = new Plyr(this.video, {
      captions: { active: true, update: true, language: 'es' },
      autoplay: true,
      quality: {
        default: 0,
        options: qualityOptions,
        forced: true,
        onChange: quality => this.handleQualityChange(quality)
      },
      i18n: {
        audioTrack: 'Idioma',
        quality: 'Calidad',
        captions: 'Subtítulos',
        'captions.off': 'Desactivar subtítulos',
        'captions.settings': 'Configuración de subtítulos',
        speed: 'Velocidad',
        qualityLabel: { 0: 'Auto' }
      },
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 
        'captions', 'settings', 'fullscreen',   
  ]
    });
  }

  async setupSubtitles() {
    // Setup non-ASS subtitles
    this.subtitles.other.forEach(track => {
      const trackElement = document.createElement('track');
      Object.assign(trackElement, {
        kind: 'subtitles',
        label: track.name || track.language || 'Subtítulos',
        srclang: track.language || 'es',
        src: new URL(track.uri, this.m3u8Url).href,
        default: track.attributes?.DEFAULT === 'YES'
      });
      this.video.appendChild(trackElement);
    });

    // Setup ASS subtitles
    if (this.subtitles.ass.length) {
      const subtitleUrl = new URL(this.subtitles.ass[0].uri, this.m3u8Url).href;
      const subtitleContent = await fetchSubtitles(subtitleUrl);
      if (subtitleContent) {
        this.initializeJASSUB(this.player.media, subtitleContent);
      }
    }
  }

  setupEventListeners() {
    if (!this.player) {
        console.error('Player no inicializado al intentar configurar event listeners');
        return;
      }
      this.player.on('ready', () => console.log('Plyr player initialized'));
      this.player.on('languagechange', () => this.handleLanguageChange());
    this.player.on('qualitychange', () => this.handleQualityChangeEvent());
    this.player.on('captionsenabled', () => {
        console.log('Captions enabled');
        const videoElement = this.player.media;
        this.initializeJASSUB(videoElement, this.currentSubtitleContent);
      });
    
      this.player.on('captionsdisabled', () => {
        console.log('Captions disabled');
/*             this.jassub?.freeTrack();
 */
      });
  }

  handleQualityChange(quality) {
    const track = this.tracks.video.find(v => v.height === quality);
    if (track) {
      this.video.src = track.uri;
      this.video.load();
      this.video.play();
    }
    updateQuality(quality)
  }

  async handleQualityChangeEvent() {
    console.log('Quality changed');
    if (!this.assActive || !this.currentSubtitleContent) return;

    const videoElement = this.player.media;
    if (this.video.readyState >= 2) {
      this.initializeJASSUB(videoElement, this.currentSubtitleContent);
    } else {
      this.video.addEventListener('loadeddata', () => {
        this.initializeJASSUB(videoElement, this.currentSubtitleContent);
      }, { once: true });
    }
  }

  handleLanguageChange() {
    console.log('Language changed');
    if (this.player.currentTrack !== -1 && this.assActive) {
      this.jassub?.freeTrack();
      this.assActive = false;
    }
    try {
        // Safe access to current track
        const currentTrack = this.player.captions && this.player.currentTrack;
        console.log('Caption language changed to:', currentTrack);
      } catch (error) {
        console.warn('Error getting current track:', error);
      }
  }

  initializeJASSUB(videoElement, subtitleContent) {
    if (!videoElement || !subtitleContent) {
      console.error('Missing required parameters for JASSUB initialization');
      return;
    }

    this.currentSubtitleContent = subtitleContent;
    this.assActive = true;

    if (this.jassub) {
      this.jassub.destroy();
    }

    try {
      this.jassub = new JASSUB({
        video: videoElement,
        subContent: subtitleContent,
        workerUrl,
        wasmUrl,
        prescaleFactor: 0.8,
        dropAllAnimations: false,
        asyncRenderMode: true
      });
      console.log('JASSUB initialized successfully');
    } catch (error) {
      console.error('Error initializing JASSUB:', error);
      this.jassub = null;
    }
  }
}
function updateQuality(newQuality) {
  console.log("Quiere cambiar a " + newQuality)
  if (newQuality === 0) {
    window.hls.currentLevel = -1; //Enable AUTO quality if option.value = 0
  } else {
    window.hls.levels.forEach((level, levelIndex) => {
      if (level.height === newQuality) {
        console.log("Found quality match with " + newQuality);
        window.hls.currentLevel = levelIndex;
      }
    });
  }
}
export { VideoPlayer };