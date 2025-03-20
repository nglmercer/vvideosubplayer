/**
 * VideoPlayer Component
 * A custom video player with quality selection and subtitle support
 */

export default class VideoPlayer {
  constructor(options) {
    this.container = options.container;
    this.videoUrl = options.videoUrl || '';
    this.subtitleUrl = options.subtitleUrl || '';
    this.qualities = options.qualities || [];
    this.currentQuality = options.defaultQuality || (this.qualities.length > 0 ? this.qualities[0].value : null);
    this.subtitles = [];
    this.currentSubtitleIndex = -1;
    this.playbackRate = 1.0; // Default playback rate
    this.subtitleFormat = 'srt'; // Default subtitle format
    
    this.init();
  }

  init() {
    this.createPlayerElements();
    this.setupEventListeners();
    this.loadVideo();
    if (this.subtitleUrl) {
      this.loadSubtitles();
    }
  }

  createPlayerElements() {
    // Create main container
    this.playerContainer = document.createElement('div');
    this.playerContainer.className = 'video-player-container';
    
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'video-player';
    this.videoElement.controls = false;
    
    // Create controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'video-controls';
    
    // Create play/pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.className = 'play-pause-btn';
    this.playPauseButton.innerHTML = '▶';
    
    // Create progress bar
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'progress-container';
    
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar';
    
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'progress-fill';
    
    this.progressBar.appendChild(this.progressFill);
    this.progressContainer.appendChild(this.progressBar);
    
    // Create time display
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'time-display';
    this.timeDisplay.textContent = '0:00 / 0:00';
    
    // Create quality selector
    this.qualitySelector = document.createElement('select');
    this.qualitySelector.className = 'quality-selector';
    
    if (this.qualities.length > 0) {
      this.qualities.forEach(quality => {
        const option = document.createElement('option');
        option.value = quality.value;
        option.textContent = quality.label;
        if (quality.value === this.currentQuality) {
          option.selected = true;
        }
        this.qualitySelector.appendChild(option);
      });
    }
    
    // Create playback speed selector
    this.speedSelector = document.createElement('select');
    this.speedSelector.className = 'speed-selector';
    
    const speedOptions = [
      { value: 0.5, label: '0.5x' },
      { value: 0.75, label: '0.75x' },
      { value: 1.0, label: '1.0x' },
      { value: 1.25, label: '1.25x' },
      { value: 1.5, label: '1.5x' },
      { value: 2.0, label: '2.0x' }
    ];
    
    speedOptions.forEach(speed => {
      const option = document.createElement('option');
      option.value = speed.value;
      option.textContent = speed.label;
      if (speed.value === this.playbackRate) {
        option.selected = true;
      }
      this.speedSelector.appendChild(option);
    });
    
    // Create subtitle container
    this.subtitleContainer = document.createElement('div');
    this.subtitleContainer.className = 'subtitle-container';
    
    // Assemble controls
    this.controlsContainer.appendChild(this.playPauseButton);
    this.controlsContainer.appendChild(this.progressContainer);
    this.controlsContainer.appendChild(this.timeDisplay);
    this.controlsContainer.appendChild(this.qualitySelector);
    this.controlsContainer.appendChild(this.speedSelector);
    
    // Assemble player
    this.playerContainer.appendChild(this.videoElement);
    this.playerContainer.appendChild(this.subtitleContainer);
    this.playerContainer.appendChild(this.controlsContainer);
    
    // Add to the specified container
    this.container.appendChild(this.playerContainer);
  }

  setupEventListeners() {
    // Play/Pause button
    this.playPauseButton.addEventListener('click', () => this.togglePlay());
    
    // Video events
    this.videoElement.addEventListener('timeupdate', () => {
      this.updateProgressBar();
      this.updateTimeDisplay();
      this.updateSubtitles();
    });
    
    this.videoElement.addEventListener('loadedmetadata', () => {
      this.updateTimeDisplay();
    });
    
    // Progress bar
    this.progressBar.addEventListener('click', (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      this.videoElement.currentTime = pos * this.videoElement.duration;
    });
    
    // Quality selector
    this.qualitySelector.addEventListener('change', () => {
      const currentTime = this.videoElement.currentTime;
      const isPaused = this.videoElement.paused;
      
      this.currentQuality = this.qualitySelector.value;
      this.loadVideo(currentTime, !isPaused);
    });
    
    // Playback speed selector
    this.speedSelector.addEventListener('change', () => {
      this.playbackRate = parseFloat(this.speedSelector.value);
      this.videoElement.playbackRate = this.playbackRate;
    });
  }

  loadVideo(startTime = 0, autoplay = false) {
    if (!this.videoUrl || !this.currentQuality) return;
    
    // Find the selected quality URL
    const qualityOption = this.qualities.find(q => q.value === this.currentQuality);
    if (!qualityOption) return;
    
    const previousTime = this.videoElement.currentTime;
    const wasPlaying = !this.videoElement.paused;
    
    // Set the video source
    this.videoElement.src = qualityOption.url || this.videoUrl;
    
    // Set the current time if provided
    if (startTime > 0) {
      this.videoElement.currentTime = startTime;
    } else if (previousTime > 0) {
      this.videoElement.currentTime = previousTime;
    }
    
    // Autoplay if needed
    if (autoplay || wasPlaying) {
      this.videoElement.play();
    }
    
    // Set playback rate
    this.videoElement.playbackRate = this.playbackRate;
  }

