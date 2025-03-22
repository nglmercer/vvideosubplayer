import 'plyr/dist/plyr.css';
import Plyr from 'plyr';
import JASSUB from 'jassub';
import workerUrl from 'jassub/dist/jassub-worker.js?url';
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url';

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
    this._qualityChangeListenerAdded = false;
    this.currentSubtitleContent = null;
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
  async changeQuality(qualityId) {
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
    
    // If JASSUB is available, get the current subtitle content
    if (hasJASSUB) {
      try {
        // Store the current subtitle content if possible
        this.currentSubtitleContent = jassub.getSubContent ? jassub.getSubContent() : this.currentSubtitleContent;
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
          if (hasJASSUB && this.currentSubtitleContent) {
            try {
              // If JASSUB was destroyed or needs to be recreated
              if (!this.player.jassub || !this.player.jassub.setTrackByContent) {
                console.log('Recreating JASSUB instance after quality change');
                const videoElement = this.player.elements.container.querySelector('video');
                
                // Recreate JASSUB with the saved subtitle content
                this.initializeJASSUB(videoElement, this.currentSubtitleContent);
              } else {
                // Update existing JASSUB instance with the subtitle content
                this.player.jassub.freeTrack();
                this.player.jassub.setTrackByContent(this.currentSubtitleContent);
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

  // Initialize JASSUB with subtitle content (ensure content is already fetched)
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
                // Re-initialize JASSUB with stored subtitle content
                if (this.currentSubtitleContent) {
                  this.initializeJASSUB(videoElement, this.currentSubtitleContent);
                }
              }
            }
          }, 300);
        });
        this._qualityChangeListenerAdded = true;
      }
      
      return this.player.jassub;
    } catch (error) {
      console.error('Error initializing JASSUB:', error);
      return null;
    }
  }
  
  // Add this helper method to get current subtitles content
  getCurrentSubtitleContent() {
    return this.currentSubtitleContent;
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
      if (this.player.jassub) {
        this.player.jassub.destroy();
        this.player.jassub = null;
      }
      this.player.destroy();
      this.player = null;
    }
  }
}

export default VideoPlayer;