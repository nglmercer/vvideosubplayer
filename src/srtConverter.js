/**
 * SRT to WebVTT Converter Utility
 * Converts SRT subtitle format to WebVTT format for browser compatibility
 */

/**
 * Converts SRT format to WebVTT format
 * @param {string} srtContent - The SRT subtitle content
 * @return {string} - WebVTT formatted subtitle content
 */
export function srtToVtt(srtContent) {
  // Initialize WebVTT content with required header
  let vttContent = 'WEBVTT\n\n';
  
  // Split content by double newline (which separates subtitle entries)
  const entries = srtContent.split(/\r?\n\r?\n/);
  
  // Process each subtitle entry
  for (const entry of entries) {
    if (!entry.trim()) continue;
    
    // Split the entry into lines
    const lines = entry.split(/\r?\n/);
    
    // Skip if there aren't enough lines for a valid entry
    if (lines.length < 3) continue;
    
    // Skip the subtitle number (first line)
    
    // Process the timestamp line (second line)
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/([\d:,]+)\s+-->\s+([\d:,]+)/);
    
    if (!timeMatch) continue;
    
    // Convert SRT timestamps (00:00:00,000) to WebVTT format (00:00:00.000)
    const startTime = timeMatch[1].replace(',', '.');
    const endTime = timeMatch[2].replace(',', '.');
    
    // Get the subtitle text (remaining lines)
    const text = lines.slice(2).join('\n');
    
    // Add the converted entry to VTT content
    vttContent += `${startTime} --> ${endTime}\n${text}\n\n`;
  }
  
  return vttContent;
}

/**
 * Load SRT subtitles and convert them to VTT format that browsers can use
 * @param {string} url - URL to the SRT subtitle file
 * @return {Promise<string>} - Promise resolving to WebVTT content
 */
export async function loadSrtSubtitles(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    
    const srtContent = await response.text();
    return srtToVtt(srtContent);
  } catch (error) {
    console.error('Failed to load or convert SRT subtitles:', error);
    return 'WEBVTT\n\n'; // Return empty VTT if there's an error
  }
}