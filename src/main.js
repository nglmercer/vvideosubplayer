import './style.css';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';
import subtitleStrings from './sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.ass?raw';
import secondsubtitleStrings from './sample/Medaka Kuroiwa is Impervious to My Charms Episode 2.ass?raw';
// SAMPLE NO EXISTE YA QUE PESA MAS DE VARIOS GB ---> REEMPLAZAR LOS VIDEOS O ARCHIVOS DE SUBTITULOS
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
    this.qualityOptions = [];
    this.currentQuality = null;
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
    
    // Add quality change listener
    this.player.on('qualitychange', (event) => {
      console.log('Quality changed to:', event.detail.quality);
      this.currentQuality = event.detail.quality;
    });
  }

  // Change video source with quality options and captions
  changeSource(options) {
    if (!this.player) return;
    
    const {
      qualities = [],
      defaultQuality = null,
      captionTracks = []
    } = options;
    
    console.log('Changing source with qualities:', qualities);
    console.log('Caption tracks:', captionTracks);
    
    // Store quality options for later use
    this.qualityOptions = qualities;
    
    // Determine the default quality to use
    let selectedQuality = defaultQuality;
    if (!selectedQuality && qualities.length > 0) {
      // If no default is specified, use the highest quality
      selectedQuality = qualities.reduce((prev, current) => {
        return (prev.height > current.height) ? prev : current;
      }).id;
    }
    
    this.currentQuality = selectedQuality;
    
    // Find the selected quality object
    const selectedQualityObj = qualities.find(q => q.id === selectedQuality) || qualities[0];
    
    if (!selectedQualityObj) {
      console.error('No valid quality option found');
      return;
    }
    
    // Map caption tracks to Plyr's expected format
    const tracks = captionTracks.map(track => ({
      kind: 'captions',
      label: track.label,
      srclang: track.srclang,
      src: track.src,
      default: track.default || false
    }));
    
    // Create the quality options in Plyr format
    const plyrQualities = qualities.map(quality => ({
      src: quality.src,
      type: quality.type || 'video/mp4',
      size: quality.height
    }));
    
    // Update source with tracks and quality options
    this.player.source = {
      type: 'video',
      sources: plyrQualities,
      tracks: tracks
    };
    
    // Set the default quality
    if (selectedQuality && this.player.quality) {
      setTimeout(() => {
        try {
          this.player.quality = selectedQualityObj.height;
          console.log('Set default quality to:', selectedQualityObj.height);
        } catch (error) {
          console.warn('Error setting default quality:', error);
        }
      }, 500);
    }
    
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

  // Change video quality
// Update the changeQuality method to preserve JASSUB subtitles
changeQuality(qualityId) {
  if (!this.player || !this.qualityOptions.length) return;
  
  console.log('Changing quality to:', qualityId);
  
  const qualityOption = this.qualityOptions.find(q => q.id === qualityId);
  if (!qualityOption) {
    console.error(`Quality option with ID "${qualityId}" not found`);
    return;
  }
  
  // Get current playback state
  const currentTime = this.player.currentTime;
  const wasPlaying = !this.player.paused;
  
  // Save the JASSUB instance and subtitle content before changing quality
  const jassub = this.player.jassub;
  const hasJASSUB = jassub && typeof jassub.getSubContent === 'function';
  let subContent = null;
  
  // If JASSUB is available, get the current subtitle content
  if (hasJASSUB) {
    try {
      // Store the current subtitle content if possible
      subContent = jassub.getSubContent ? jassub.getSubContent() : subtitleMap[currentEpisode];
      console.log('Saved subtitle content before quality change');
    } catch (error) {
      console.warn('Error saving subtitle content:', error);
    }
  }
  
  // Set the quality using Plyr's API
  if (this.player.quality) {
    try {
      this.player.quality = qualityOption.height;
      this.currentQuality = qualityId;
      
      // Restore playback state and subtitles
      setTimeout(() => {
        this.player.currentTime = currentTime;
        
        // Restore JASSUB subtitles if they were present
        if (hasJASSUB && subContent) {
          try {
            // If JASSUB was destroyed or needs to be recreated
            if (!this.player.jassub || !this.player.jassub.setTrackByContent) {
              console.log('Recreating JASSUB instance after quality change');
              const videoElement = this.player.elements.container.querySelector('video');
              
              // Recreate JASSUB with the saved subtitle content
              this.player.jassub = new JASSUB({
                video: videoElement,
                subContent: subContent,
                workerUrl,
                wasmUrl,
                prescaleFactor: 0.8,
                dropAllAnimations: false,
                asyncRenderMode: true
              });
            } else {
              // Update existing JASSUB instance with the subtitle content
              this.player.jassub.freeTrack();
              this.player.jassub.setTrackByContent(subContent);
              console.log('Restored subtitles after quality change');
            }
          } catch (error) {
            console.error('Error restoring subtitles:', error);
          }
        }
        
        // Resume playback if it was playing
        if (wasPlaying) {
          this.player.play();
        }
      }, 500); // Increased timeout to ensure video has loaded
      
      console.log('Quality changed successfully to:', qualityOption.height);
    } catch (error) {
      console.error('Error changing quality:', error);
    }
  }
}
  initializeJASSUB(videoElement, subtitleContent) {
    // Destroy existing JASSUB instance if it exists
    if (this.player.jassub) {
      this.player.jassub.destroy();
    }
    
    // Create new JASSUB instance
    this.player.jassub = new JASSUB({
      video: videoElement,
      subContent: subtitleContent,
      workerUrl,
      wasmUrl,
      prescaleFactor: 0.8,
      dropAllAnimations: false,
      asyncRenderMode: true
    });
    
    console.log('JASSUB initialized', this.player.jassub);
    
    // Add listener for qualitychange event to handle subtitle restoration
    if (!this._qualityChangeListenerAdded) {
      this.player.on('qualitychange', () => {
        console.log('Quality change event detected');
        // Short delay to ensure video element is updated
        setTimeout(() => {
          if (this.player.jassub) {
            // Make sure JASSUB is still rendering
            const videoElement = this.player.elements.container.querySelector('video');
            if (videoElement && videoElement !== this.player.jassub.video) {
              console.log('Video element changed, updating JASSUB');
              // Get current subtitle content
              const subContent = this.player.jassub.getSubContent ? 
                this.player.jassub.getSubContent() : 
                subtitleMap[currentEpisode];
              
              // Re-initialize JASSUB with new video element
              this.initializeJASSUB(videoElement, subContent);
            }
          }
        }, 300);
      });
      this._qualityChangeListenerAdded = true;
    }
    
    return this.player.jassub;
  }
  
  // Add this helper method to get current subtitles content
  getCurrentSubtitleContent() {
    if (this.player && this.player.jassub && typeof this.player.jassub.getSubContent === 'function') {
      return this.player.jassub.getSubContent();
    }
    return subtitleMap[currentEpisode];
  }
  // Get current quality
  getCurrentQuality() {
    return this.currentQuality;
  }
  
  // Get available quality options
  getQualityOptions() {
    return this.qualityOptions;
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

// Map to store subtitle content by episode
const subtitleMap = {
  'episode1': subtitleStrings,
  'episode2': secondsubtitleStrings
};

let rendersub = null;
let currentEpisode = 'episode1';

// Update the document.addEventListener section
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
    
    // Initialize the player
    const player = new VideoPlayer('player', {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
      settings: ['captions', 'quality', 'speed'],
      captions: { active: true, language: 'auto', update: true },
      autoplay: false
    });

    // For example, URLs (these won't be used directly with JASSUB but help with the UI)
    const subtitulosES = './src/subtitles/sample.ass';
    const subtitulosEN = './src/subtitles/sample.ass';
    const subtitulosFR = './src/subtitles/sample.ass';

    // Configure initial video with subtitles
    player.changeSource({
      qualities: [
        {
          id: 'hd',
          src: '/src/sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.mp4',
          height: 720,
          type: 'video/mp4'
        },
        {
          id: 'sd',
          src: '/src/sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.mp4',
          height: 1080,
          type: 'video/mp4'
        },
      ],
      defaultQuality: "hd",
      captionTracks: [
        { label: 'Español', srclang: 'es', src: subtitulosES, default: true },
        { label: 'English', srclang: 'en', src: subtitulosEN },
        { label: 'Français', srclang: 'fr', src: subtitulosFR }
      ]
    });

    // Initialize JASSUB after Plyr is ready
    player.player.on('ready', () => {
      console.log('Plyr player initialized', player);
      const videoElement = player.player.elements.container.querySelector('video');
      
      // Use the new initializeJASSUB method
      player.initializeJASSUB(videoElement, subtitleMap[currentEpisode]);
    });

    // Add listener for quality change
    player.player.on('qualitychange', (event) => {
      console.log('Quality changed to:', event.detail.quality);
      
      // Ensure subtitles are still working after quality change
      setTimeout(() => {
        const videoElement = player.player.elements.container.querySelector('video');
        const jassub = player.player.jassub;
        
        // If JASSUB is not properly attached to the current video element
        if (jassub && videoElement && jassub.video !== videoElement) {
          console.log('Video element changed, reinitializing JASSUB');
          
          // Get the current subtitle content
          const currentContent = player.getCurrentSubtitleContent();
          
          // Reinitialize JASSUB with the current video element and subtitle content
          player.initializeJASSUB(videoElement, currentContent);
        }
      }, 500);
    });

    // Button to change video
    const btnChangeVideo = document.getElementById('btn-change-video');
    if (btnChangeVideo) {
      btnChangeVideo.addEventListener('click', () => {
        // Update current episode before changing source
        currentEpisode = 'episode2';
        
        player.changeSource({
          qualities: [
            {
              id: 'hd',
              src: '/src/sample/Medaka Kuroiwa is Impervious to My Charms Episode 2.mp4',
              height: 720,
              type: 'video/mp4'
            },
            {
              id: 'sd',
              src: '/src/sample/Medaka Kuroiwa is Impervious to My Charms Episode 2.mp4',
              height: 1080,
              type: 'video/mp4'
            },
          ],
          defaultQuality: "hd",
          captionTracks: [
            { label: 'Español', srclang: 'es', src: subtitulosES, default: true },
            { label: 'English', srclang: 'en', src: subtitulosEN }
          ]
        });
        
        // Wait for source to change, then update JASSUB
        setTimeout(() => {
          const videoElement = player.player.elements.container.querySelector('video');
          
          // Use the initializeJASSUB method with the new episode subtitles
          player.initializeJASSUB(videoElement, subtitleMap[currentEpisode]);
        }, 300);
      });
    }
  
    // Clean up on destroy
    player.player.on('destroy', () => {
      if (player.player.jassub) {
        player.player.jassub.destroy();
      }
    });
  }, 100); // Short delay to ensure DOM is ready
});

export default VideoPlayer;