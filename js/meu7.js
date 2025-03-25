import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';
import '/src/style.css';
import 'plyr/dist/plyr.css';
import { Parser } from 'm3u8-parser';
import Plyr from 'plyr';

// Función para parsear el M3U8
async function parseM3U8(url) {
  const response = await fetch(url);
  const text = await response.text();
  const parser = new Parser();
  parser.push(text);
  parser.end();
  return parser.manifest;
}
async function fetchSubtitles(subnameFile) {
    let responsedata;
    try {
      if (!subnameFile) {
        console.warn("No subtitle file specified");
        return null;
      }

      console.log("Fetching subtitles:", subnameFile);
      const response = await fetch(subnameFile);

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor: " + response.status);
      }

      // Detectar si el contenido es JSON o texto
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        responsedata = data.subtitleFile || data.subtitle;
        return responsedata;
      } else {
        const data = await response.text();
        responsedata = data;
        console.log("Subtítulos obtenidos como texto",data, response);
        return responsedata;
      }
      return responsedata;
    } catch (error) {
      console.error("Error al obtener subtítulos:", error);
      return null;
    }
  }
// Clase VideoPlayer para encapsular la lógica
class VideoPlayer {
  constructor(videoElement, m3u8Url) {
    this.video = videoElement;
    this.m3u8Url = m3u8Url;
    this.player = null;
    this.jassub = null;
    this.assSubtitles = []; // Subtítulos .ass
    this.otherSubtitles = []; // Otros subtítulos
    this.assActive = false; // Estado de JASSUB
    this.videoTracks = []; // Pistas de video (calidades)
    this.audioTracks = []; // Pistas de audio
  }

  async init() {
    // Configurar la fuente del video
    const sourceElement = this.video.getElementsByTagName("source")[0];
    sourceElement.setAttribute("src", this.m3u8Url);

    // Parsear el M3U8
    const manifest = await parseM3U8(this.m3u8Url);
    console.log('Manifiesto parseado:', manifest);

    // Extraer pistas de video (calidades)
    this.videoTracks = manifest.playlists.map(playlist => ({
      height: playlist.attributes.RESOLUTION?.height || 0,
      uri: new URL(playlist.uri, this.m3u8Url).href
    }));
    const availableQualities = this.videoTracks.map(track => track.height);
    availableQualities.unshift(0); // Agregar "Auto" como opción

    // Extraer pistas de audio
    const audioGroups = manifest.mediaGroups?.AUDIO?.audio || {};
    this.audioTracks = Object.values(audioGroups).flat();
    const availableAudioTracks = this.audioTracks.map((_, index) => index);
    const audioLabels = this.audioTracks.reduce((acc, track, index) => {
      acc[index] = track.name || track.language || `Audio ${index + 1}`;
      return acc;
    }, {});

    // Extraer y separar subtítulos
    const subtitleGroups = manifest.mediaGroups?.SUBTITLES?.subs || {};
    const subtitleTracks = Object.values(subtitleGroups).flat();
    subtitleTracks.forEach(track => {
      if (track.uri.endsWith('.ass')) {
        this.assSubtitles.push(track);
      } else {
        this.otherSubtitles.push(track);
      }
    });

    // Agregar solo los subtítulos no .ass como <track>
    this.otherSubtitles.forEach(track => {
      const trackElement = document.createElement("track");
      trackElement.kind = "subtitles";
      trackElement.label = track.name || track.language || "Subtítulos";
      trackElement.srclang = track.language || "es";
      trackElement.src = new URL(track.uri, this.m3u8Url).href;
      trackElement.default = track.attributes?.DEFAULT === "YES" || false;
      this.video.appendChild(trackElement);
    });

    // Configurar opciones de Plyr
    const playerOptions = {
      captions: { active: true, update: true, language: 'es' },
      autoplay: true,
      quality: {
        default: this.videoTracks[0]?.height || 0,
        options: availableQualities,
        forced: true,
        onChange: (quality) => {
          const selected = this.videoTracks.find(v => v.height === quality);
          if (selected) {
            this.video.src = selected.uri;
            this.video.load();
            this.video.play();
          }
        },
      },
      i18n: {
        'audioTrack': 'Idioma',
        'quality': 'Calidad',
        'captions': 'Subtítulos',
        'captions.off': 'Desactivar subtítulos',
        'captions.settings': 'Configuración de subtítulos',
        'speed': 'Velocidad',
        qualityLabel: { 0: 'Auto' },
      },
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'captions',
        'settings',
        'fullscreen'
      ],
    };

