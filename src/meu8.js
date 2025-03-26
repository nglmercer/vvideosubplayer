import { VideoPlayer } from '/src/components/mvideoplayer';

// Inicialización al cargar el DOM
function getURLparams(){
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return {
    capitulo : urlParams.get("capitulo"),
    Authorization: urlParams.get("Authorization")
  }
}
const templaterequest = (params)=> {
  return "https://api.koinima.com/res2/video/master/"+ params.capitulo + "?Authorization=" + params.Authorization;
}
document.addEventListener("DOMContentLoaded", async () => {
//https://api.koinima.com/res2/video/master/64052?Authorization=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDI4NDEzMDQsImV4cCI6MTc0MzcwNTMwNCwiZGF0YSI6eyJpZFVzdWFyaW8iOjYwOCwiYXBvZG9Vc3VhcmlvIjoibWVtZWxzZXIiLCJjb3JyZW9Vc3VhcmlvIjoibmdsbWVyY2VyQGdtYWlsLmNvbSIsInJvbFVzdWFyaW8iOjEsIm5zZndVc3VhcmlvIjp0cnVlLCJmZWNoYUNyZWFjaW9uIjoiMjAyNS0wMy0yMSAyMjozNjoxMiIsImFwaWNvZGUiOm51bGwsImZlY2hhTmFjaW1pZW50byI6bnVsbCwibm9tYnJlcyI6bnVsbCwiYXBlbGxpZG9zIjpudWxsLCJzdGF0ZSI6bnVsbCwiY291bnRyeSI6MCwicGhvbmUiOm51bGwsInByZVJlZ2lzdHJhZG8iOjEsImNyZWFkb3JDb250ZW5pZG8iOjAsImFudGljaXBhZG8iOjAsImZvdG9QZXJmaWxVc3VhcmlvIjpudWxsLCJwbGFuIjp7ImlkUGxhbiI6NCwibm9tYnJlUGxhbiI6IktvaW5pY2x1YiIsInByZWNpb0NlbnRhdm9zIjo0NTAsIm1lc2VzIjoxLCJ0aXBvIjoyfSwiaWRVbHRpbWFUcmFuc2FjY2lvbiI6MTMxLCJmZWNoYVVsdGltYVRyYW5zYWNjaW9uIjpudWxsLCJub21icmVSb2wiOiJVc3VhcmlvIn19.0jUHrUV4c-LDc027Vj7WVRHSlzMV2q0ETip2FgjqrfM
  //https://api.video.koinima.com/
//  const localUrl = "http://localhost:3000/api/m3u8/";
//  const m3u8Url = `${localUrl}mdkepisode1.mp4`;
  const params = getURLparams();
  const urlTofetch = templaterequest(params);
//  const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDI4NzI3ODQsImV4cCI6MTc0MzczNjc4NCwiZGF0YSI6eyJpZFVzdWFyaW8iOjYwOCwiYXBvZG9Vc3VhcmlvIjoibWVtZWxzZXIiLCJjb3JyZW9Vc3VhcmlvIjoibmdsbWVyY2VyQGdtYWlsLmNvbSIsInJvbFVzdWFyaW8iOjEsIm5zZndVc3VhcmlvIjp0cnVlLCJmZWNoYUNyZWFjaW9uIjoiMjAyNS0wMy0yMSAyMjozNjoxMiIsImFwaWNvZGUiOm51bGwsImZlY2hhTmFjaW1pZW50byI6bnVsbCwibm9tYnJlcyI6bnVsbCwiYXBlbGxpZG9zIjpudWxsLCJzdGF0ZSI6bnVsbCwiY291bnRyeSI6MCwicGhvbmUiOm51bGwsInByZVJlZ2lzdHJhZG8iOjEsImNyZWFkb3JDb250ZW5pZG8iOjAsImFudGljaXBhZG8iOjAsImZvdG9QZXJmaWxVc3VhcmlvIjpudWxsLCJwbGFuIjp7ImlkUGxhbiI6NCwibm9tYnJlUGxhbiI6IktvaW5pY2x1YiIsInByZWNpb0NlbnRhdm9zIjo0NTAsIm1lc2VzIjoxLCJ0aXBvIjoyfSwiaWRVbHRpbWFUcmFuc2FjY2lvbiI6MTMxLCJmZWNoYVVsdGltYVRyYW5zYWNjaW9uIjpudWxsLCJub21icmVSb2wiOiJVc3VhcmlvIn19.boL9YWIcBNjaUFMMXm1yNyaBGPM5dA-vuAJrVUzlcIU"
//  const newurl = "https://api.koinima.com/res2/video/master/"
//  const m3u8Url = `${newurl}?capitulo=63916&Authorization=${token}`;
  const video = document.querySelector("video");
  const player = new VideoPlayer(video, urlTofetch);
  player.initialize();
});