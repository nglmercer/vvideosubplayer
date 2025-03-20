/**
 * Subtitle Converter Utility for ASS and SSA formats
 * Note: This is a basic implementation to handle ASS to WebVTT conversion
 * For production use, consider a more robust library
 */

/**
 * Converts ASS/SSA format to WebVTT format (which browsers support natively)
 * @param {string} assContent - The ASS subtitle content
 * @return {string} - WebVTT formatted subtitle content
 */
export function assToVtt(assContent) {
    // Initialize WebVTT content
    let vttContent = 'WEBVTT\n\n';
    
    // Split content by lines
    const lines = assContent.split('\n');
    
    // Find the [Events] section
    const eventsIndex = lines.findIndex(line => line.trim() === '[Events]');
    if (eventsIndex === -1) return vttContent; // No events section found
    
    // Find the Format line
    const formatIndex = lines.findIndex((line, index) => 
      index > eventsIndex && line.trim().startsWith('Format:')
    );
    if (formatIndex === -1) return vttContent; // No format line found
    
    // Parse format specification
    const formatSpec = lines[formatIndex].substring(7).split(',').map(s => s.trim());
    const startIndex = formatSpec.indexOf('Start');
    const endIndex = formatSpec.indexOf('End');
    const textIndex = formatSpec.indexOf('Text');
    
    if (startIndex === -1 || endIndex === -1 || textIndex === -1) return vttContent;
    
    // Process dialogue lines
    for (let i = formatIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Dialogue:')) {
        const parts = splitDialogueParts(line.substring(9));
        
        if (parts.length <= Math.max(startIndex, endIndex, textIndex)) continue;
        
        const start = convertAssTimeToVtt(parts[startIndex]);
        const end = convertAssTimeToVtt(parts[endIndex]);
        let text = parts[textIndex];
        
        // Basic ASS tag cleaning (remove common ASS formatting tags)
        text = text.replace(/{\\[^}]*}/g, '');
        
        // Add cue to VTT
        vttContent += `${start} --> ${end}\n${text}\n\n`;
      }
    }
    
    return vttContent;
  }
  
  /**
   * Split dialogue line parts respecting comma within braces
   */
  function splitDialogueParts(dialogueLine) {
    const parts = [];
    let current = '';
    let inBraces = false;
    
    for (let i = 0; i < dialogueLine.length; i++) {
      const char = dialogueLine[i];
      
      if (char === '{') inBraces = true;
      else if (char === '}') inBraces = false;
      
      if (char === ',' && !inBraces) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) parts.push(current.trim());
    return parts;
  }
  
  /**
   * Convert ASS time format (H:MM:SS.CC) to WebVTT format (HH:MM:SS.MMM)
   */
  function convertAssTimeToVtt(assTime) {
    // Parse ASS time format
    const timeParts = assTime.split(':');
    if (timeParts.length !== 3) return '00:00:00.000';
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1].padStart(2, '0');
    
    // Handle seconds and centiseconds
    const secParts = timeParts[2].split('.');
    const seconds = secParts[0].padStart(2, '0');
    
    // Convert centiseconds to milliseconds (multiply by 10)
    const centiseconds = secParts.length > 1 ? secParts[1] : '0';
    const milliseconds = (parseInt(centiseconds, 10) * 10).toString().padStart(3, '0');
    
    // Format in WebVTT time format
    return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}.${milliseconds}`;
  }
  
  /**
   * Load ASS subtitles and convert them to VTT format that browsers can use
   * @param {string} url - URL to the ASS subtitle file
   * @return {Promise<string>} - Promise resolving to WebVTT content
   */
  export async function loadAssSubtitles(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
      
      const assContent = await response.text();
      return assToVtt(assContent);
    } catch (error) {
      console.error('Failed to load or convert ASS subtitles:', error);
      return 'WEBVTT\n\n'; // Return empty VTT if there's an error
    }
  }
  
  /**
   * Create a Blob URL for VTT content
   * @param {string} vttContent - WebVTT content
   * @return {string} - Blob URL that can be used in track element
   */
  export function createVttBlob(vttContent) {
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  }