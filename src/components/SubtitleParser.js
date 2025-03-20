/**
 * Subtitle Parser
 * A unified parser for different subtitle formats (SRT and ASS)
 */

/**
 * Base class for subtitle parsers with shared functionality
 */
class BaseSubtitleParser {
    /**
     * Convert time format to seconds
     * This is a generic method that will be overridden by specific parsers
     * @param {string} timeString - Time string in format specific to subtitle type
     * @returns {number} - Time in seconds
     */
    static timeToSeconds(timeString) {
      return 0; // To be overridden by child classes
    }
    
    /**
     * Sort subtitles by start time
     * @param {Array} subtitles - Array of subtitle objects
     * @returns {Array} - Sorted array of subtitle objects
     */
    static sortSubtitles(subtitles) {
      return subtitles.sort((a, b) => a.startTime - b.startTime);
    }
    
    /**
     * Get subtitles as an array of objects with additional metadata
     * @param {Array} subtitles - Array of subtitle objects
     * @param {string} format - Subtitle format (srt, ass, etc.)
     * @returns {Object} - Object with subtitles array and metadata
     */
    static getSubtitlesWithMetadata(subtitles, format) {
      // Sort subtitles first to ensure correct order
      const sortedSubtitles = this.sortSubtitles(subtitles);
      
      // Calculate total duration based on the last subtitle's end time
      const lastSubtitle = sortedSubtitles.length > 0 ? sortedSubtitles[sortedSubtitles.length - 1] : null;
      const totalDuration = lastSubtitle ? lastSubtitle.endTime : 0;
      
      // Calculate average subtitle duration
      let totalSubtitleDuration = 0;
      sortedSubtitles.forEach(sub => {
        totalSubtitleDuration += (sub.endTime - sub.startTime);
      });
      const averageDuration = sortedSubtitles.length > 0 ? totalSubtitleDuration / sortedSubtitles.length : 0;
      
      return {
        subtitles: sortedSubtitles,
        format: format,
        count: sortedSubtitles.length,
        metadata: {
          totalDuration: totalDuration,
          averageDuration: averageDuration.toFixed(2) * 1, // Convert to number with 2 decimal precision
          firstSubtitleAt: sortedSubtitles.length > 0 ? sortedSubtitles[0].startTime : 0,
          lastSubtitleAt: lastSubtitle ? lastSubtitle.startTime : 0
        }
      };
    }
    
