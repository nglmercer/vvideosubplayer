import './style.css';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

class VideoPlayer {
  constructor(elementId, options = {}) {
    this.elementId = elementId;
    // Default configuration with captions support
    this.defaultOptions = {
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
      settings: ['captions', 'quality', 'speed'],
      captions: { active: true, language: 'auto', update: true }
    };
    this.options = { ...this.defaultOptions, ...options };
    this.player = null;
    this.initialize();
  }

  initialize() {
    // Check if element exists first
    const videoElement = document.getElementById(this.elementId);
    if (!videoElement) {
      console.error(`Video element with ID "${this.elementId}" not found`);
      return;
    }

    // Set crossorigin attribute for loading captions
    videoElement.setAttribute('crossorigin', 'anonymous');

    // Initialize Plyr player
    this.player = new Plyr(`#${this.elementId}`, this.options);

    // Ready event to confirm player is initialized
    this.player.on('ready', () => {
      console.log('Player is ready');
      
      // Debug: Log if captions are available
      if (this.player.captions) {
        console.log('Captions module available');
        // Use the correct method to get tracks based on Plyr version
        try {
          const tracks = this.getCaptionLanguages();
          console.log('Available tracks:', tracks);
          console.log('Captions active:', this.player.captions.active);
        } catch (error) {
          console.warn('Error accessing captions:', error);
        }
      }
    });

    this.player.on('error', (error) => {
      console.error('Player error:', error);
    });
    
    // Debug: Log caption events
    this.player.on('captionsenabled', () => {
      console.log('Captions enabled');
    });
    
    this.player.on('captionsdisabled', () => {
      console.log('Captions disabled');
    });
    
    this.player.on('languagechange', () => {
      try {
        // Safe access to current track
        const currentTrack = this.player.captions && this.player.currentTrack;
        console.log('Caption language changed to:', currentTrack);
      } catch (error) {
        console.warn('Error getting current track:', error);
      }
    });
  }

  // Change video source and add captions using Plyr's native captions support
  changeSource(sourceUrl, type = 'video/mp4', captionTracks = []) {
    if (!this.player) return;

    console.log('Changing source with tracks:', captionTracks);

    // Map caption tracks to Plyr's expected format
    const tracks = captionTracks.map(track => ({
      kind: 'captions',
      label: track.label,
      srclang: track.srclang,
      src: track.src,
      default: track.default || false
    }));

    // Update source with tracks configuration
    this.player.source = {
      type: 'video',
      sources: [
        {
          src: sourceUrl,
          type: type,
        },
      ],
      tracks: tracks
    };

    // Activate captions if any tracks are available
    if (tracks.length > 0 && tracks.some(track => track.default)) {
      setTimeout(() => {
        if (this.player && this.player.captions) {
          this.player.captions.active = true;
          console.log('Captions activated');
        }
      }, 500);
    }
  }

  // Add captions using Plyr's native API
  addCaptions(tracks) {
    if (!this.player || !tracks || !tracks.length) return;

    console.log('Adding captions:', tracks);

    // Get current source configuration
    const currentSource = this.player.source;
    
    // Create a new source configuration with the current source and new tracks
    const newSource = {
      ...currentSource,
      tracks: tracks.map(track => ({
        kind: 'captions',
        label: track.label,
        srclang: track.srclang,
        src: track.src,
        default: track.default || false
      }))
    };

    // Update the source with new tracks
    this.player.source = newSource;

    // Activate captions if any track is set as default
    if (tracks.some(track => track.default)) {
      setTimeout(() => {
        if (this.player && this.player.captions) {
          this.player.captions.active = true;
          console.log('Captions activated after adding');
        }
      }, 500);
    }
  }

  // Change captions language
  changeCaptionLanguage(language) {
    if (!this.player || !this.player.captions) return;

    console.log('Changing caption language to:', language);

    try {
      // Safe way to get available tracks
      const tracks = this.getCaptionLanguages();
      const trackIndex = tracks.findIndex(track => track.language === language);
      
      if (trackIndex !== -1) {
        this.player.captions.currentTrack = trackIndex;
        this.player.captions.active = true; // Ensure captions are active
        console.log('Found and set track index:', trackIndex);
      } else {
        console.warn('No track found for language:', language);
      }
    } catch (error) {
      console.error('Error changing caption language:', error);
    }
  }

  // Toggle captions on/off
  toggleCaptions(active) {
    if (!this.player || !this.player.captions) return;
    console.log('Toggling captions:', active);
    this.player.captions.active = active;
  }

  // Get available caption languages
  getCaptionLanguages() {
    if (!this.player || !this.player.captions) return [];
    
    // Safely get tracks depending on Plyr version
    let tracks = [];
    
    try {
      // Try the getTracks method first
      if (typeof this.player.captions.getTracks === 'function') {
        tracks = this.player.captions.getTracks();
      } 
      // Fall back to accessing tracks property directly
      else if (this.player.captions.tracks) {
        tracks = this.player.captions.tracks;
      }
      // Last resort: try to get them from the video element
      else {
        const videoElement = document.getElementById(this.elementId);
        if (videoElement && videoElement.textTracks) {
          tracks = Array.from(videoElement.textTracks).map(track => ({
            label: track.label,
            language: track.language
          }));
        }
      }
    } catch (error) {
      console.warn('Error getting caption tracks:', error);
    }
    
    // Map to consistent format
    const mappedTracks = tracks.map(track => ({
      label: track.label || track.language,
      language: track.language || track.srclang
    }));
    
    console.log('Available caption languages:', mappedTracks);
    return mappedTracks;
  }

