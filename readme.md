# Video Player
install dependencies
```bash
npm install

run the app

npm run dev

```
how use 
```javascript
// Datos de configuración
const config = {
  episode: "episode1", //nombre o id de referencia no es necesario
  videoHD: "  ?resolution=720p", //url de video HD
  videoSD: "  ?resolution=480p", //url de video SD
  subtitle: "http://localhost:3000/api/subs/mdkepisode1.ass", // subtitle url en formato ass o vtt// formato string o data.subtitleFile 
  quality: "hd"// hd o sd
};

// Construir la URL con parámetros codificados
const url = "url de la pagina donde esta el iframe";
const iframeSrc = url + `?episode=${config.episode}&videoHD=${encodeURIComponent(config.videoHD)}&videoSD=${encodeURIComponent(config.videoSD)}&subtitle=${encodeURIComponent(config.subtitle)}&quality=${config.quality}`;

// Crear el elemento iframe
const iframe = document.createElement("iframe");
iframe.src = iframeSrc;
iframe.allowFullscreen = true;

// Añadir el iframe al contenedor
document.querySelector(".player-container").appendChild(iframe);
```