  loadSubtitles() {
    console.log(`Loading subtitles from: ${this.subtitleUrl}`);
    fetch(this.subtitleUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load subtitles: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(data => {
        // Import the unified subtitle parser
        import('./SubtitleParser.js').then(module => {
          // Detect subtitle format
          if (this.subtitleUrl.toLowerCase().endsWith('.ass') || data.includes('[Script Info]')) {
            // Use the ASS parser
            const { ASSParser } = module;
            const result = ASSParser.parse(data);
            this.subtitles = result.subtitles;
            this.subtitleFormat = result.format;
            this.subtitleMetadata = result.metadata;
            this._subtitlesSorted = true; // Subtitles are already sorted by the parser
            console.log(`Loaded ${result.count} ASS subtitles`);
            console.log(`Subtitle metadata:`, this.subtitleMetadata);
            
            // Get subtitles as an array with additional properties
            this.subtitlesArray = ASSParser.toArray(this.subtitles);
          } else {
            // Use the SRT parser
            const { SRTParser } = module;
            const result = SRTParser.parse(data);
            this.subtitles = result.subtitles;
            this.subtitleFormat = result.format;
            this.subtitleMetadata = result.metadata;
            this._subtitlesSorted = true; // Subtitles are already sorted by the parser
            console.log(`Loaded ${result.count} SRT subtitles`);
            console.log(`Subtitle metadata:`, this.subtitleMetadata);
            
            // Get subtitles as an array with additional properties
            this.subtitlesArray = SRTParser.toArray(this.subtitles);
            
            // Debug: Log the first few subtitles to verify timing
            if (this.subtitles.length > 0) {
              console.log('First 3 subtitles:');
              this.subtitlesArray.slice(0, 3).forEach((sub) => {
                console.log(`${sub.index}: ${sub.startTime}s - ${sub.endTime}s (${sub.duration}s): ${sub.text}`);
              });
            }
          }
        });
      })
      .catch(error => {
        console.error('Error loading subtitles:', error);
      });
  }
  

  // The parseSubtitles and timeToSeconds methods have been moved to SRTParser.js

  updateSubtitles() {
    // Check if subtitles exist and are properly loaded
    if (!this.subtitles || !this.subtitles.length) return;
    
    const currentTime = this.videoElement.currentTime;
    let foundSubtitle = false;
    
    // Use binary search to find the subtitle more efficiently
    // This is especially useful for files with many subtitles
    if (this._subtitlesSorted && this.subtitlesArray && this.subtitlesArray.length > 20) {
      // Binary search implementation for large subtitle files
      let left = 0;
      let right = this.subtitlesArray.length - 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const subtitle = this.subtitlesArray[mid];
        
        if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
          // Found a subtitle that should be displayed
          if (this.currentSubtitleIndex !== subtitle.index) {
            this.subtitleContainer.innerHTML = subtitle.text;
            this.currentSubtitleIndex = subtitle.index;
            console.log(`Showing subtitle at ${currentTime}s (duration: ${subtitle.duration}s): ${subtitle.text}`);
          }
          foundSubtitle = true;
          break;
        } else if (currentTime < subtitle.startTime) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }
    } else {
      // Linear search for smaller subtitle files
      for (let i = 0; i < this.subtitles.length; i++) {
        const subtitle = this.subtitles[i];
        // Check if current video time is within subtitle time range
        if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
          if (this.currentSubtitleIndex !== i) {
            this.subtitleContainer.innerHTML = subtitle.text;
            this.currentSubtitleIndex = i;
            console.log(`Showing subtitle at ${currentTime}s: ${subtitle.text}`);
          }
          foundSubtitle = true;
          break; // We found the subtitle to display, no need to check others
        }
        
        // If we've passed the current time and haven't found a subtitle yet,
        // we can break early as subtitles are sorted by startTime
        if (subtitle.startTime > currentTime && !foundSubtitle) {
          break;
        }
      }
    }
    
    // Clear subtitle if no subtitle should be displayed at current time
    if (!foundSubtitle && this.currentSubtitleIndex !== -1) {
      this.subtitleContainer.innerHTML = '';
      this.currentSubtitleIndex = -1;
    }
  }

  togglePlay() {
    if (this.videoElement.paused) {
      this.videoElement.play();
      this.playPauseButton.innerHTML = '❚❚';
    } else {
      this.videoElement.pause();
      this.playPauseButton.innerHTML = '▶';
    }
  }

  updateProgressBar() {
    const percentage = (this.videoElement.currentTime / this.videoElement.duration) * 100;
    this.progressFill.style.width = `${percentage}%`;
  }

  updateTimeDisplay() {
    const currentTime = this.formatTime(this.videoElement.currentTime);
    const duration = this.formatTime(this.videoElement.duration);
    this.timeDisplay.textContent = `${currentTime} / ${duration}`;
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
}