// In main.js or your entry file
import './style.css';
import 'plyr/dist/plyr.css';
import VideoPlayer from './components/videoplayer';

// Map to store subtitle files by episode
const subtitleMap = {
  'episode1': "mdkepisode1.ass",
  'episode2': "mdkepisode2.ass"
};

let currentEpisode = 'episode1';
let player = null;

// Properly async function to fetch subtitles
async function fetchSubtitles(subnameFile) {
  try {
    if (!subnameFile) {
      console.warn('No subtitle file specified');
      return null;
    }
    
    console.log('Fetching subtitles:', subnameFile);
    const response = await fetch('http://localhost:3000/api/subs/' + subnameFile);
    
    if (!response.ok) {
      throw new Error('Error en la respuesta del servidor: ' + response.status);
    }
    
    const data = await response.json();
    console.log('Subtítulos obtenidos correctamente');
    return data;
    
  } catch (error) {
    console.error('Error al obtener subtítulos:', error);
    return null;
  }
}

// Initialize player with subtitles
async function initializePlayerWithSubtitles() {
  try {
    // First fetch the subtitles
    const subtitleData = await fetchSubtitles(subtitleMap[currentEpisode]);
    
    if (!subtitleData || !subtitleData.subtitle) {
      console.error('No subtitle data available');
      return;
    }
    
    console.log('Subtitle data loaded successfully');
    
    const videoElement = document.getElementById('player');
    if (!videoElement) {
      console.error('No video element found with ID "player"');
      return;
    }

    // Create a container for the player if it doesn't exist
    let playerContainer = videoElement.parentElement;
    if (!playerContainer || playerContainer.tagName === 'BODY') {
      playerContainer = document.createElement('div');
      playerContainer.id = 'player-container';
      videoElement.parentNode.replaceChild(playerContainer, videoElement);
      playerContainer.appendChild(videoElement);
    }

    // Ensure the crossorigin attribute is set before the player is initialized
    videoElement.setAttribute('crossorigin', 'anonymous');
    
    // Initialize the player
    player = new VideoPlayer('player', {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
      settings: ['captions', 'quality', 'speed'],
      captions: { active: true, language: 'auto', update: true },
      autoplay: false
    });

    // Sample subtitle URLs (for UI only)
    const subtitulosES = './src/subtitles/sample.ass';
    const subtitulosEN = './src/subtitles/sample.ass';
    const subtitulosFR = './src/subtitles/sample.ass';

    // Configure initial video with subtitles
    player.changeSource({
      qualities: [
        {
          id: 'hd',
          src: 'http://localhost:3000/api/video/mdkepisode1.mp4?resolution=720p',
          height: 720,
          type: 'video/mp4'
        },
        {
          id: 'sd',
          src: 'http://localhost:3000/api/video/mdkepisode1.mp4?resolution=480p',
          height: 480,
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
      console.log('Plyr player initialized');
      const videoElement = player.player.elements.container.querySelector('video');
      
      // Now we can safely pass the subtitle content
      player.initializeJASSUB(videoElement, subtitleData.subtitle);
    });

    // Add listener for quality change
    player.player.on('qualitychange', async (event) => {
      console.log('Quality changed to:', event.detail.quality);
      
      // Wait for the quality change to complete
      setTimeout(async () => {
        const videoElement = player.player.elements.container.querySelector('video');
        
        // Re-fetch the subtitles to ensure we have the latest data
        const freshSubtitleData = await fetchSubtitles(subtitleMap[currentEpisode]);
        
        if (freshSubtitleData && freshSubtitleData.subtitle) {
          console.log('Reinitializing JASSUB after quality change');
          player.initializeJASSUB(videoElement, freshSubtitleData.subtitle);
        }
      }, 500);
    });

    // Set up change video button
    setupChangeVideoButton();
    
  } catch (error) {
    console.error('Error initializing player:', error);
  }
}

// Setup button to change video
function setupChangeVideoButton() {
  const btnChangeVideo = document.getElementById('btn-change-video');
  if (btnChangeVideo) {
    btnChangeVideo.addEventListener('click', async () => {
      try {
        // Update current episode before changing source
        currentEpisode = 'episode2';
        
        // First fetch the new subtitles
        const newSubtitleData = await fetchSubtitles(subtitleMap[currentEpisode]);
        
        if (!newSubtitleData || !newSubtitleData.subtitle) {
          console.error('No subtitle data available for episode 2');
          return;
        }
        
        // Sample subtitle URLs (for UI only)
        const subtitulosES = './src/subtitles/sample.ass';
        const subtitulosEN = './src/subtitles/sample.ass';
        
        // Change the video source
        player.changeSource({
          qualities: [
            {
              id: 'hd',
              src: 'http://localhost:3000/api/video/mdkepisode2.mp4?resolution=720p',
              height: 720,
              type: 'video/mp4'
            },
            {
              id: 'sd',
              src: 'http://localhost:3000/api/video/mdkepisode2.mp4?resolution=480p',
              height: 480,
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
          
          // Now we can safely pass the subtitle content
          player.initializeJASSUB(videoElement, newSubtitleData.subtitle);
        }, 300);
      } catch (error) {
        console.error('Error changing video:', error);
      }
    });
  }
}

// Wait for DOM to be ready then initialize everything
document.addEventListener('DOMContentLoaded', initializePlayerWithSubtitles);