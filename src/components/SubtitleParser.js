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

  export class ASSParser extends BaseSubtitleParser {
    /**
     * Parse ASS subtitle file content
     * @param {string} content - The ASS file content
     * @param {Object} options - Parser options
     * @param {boolean} options.preserveFormatting - Whether to preserve formatting codes
     * @returns {Object} - Object containing subtitles array and metadata
     */
    static parse(content, options = { preserveFormatting: false }) {
      const subtitles = [];
      const metadata = {
        styles: {},
        scriptInfo: {}
      };
      
      const lines = content.replace(/\r\n/g, '\n').split('\n');
      
      let currentSection = '';
      let formatLine = '';
      let formatParts = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') continue;
        
        // Check if this line is a section header
        if (line.startsWith('[') && line.endsWith(']')) {
          currentSection = line;
          continue;
        }
        
        // Process based on current section
        switch (currentSection) {
          case '[Script Info]':
            if (line.includes(':')) {
              const [key, value] = line.split(':', 2);
              metadata.scriptInfo[key.trim()] = value.trim();
            }
            break;
            
          case '[V4+ Styles]':
          case '[V4 Styles]':
            if (line.startsWith('Style:')) {
              const styleData = line.substring(6).split(',');
              if (styleData.length > 0) {
                const styleName = styleData[0].trim();
                metadata.styles[styleName] = this.parseStyleLine(line, formatParts);
              }
            } else if (line.startsWith('Format:')) {
              formatParts = line.substring(7).split(',').map(part => part.trim());
            }
            break;
            
          case '[Events]':
            if (line.startsWith('Format:')) {
              formatLine = line;
              formatParts = formatLine.substring(7).split(',').map(part => part.trim());
            } else if (line.startsWith('Dialogue:')) {
              const dialogueData = this.parseDialogueLine(line, formatParts);
              
              if (dialogueData) {
                const { startTime, endTime, text, style, rawText } = dialogueData;
                
                const subtitle = {
                  startTime,
                  endTime,
                  text: options.preserveFormatting ? rawText : text,
                  style
                };
                
                // Add formatting information if preserved
                if (options.preserveFormatting) {
                  subtitle.formattedText = this.parseFormattingCodes(rawText);
                }
                
                subtitles.push(subtitle);
              }
            }
            break;
        }
      }
      
      // Get the basic metadata from the base class
      const baseMetadata = this.getSubtitlesWithMetadata(subtitles, 'ass');
      
      // Merge the ASS-specific metadata with the base metadata
      baseMetadata.assMetadata = metadata;
      
      return baseMetadata;
    }
    
    /**
     * Parse a dialogue line properly handling the text field that might contain commas
     * @param {string} line - The dialogue line
     * @param {Array} formatParts - Array of format parts
     * @returns {Object|null} - Object containing start time, end time, and text
     */
    static parseDialogueLine(line, formatParts) {
      // Find the indices for important fields
      const startIndex = formatParts.indexOf('Start');
      const endIndex = formatParts.indexOf('End');
      const textIndex = formatParts.indexOf('Text');
      const styleIndex = formatParts.indexOf('Style');
      
      if (startIndex === -1 || endIndex === -1 || textIndex === -1) {
        return null;
      }
      
      // Better approach to handle text with commas
      // Count the number of commas before the text field
      const commasBeforeText = textIndex;
      
      // Find the position of the text field by counting commas
      let position = 10; // After "Dialogue: "
      let commaCount = 0;
      
      while (commaCount < commasBeforeText && position < line.length) {
        if (line[position] === ',') {
          commaCount++;
        }
        position++;
      }
      
      // Get the parts we need
      const startTime = this.timeToSeconds(line.substring(10, line.indexOf(',', 10)).trim());
      
      // Find the end time by using the proper offset
      const endTimeStart = line.indexOf(',', 10) + 1;
      const endTime = this.timeToSeconds(line.substring(endTimeStart, line.indexOf(',', endTimeStart)).trim());
      
      // Get the style if available
      let style = 'Default';
      if (styleIndex !== -1) {
        // Similar approach to get the style
        let stylePosition = 10;
        let styleCommaCount = 0;
        
        while (styleCommaCount < styleIndex && stylePosition < line.length) {
          if (line[stylePosition] === ',') {
            styleCommaCount++;
          }
          stylePosition++;
        }
        
        const styleEnd = line.indexOf(',', stylePosition);
        if (styleEnd !== -1) {
          style = line.substring(stylePosition, styleEnd).trim();
        }
      }
      
      // Get the raw text (everything after the text position)
      const rawText = line.substring(position).trim();
      
      // Remove ASS formatting codes for the clean text
      const text = this.removeASSFormatting(rawText);
      
      return {
        startTime,
        endTime,
        text,
        rawText,
        style
      };
    }
    
    /**
     * Parse a style line
     * @param {string} line - The style line
     * @param {Array} formatParts - Array of format parts
     * @returns {Object} - Style object
     */
    static parseStyleLine(line, formatParts) {
      const styleParts = line.substring(6).split(',');
      const style = {};
      
      if (formatParts.length > 0) {
        formatParts.forEach((part, index) => {
          if (index < styleParts.length) {
            style[part] = styleParts[index].trim();
          }
        });
      } else {
        // Default style properties if format is not specified
        if (styleParts.length >= 2) style.Name = styleParts[0].trim();
        if (styleParts.length >= 3) style.Fontname = styleParts[1].trim();
        if (styleParts.length >= 4) style.Fontsize = styleParts[2].trim();
        // Add more default mappings as needed
      }
      
      return style;
    }
    
    /**
     * Parse ASS formatting codes into a structured format
     * @param {string} text - Text with ASS formatting
     * @returns {Array} - Array of text segments with formatting
     */
    static parseFormattingCodes(text) {
      const segments = [];
      let currentText = '';
      let currentFormatting = {};
      
      // Simple regex to find formatting codes
      const formatRegex = /{([^}]*)}/g;
      let lastIndex = 0;
      let match;
      
      while ((match = formatRegex.exec(text)) !== null) {
        // Add the text before this formatting code
        if (match.index > lastIndex) {
          const textSegment = text.substring(lastIndex, match.index);
          if (textSegment) {
            segments.push({
              text: textSegment,
              formatting: { ...currentFormatting }
            });
          }
        }
        
        // Process formatting codes
        const formatCodes = match[1];
        const updatedFormatting = this.parseFormatCodes(formatCodes, currentFormatting);
        currentFormatting = updatedFormatting;
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add the remaining text
      if (lastIndex < text.length) {
        segments.push({
          text: text.substring(lastIndex),
          formatting: { ...currentFormatting }
        });
      }
      
      return segments;
    }
    
    /**
     * Parse individual format codes
     * @param {string} formatCodes - The format codes string
     * @param {Object} currentFormatting - Current formatting state
     * @returns {Object} - Updated formatting state
     */
    static parseFormatCodes(formatCodes, currentFormatting = {}) {
      const formatting = { ...currentFormatting };
      
      // Split by backslash but keep the backslash with the code
      const codes = formatCodes.split('\\').filter(code => code.trim() !== '');
      
      codes.forEach(code => {
        if (!code.startsWith('\\')) code = '\\' + code;
        
        // Bold
        if (code.startsWith('\\b')) {
          formatting.bold = code.substring(2) === '1';
        }
        // Italic
        else if (code.startsWith('\\i')) {
          formatting.italic = code.substring(2) === '1';
        }
        // Underline
        else if (code.startsWith('\\u')) {
          formatting.underline = code.substring(2) === '1';
        }
        // Color
        else if (code.startsWith('\\c')) {
          const colorMatch = code.match(/\\c&H([0-9A-Fa-f]{6})&/);
          if (colorMatch) {
            formatting.color = `#${colorMatch[1]}`;
          }
        }
        // Font size
        else if (code.startsWith('\\fs')) {
          const sizeMatch = code.match(/\\fs(\d+)/);
          if (sizeMatch) {
            formatting.fontSize = parseInt(sizeMatch[1], 10);
          }
        }
        // Add more formatting codes as needed
      });
      
      return formatting;
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
      text = text.replace(/\\p[\d]+[\s\S]*?\\p0/g, '');
      
      // Replace hard line breaks with actual line breaks
      text = text.replace(/\\N/g, '\n');
      text = text.replace(/\\n/g, '\n');
      
      // Remove other escaped characters
      text = text.replace(/\\h/g, ' ');
      
      return text.trim();
    }
    
    /**
     * Get subtitles as an array of objects for easier manipulation
     * @param {string} content - The ASS file content
     * @param {Object} options - Parser options
     * @returns {Array} - Array of subtitle objects with additional properties
     */
    static parseToArray(content, options = { preserveFormatting: false }) {
      const result = this.parse(content, options);
      return this.toArray(result.subtitles);
    }
    
    /**
     * Convert an array of subtitle objects to an ASS file content
     * @param {Array} subtitles - Array of subtitle objects
     * @param {Object} metadata - Metadata object
     * @returns {string} - ASS file content
     */
    static toASSContent(subtitles, metadata = {}) {
      let content = '';
      
      // Add Script Info section
      content += '[Script Info]\n';
      content += 'Title: Generated ASS file\n';
      content += 'ScriptType: v4.00+\n';
      content += 'WrapStyle: 0\n';
      content += 'PlayResX: 1280\n';
      content += 'PlayResY: 720\n\n';
      
      // Add Styles section
      content += '[V4+ Styles]\n';
      content += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
      content += 'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n';
      
      // Add Events section
      content += '[Events]\n';
      content += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
      
      // Add dialogue lines
      subtitles.forEach(subtitle => {
        const startTime = this.secondsToTime(subtitle.startTime);
        const endTime = this.secondsToTime(subtitle.endTime);
        const text = subtitle.text || '';
        const style = subtitle.style || 'Default';
        
        content += `Dialogue: 0,${startTime},${endTime},${style},,0,0,0,,${text}\n`;
      });
      
      return content;
    }
    
    /**
     * Convert seconds to ASS time format
     * @param {number} seconds - Time in seconds
     * @returns {string} - Time in h:mm:ss.cc format
     */
    static secondsToTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      
      return `${h}:${m.toString().padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
    }
  }
  
  // Default export for backward compatibility
  export default {
    SRTParser,
    ASSParser
  };