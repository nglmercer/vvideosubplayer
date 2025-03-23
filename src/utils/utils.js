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
  function safeParse(value) {
    try {
        // Si ya es un array u objeto, lo devolvemos tal cual
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return value;
        }
  
        // Si es un string que empieza con { o [, intentamos parsearlo
        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            try {
                return JSON.parse(value); // Intento normal
            } catch (error) {
                // Si falla, intentamos corregirlo
                const fixedJson = value
                    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // Poner comillas en claves
                    .replace(/:\s*'([^']+)'/g, ': "$1"'); // Reemplazar comillas simples por dobles en valores
  
                return JSON.parse(fixedJson); // Reintento con JSON corregido
            }
        }
  
        // Si es otro tipo de dato (número, booleano, etc.), lo devolvemos sin cambios
        return value;
    } catch (error) {
        console.error("Error al parsear JSON:", error, "Valor recibido:", value);
        return value; // Retorna el valor original si no se puede parsear
    }
  }
  export { fetchSubtitles, safeParse };