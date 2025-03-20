import './style.css';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize video player
  const videoPlayer = new Plyr('#player', {
    controls: [
      'play-large', // The large play button in the center
      'restart', // Restart playback
      'rewind', // Rewind by the seek time (default 10 seconds)
      'play', // Play/pause playback
      'fast-forward', // Fast forward by the seek time (default 10 seconds)
      'progress', // The progress bar and scrubber for playback and buffering
      'current-time', // The current time of playback
      'duration', // The full duration of the media
      'mute', // Toggle mute
      'volume', // Volume control
      'captions', // Toggle captions
      'settings', // Settings menu
      'pip', // Picture-in-picture (currently Safari only)
      'airplay', // Airplay (currently Safari only)
      'fullscreen', // Toggle fullscreen
    ],
    ratio: '16:9',
    tooltips: { controls: true, seek: true },
    seekTime: 10,
  });

  // Initialize audio player
  const audioPlayer = new Plyr('#player-audio', {
    controls: [
      'restart',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
    ],
  });

  // Initialize YouTube player
  const youtubePlayer = new Plyr('#player-youtube', {
    provider: 'youtube',
    autoplay: false,
    muted: false,
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'captions',
      'settings',
      'fullscreen',
    ],
    youtube: {
      playlist: false,
      playsinline: true,
      noCookie: true,
    },
  });

  // Load YouTube video after initialization
  loadYouTube(youtubePlayer, 'bTqVqk7FSmY');

  // Function to load YouTube videos
  function loadYouTube(player, id) {
    player.source = {
      type: 'video',
      sources: [
        {
          src: id,
          provider: 'youtube',
        },
      ],
    };
  }

  // Log when players are ready
  videoPlayer.on('ready', () => console.log('Video player ready'));
  audioPlayer.on('ready', () => console.log('Audio player ready'));
  youtubePlayer.on('ready', () => console.log('YouTube player ready'));

  // Event handling example
  videoPlayer.on('play', () => console.log('Video started playing'));
  audioPlayer.on('play', () => console.log('Audio started playing'));
  youtubePlayer.on('play', () => console.log('YouTube video started playing'));
});