  // Destroy the player
  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Give a little time for everything to initialize
  setTimeout(() => {
    const videoElement = document.getElementById('player');
    if (!videoElement) {
      console.error('No video element found with ID "player"');
      return;
    }

    // Create a container for the player if it doesn't exist
    let playerContainer = videoElement.parentElement;
    if (!playerContainer || playerContainer.tagName === 'BODY') {
      // If video element doesn't have a proper parent, create one
      playerContainer = document.createElement('div');
      playerContainer.id = 'player-container';
      videoElement.parentNode.replaceChild(playerContainer, videoElement);
      playerContainer.appendChild(videoElement);
    }

    // Ensure the crossorigin attribute is set before the player is initialized
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    // Add the <track> elements directly to the <video> element for better compatibility
    const trackES = document.createElement('track');
    trackES.kind = 'captions';
    trackES.label = 'Español';
    trackES.srclang = 'es';
    trackES.src = './subtitles/sample.es.srt';
    trackES.default = true;
    videoElement.appendChild(trackES);
    
    const trackEN = document.createElement('track');
    trackEN.kind = 'captions';
    trackEN.label = 'English';
    trackEN.srclang = 'en';
    trackEN.src = './subtitles/sample.en.srt';
    videoElement.appendChild(trackEN);

    // Initialize the player
    const player = new VideoPlayer('player', {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
      settings: ['captions', 'quality', 'speed'],
      captions: { active: true, language: 'auto', update: true },
      autoplay: false
    });

    // Use proper paths for different language subtitles
    const subtitulosES = './subtitles/sample.es.srt';
    const subtitulosEN = './subtitles/sample.en.srt';
    const subtitulosFR = './subtitles/sample.fr.srt';

    // Configurar video inicial con subtítulos
    player.changeSource(
      'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
      'video/mp4',
      [
        { label: 'Español', srclang: 'es', src: subtitulosES, default: true },
        { label: 'English', srclang: 'en', src: subtitulosEN },
        { label: 'Français', srclang: 'fr', src: subtitulosFR }
      ]
    );

    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'subtitle-controls';
    controlsContainer.style.margin = '10px 0';
    
    // Toggle subtitles button
    const btnToggleSubtitles = document.createElement('button');
    btnToggleSubtitles.textContent = 'Toggle Subtitles';
    btnToggleSubtitles.style.marginRight = '10px';
    btnToggleSubtitles.addEventListener('click', () => {
      if (player.player && player.player.captions) {
        const isActive = player.player.captions.active;
        player.toggleCaptions(!isActive);
      }
    });
    controlsContainer.appendChild(btnToggleSubtitles);
    
    // Language buttons
    const languages = [
      { code: 'es', label: 'Español' },
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' }
    ];
    
    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.textContent = lang.label;
      btn.style.marginRight = '10px';
      btn.addEventListener('click', () => {
        player.changeCaptionLanguage(lang.code);
      });
      controlsContainer.appendChild(btn);
    });
    
    // Append controls container to player container instead of directly after video element
    playerContainer.appendChild(controlsContainer);

    // Botón para cambiar video
    const btnChangeVideo = document.getElementById('btn-change-video');
    if (btnChangeVideo) {
      btnChangeVideo.addEventListener('click', () => {
        player.changeSource(
          'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
          'video/mp4',
          [
            { label: 'Español', srclang: 'es', src: subtitulosES, default: true },
            { label: 'English', srclang: 'en', src: subtitulosEN }
          ]
        );
      });
    }
    
    // Add a debug button to check subtitles
    const btnDebug = document.createElement('button');
    btnDebug.textContent = 'Debug Subtitles';
    btnDebug.style.marginTop = '10px';
    btnDebug.addEventListener('click', () => {
      try {
        const tracks = player.getCaptionLanguages();
        console.log('Current tracks:', tracks);
        console.log('Captions active:', player.player.captions ? player.player.captions.active : 'N/A');
        console.log('Current track:', player.player.captions ? player.player.captions.currentTrack : 'N/A');
        
        // Check if subtitle files are accessible
        languages.forEach(lang => {
          const url = `./subtitles/sample.${lang.code}.srt`;
          fetch(url)
            .then(response => {
              console.log(`Subtitle file ${url}: ${response.ok ? 'accessible' : 'not found'}`);
            })
            .catch(error => {
              console.error(`Error checking subtitle file ${url}:`, error);
            });
        });
      } catch (error) {
        console.error('Debug error:', error);
      }
    });
    controlsContainer.appendChild(btnDebug);
  }, 100); // Short delay to ensure DOM is ready
});

export default VideoPlayer;