import './style.css'
import './components/VideoPlayer.css'
import VideoPlayer from './components/VideoPlayer.js'

document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1>Video Player with Quality Selection and Subtitles</h1>
    <div id="video-container"></div>
  </div>
`

// Sample video qualities
const videoQualities = [
  { value: '720p', label: '720p HD', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { value: '480p', label: '480p', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { value: '360p', label: '360p', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
];

// Sample subtitle URLs
// You can switch between SRT and ASS formats for testing
const subtitleUrl = '/subtitles/sample.ass';
// For ASS format testing, uncomment the line below and comment the line above
//const subtitleUrl = '/subtitles/sample.ass';

// Initialize the video player
const videoContainer = document.getElementById('video-container');
const player = new VideoPlayer({
  container: videoContainer,
  videoUrl: videoQualities[0].url,
  subtitleUrl: subtitleUrl,
  qualities: videoQualities,
  defaultQuality: '720p'
});