    /**
     * Convert subtitles to an array of objects for easier manipulation
     * @param {Array} subtitles - Array of subtitle objects
     * @returns {Array} - Array of subtitle objects with additional properties
     */
    static toArray(subtitles) {
      return subtitles.map((subtitle, index) => ({
        ...subtitle,
        index: index,
        duration: subtitle.endTime - subtitle.startTime
      }));
    }
  }
  
  /**
   * SRT Subtitle Parser
   * Parses SubRip Text (SRT) subtitle format
   */
  export class SRTParser extends BaseSubtitleParser {
    /**
     * Parse SRT subtitle file content
     * @param {string} content - The SRT file content
     * @returns {Object} - Object containing subtitles array and metadata
     */
    static parse(content) {
      const subtitles = [];
      // Split by double newline but handle different line endings
      const blocks = content.replace(/\r\n/g, '\n').trim().split('\n\n');
      
      blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
          // Skip the subtitle number (lines[0])
          const timecodes = lines[1].split(' --> ');
          if (timecodes.length === 2) {
            const startTime = this.timeToSeconds(timecodes[0]);
            const endTime = this.timeToSeconds(timecodes[1]);
            const text = lines.slice(2).join('\n');
            
            subtitles.push({
              startTime,
              endTime,
              text
            });
          }
        }
      });
      
      // Return an object with the sorted subtitles and metadata using the base class method
      return this.getSubtitlesWithMetadata(subtitles, 'srt');
    }
    
    /**
     * Get subtitles as an array of objects for easier manipulation
     * @param {string} content - The SRT file content
     * @returns {Array} - Array of subtitle objects with additional properties
     */
    static parseToArray(content) {
      const result = this.parse(content);
      return this.toArray(result.subtitles);
    }
    
    /**
     * Convert SRT time format to seconds
     * @param {string} timeString - Time in hh:mm:ss,ms format
     * @returns {number} - Time in seconds
     */
    static timeToSeconds(timeString) {
      const parts = timeString.trim().split(':');
      if (parts.length === 3) {
        const [hours, minutes, secondsWithMs] = parts;
        // Properly handle milliseconds by replacing comma with period
        const seconds = secondsWithMs.replace(',', '.');
        // Use parseFloat to correctly handle decimal seconds
        return (parseInt(hours, 10) * 3600) + 
               (parseInt(minutes, 10) * 60) + 
               parseFloat(seconds);
      }
      return 0;
    }
  }
  
  /**
   * ASS Subtitle Parser
   * Parses Advanced SubStation Alpha (ASS) subtitle format
   */
  export class ASSParser extends BaseSubtitleParser {
    /**
     * Parse ASS subtitle file content
     * @param {string} content - The ASS file content
     * @returns {Object} - Object containing subtitles array and metadata
     */
    static parse(content) {
      const subtitles = [];
      const lines = content.replace(/\r\n/g, '\n').split('\n');
      
      // Find the [Events] section
      let eventsSection = false;
      let formatLine = '';
      let formatParts = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for the [Events] section
        if (line === '[Events]') {
          eventsSection = true;
          continue;
        }
        
        // If we're in the [Events] section
        if (eventsSection) {
          // Get the format line
          if (line.startsWith('Format:')) {
            formatLine = line;
            formatParts = formatLine
              .substring(7)
              .split(',')
              .map(part => part.trim());
            continue;
          }
          
          // Parse dialogue lines
          if (line.startsWith('Dialogue:')) {
            const dialogueParts = line
              .substring(9)
              .split(',')
              .map(part => part.trim());
            
            // Find the indices for start, end, and text
            const startIndex = formatParts.indexOf('Start');
            const endIndex = formatParts.indexOf('End');
            const textIndex = formatParts.indexOf('Text');
            
            if (startIndex !== -1 && endIndex !== -1 && textIndex !== -1 && 
                dialogueParts.length >= Math.max(startIndex, endIndex, textIndex) + 1) {
              // Get start and end times
              const startTime = this.timeToSeconds(dialogueParts[startIndex]);
              const endTime = this.timeToSeconds(dialogueParts[endIndex]);
              
              // Get the text content (everything after the text position)
              let text = dialogueParts.slice(textIndex).join(',');
              
              // Remove ASS formatting codes
              text = this.removeASSFormatting(text);
              
              subtitles.push({
                startTime,
                endTime,
                text
              });
            }
          }
        }
      }
      
      // Return an object with the sorted subtitles and metadata using the base class method
      return this.getSubtitlesWithMetadata(subtitles, 'ass');
    }
    
    /**
     * Get subtitles as an array of objects for easier manipulation
     * @param {string} content - The ASS file content
     * @returns {Array} - Array of subtitle objects with additional properties
     */
    static parseToArray(content) {
      const result = this.parse(content);
      return this.toArray(result.subtitles);
    }
    
    /**
     * Convert ASS time format to seconds
     * @param {string} timeString - Time in h:mm:ss.cc format
     * @returns {number} - Time in seconds
     */
    static timeToSeconds(timeString) {
      const parts = timeString.split(':');
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return (parseInt(hours, 10) * 3600) + 
               (parseInt(minutes, 10) * 60) + 
               parseFloat(seconds);
      }
      return 0;
    }
    
    /**
     * Remove ASS formatting codes from text
     * @param {string} text - Text with ASS formatting
     * @returns {string} - Clean text
     */
    static removeASSFormatting(text) {
      // Remove override blocks {\...}
      text = text.replace(/{[^}]*}/g, '');
      
      // Remove drawing commands
      text = text.replace(/\p[\d]+[\s\S]*?\p0/g, '');
      
      // Replace hard line breaks with actual line breaks
      text = text.replace(/\\N/g, '\n');
      
      // Remove other escaped characters
      text = text.replace(/\\h/g, ' ');
      
      return text.trim();
    }
  }
  
  // Default export for backward compatibility
  export default {
    SRTParser,
    ASSParser
  };