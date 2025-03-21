/*! videojs-ass
 * Copyright (c) 2014 Sunny Li
 * Licensed under the Apache-2.0 license. */

export default function registerAssPlugin(videojs) {
  'use strict';

  if (!videojs) {
    throw new Error('Video.js must be provided to videojs-ass plugin');
  }


  const Plugin = videojs.getPlugin('plugin');

  class AssPlugin extends Plugin {
    constructor(player, options) {
      super(player, options || {}); // Default to empty object if options is undefined
    
      // Store options explicitly to ensure this.options_ is set
      this.options_ = videojs.mergeOptions({}, options);
    
      if (!this.options_.src) {
        console.warn('No subtitle source provided; ASS plugin will not load subtitles.');
        return;
      }
    
      this.curId = 0;
      this.idCount = 0;
      this.overlay = videojs.dom.createEl('div', {
        className: 'vjs-ass'
      });
      this.clocks = [];
      this.clockRate = this.options_.rate || 1;
      this.delay = this.options_.delay || 0;
      this.renderers = [];
      this.rendererSettings = null;
      this.assTrackIdMap = {};
      this.tracks = player.textTracks();
      this.isTrackSwitching = false;
    
      this.overlayComponent = player.addChild('Component', {
        name: 'AssOverlay',
        el: this.overlay
      }, 3);
    
      this.initializeClock();
      this.setupEventListeners();
      this.loadSubtitles(this.options_);
    }

    initializeClock() {
      this.clocks[this.curId] = new libjass.renderers.AutoClock(
        () => this.player.currentTime() - this.delay,
        500
      );
    }

    setupEventListeners() {
      this.player.on('play', () => this.clocks[this.curId].play());
      this.player.on('pause', () => this.clocks[this.curId].pause());
      this.player.on('seeking', () => this.clocks[this.curId].seeking());
      this.player.on('ratechange', () => {
        this.clocks[this.curId].setRate(this.player.playbackRate() * this.clockRate);
      });

      const updateDisplayArea = videojs.bind(this, this.updateDisplayArea);
      window.addEventListener('resize', updateDisplayArea);
      this.player.on(['loadedmetadata', 'resize', 'fullscreenchange'], updateDisplayArea);

      this.player.on('dispose', () => {
        this.clocks.forEach(clock => clock && clock.disable());
        window.removeEventListener('resize', updateDisplayArea);
      });

      this.tracks.on('change', this.handleTrackChange.bind(this));
    }

    updateDisplayArea() {
      setTimeout(() => {
        const videoWidth = this.options_.videoWidth || this.player.videoWidth() || this.player.el().offsetWidth;
        const videoHeight = this.options_.videoHeight || this.player.videoHeight() || this.player.el().offsetHeight;
        const videoOffsetWidth = this.player.el().offsetWidth;
        const videoOffsetHeight = this.player.el().offsetHeight;

        const ratio = Math.min(videoOffsetWidth / videoWidth, videoOffsetHeight / videoHeight);
        const subsWrapperWidth = videoWidth * ratio;
        const subsWrapperHeight = videoHeight * ratio;
        const subsWrapperLeft = (videoOffsetWidth - subsWrapperWidth) / 2;
        const subsWrapperTop = (videoOffsetHeight - subsWrapperHeight) / 2;

        if (this.renderers[this.curId]) {
          this.renderers[this.curId].resize(subsWrapperWidth, subsWrapperHeight, subsWrapperLeft, subsWrapperTop);
        }
      }, 100);
    }

    handleTrackChange() {
      if (this.isTrackSwitching) return;

      const activeTrack = this.tracks.tracks_.find(track => track.mode === 'showing');
      this.overlay.style.display = activeTrack ? '' : 'none';
      if (activeTrack) {
        this.switchTrackTo(this.assTrackIdMap[activeTrack.language + activeTrack.label]);
      }
    }

    loadSubtitles(options) {
      this.rendererSettings = new libjass.renderers.RendererSettings();

      if (options.hasOwnProperty('enableSvg')) {
        this.rendererSettings.enableSvg = options.enableSvg;
      }
      if (options.hasOwnProperty('fontMap')) {
        this.rendererSettings.fontMap = new libjass.Map(options.fontMap);
      } else if (options.hasOwnProperty('fontMapById')) {
        this.rendererSettings.fontMap = libjass.renderers.RendererSettings
          .makeFontMapFromStyleElement(document.getElementById(options.fontMapById));
      }

      libjass.ASS.fromUrl(options.src, libjass.Format.ASS).then(ass => {
        this.addTrack(options.src, {
          label: options.label,
          srclang: options.srclang,
          switchImmediately: true
        });
        this.renderers[this.curId] = new libjass.renderers.WebRenderer(
          ass,
          this.clocks[this.curId],
          this.overlay,
          this.rendererSettings
        );
      }).catch(error => {
        console.error('Error loading ASS subtitles:', error);
      });
    }

    addTrack(url, opts) {
      const newTrack = this.player.addRemoteTextTrack({
        src: "",
        kind: 'subtitles',
        label: opts.label || `ASS #${this.curId}`,
        srclang: opts.srclang || `vjs-ass-${this.curId}`,
        default: opts.switchImmediately
      }, false).track;

      this.assTrackIdMap[newTrack.srclang + newTrack.label] = this.curId;

      if (!opts.switchImmediately) {
        this.tracks.tracks_.forEach(track => {
          if (track.mode === "showing") track.mode = "showing";
        });
        return;
      }

      this.isTrackSwitching = true;
      this.tracks.tracks_.forEach(track => {
        if (track.label === newTrack.label && track.language === newTrack.srclang) {
          if (track.mode !== "showing") track.mode = "showing";
        } else if (track.mode === "showing") {
          track.mode = "disabled";
        }
      });
      this.isTrackSwitching = false;
    }

    switchTrackTo(selectedTrackId) {
      if (this.renderers[this.curId]) {
        this.renderers[this.curId]._removeAllSubs();
        this.renderers[this.curId]._preRenderedSubs.clear();
        this.renderers[this.curId].clock.disable();
      }

      this.curId = selectedTrackId;
      if (this.curId === undefined) return;

      this.renderers[this.curId].clock.enable();
      this.updateDisplayArea();
      this.clocks[this.curId].play();
    }

    loadNewSubtitle(url, label, srclang, switchImmediately) {
      const oldId = this.curId;
      if (switchImmediately && this.renderers[this.curId]) {
        this.renderers[this.curId].removeAllSubtitles(); // Replace with actual method
        this.renderers[this.curId]._preRenderedSubs?.clear();
        this.renderers[this.curId].clock.disable();
      }
    
      return libjass.ASS.fromUrl(url, libjass.Format.ASS).then(ass => {
        this.curId = ++this.idCount;
        this.clocks[this.curId] = new libjass.renderers.AutoClock(
          () => this.player.currentTime() - this.delay,
          500
        );
        this.renderers[this.curId] = new libjass.renderers.WebRenderer(
          ass,
          this.clocks[this.curId],
          this.overlay,
          this.rendererSettings
        );
        this.updateDisplayArea();
    
        if (!switchImmediately) {
          this.renderers[this.curId].removeAllSubtitles(); // Replace with actual method
          this.renderers[this.curId]._preRenderedSubs?.clear();
          this.renderers[this.curId].clock.disable();
        } else {
          this.clocks[this.curId].play();
        }
    
        this.addTrack(url, { label, srclang, switchImmediately });
    
        if (!switchImmediately) {
          this.curId = oldId;
        }
      }).catch(error => {
        console.error('Error loading new subtitle:', error);
        throw error;
      });
    }
  }

  videojs.registerPlugin('ass', AssPlugin);
}