import { VideoPlayer } from '/src/components/mvideoplayer';

// Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const localUrl = "http://localhost:3000/api/m3u8/";
  const m3u8Url = `${localUrl}mdkepisode1.mp4`;
  const video = document.querySelector("video");
  const player = new VideoPlayer(video, m3u8Url);
  player.initialize();
});