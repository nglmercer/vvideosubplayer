import './style.css';
import 'plyr/dist/plyr.css';
import subtitleStrings from './sample/Medaka Kuroiwa is Impervious to My Charms Episode 1.ass?raw';
import secondsubtitleStrings from './sample/Medaka Kuroiwa is Impervious to My Charms Episode 2.ass?raw';
// SAMPLE NO EXISTE YA QUE PESA MAS DE VARIOS GB ---> REEMPLAZAR LOS VIDEOS O ARCHIVOS DE SUBTITULOS
import VideoPlayer from './components/videoplayer';

// Map to store subtitle content by episode
const subtitleMap = {
  'episode1': subtitleStrings,
  'episode2': secondsubtitleStrings
};

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