    // Inicializar Plyr
    this.player = new Plyr(this.video, playerOptions);

    // Inicializar JASSUB
    this.jassub = new JASSUB({
      video: this.video,
      workerUrl: workerUrl,
      wasmUrl: wasmUrl,
    });

    // Configurar eventos
    this.setupEvents();

    console.log('Calidades disponibles:', availableQualities);
    console.log('Pistas de audio:', this.audioTracks);
    console.log('Subtítulos .ass:', this.assSubtitles);
    console.log('Otros subtítulos:', this.otherSubtitles);
  }

    async  setupEvents() {
        const substring = await this.existAssSubtitles();
        const videoElement = this.player.elements.container.querySelector('video');
        this.initializeJASSUB(videoElement, substring);
        // Handle quality changes
        this.player.on('qualitychange', () => {
            console.log('Quality changed');
            if (this.assActive) {
                if (this.video.readyState >= 2) {
                    this.initializeJASSUB(videoElement, substring);
                } else {
                this.video.addEventListener('loadeddata', () => {
                    this.initializeJASSUB(videoElement, substring);
                }, { once: true });
                }
            }
        });
        this.player.on('ready', () => {
            console.log('Plyr player initialized');
        });

        this.player.on('languagechange', () => {
            console.log('Language changed');
            if (this.player.currentTrack !== -1) {
                this.jassub.freeTrack();
                this.assActive = false;
            }
        });
    }
    async  existAssSubtitles() {
        if (this.assSubtitles.length === 0) return false;
        const subtitleUrl = new URL(this.assSubtitles[0].uri, this.m3u8Url).href;
        console.log('Loading ASS subtitles:', subtitleUrl, this.assSubtitles);
        return await fetchSubtitles(subtitleUrl);
    }
  initializeJASSUB(videoElement, subtitleContent) {
    if (!videoElement) {
      console.error('No video element provided for JASSUB initialization');
      return null;
    }
    
    if (!subtitleContent) {
      console.error('No subtitle content provided for JASSUB initialization');
      return null;
    }
    
    // Store the subtitle content for future use
    this.currentSubtitleContent = subtitleContent;
    
    // Log subtitle content type and first few characters to help debug
    console.log('Initializing JASSUB with subtitle content type:', typeof subtitleContent);
    if (typeof subtitleContent === 'string') {
      console.log('Subtitle content preview:', subtitleContent.substring(0, 100) + '...');
    }
    
    // Destroy existing JASSUB instance if it exists
    if (this.player.jassub) {
      console.log('Destroying previous JASSUB instance');
      this.player.jassub.destroy();
      this.player.jassub = null;
    }
    
    try {
      // Create new JASSUB instance
      console.log('Creating new JASSUB instance');
      this.player.jassub = new JASSUB({
        video: videoElement,
        subContent: subtitleContent,
        workerUrl,
        wasmUrl,
        prescaleFactor: 0.8,
        dropAllAnimations: false,
        asyncRenderMode: true
      });
      
      console.log('JASSUB initialized successfully');
      
      return this.player.jassub;
    } catch (error) {
      console.error('Error initializing JASSUB:', error);
      return null;
    }
  }
}

// Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const localUrl = "http://localhost:3000/api/m3u8/";
  const m3u8Url = `${localUrl}mdkepisode1.mp4`;
  const video = document.querySelector("video");
  const player = new VideoPlayer(video, m3u8Url);
  await player.init();
});