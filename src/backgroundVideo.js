/*!
 * backgroundVideo v2.0.0
 * https://github.com/linnett/backgroundVideo
 * Use HTML5 video to create an effect like the CSS property, 'background-size: cover'. Includes parallax option.
 *
 * Copyright 2016 Sam Linnett <linnettsam@gmail.com>
 * @license http://www.opensource.org/licenses/mit-license.html MIT License
 */

(function(root, factory) {
  const pluginName = 'BackgroundVideo';

  if (typeof define === 'function' && define.amd) {
    define([], factory(pluginName));
  } else if (typeof exports === 'object') {
    module.exports = factory(pluginName);
  } else {
    root[pluginName] = factory(pluginName);
  }
}(this, function(pluginName) {
  'use strict';

  /**
   * Default options
   */
  const defaults = {
    parallax: {
      effect: 1.5
    },
    pauseVideoOnViewLoss: false,
    preventContextMenu: false,
    minimumVideoWidth: 400
  };

  /**
   * Some private helper function
   */
  const addClass = function (el, className) {
    if (el.classList) {
      el.classList.add(className);
    }
    else {
      el.className += ' ' + className;
    }
  };

  /**
   * @class Plugin
   *
   * BackgroundVideo class
   */
  class Plugin {
    /**
     * Class constructor method
     *
     * @method constructor
     * @params {object} options - object passed in to override default class options
     */
    constructor(element, options) {
      this.element = document.querySelectorAll(element);
      this.options = Object.assign({}, defaults, options);

      // Set browser prefix option
      this.options.browserPrexix = this.detectBrowser();
      // Ensure requestAnimationFrame is available
      this.shimRequestAnimationFrame();
      // Detect 3d transforms
      this.options.has3d = this.detect3d();
      // Loop through each video and init

      for(let i = 0; i < this.element.length; i++) {
        this.init(this.element[i], i);
      }
    }

    /**
     * Init the plugin
     *
     * @method init
     * @params element
     * @params {number} iteration
     */
    init(element, iteration) {
      this.el = element;
      this.playEvent = this.videoReadyCallback.bind(this);

      this.setVideoWrap(iteration);
      this.setVideoProperties()
      this.insertVideos();

      // Add event listener to detect when the video can play through
      this.el.addEventListener('canplaythrough', this.playEvent, false);
      // If video is cached, the video will already be ready so
      // canplay/canplaythrough event will not fire.
      if (this.el.readyState > 3) {
        this.videoReadyCallback();
      };

      // Prevent context menu on right click for object
      if (this.options.preventContextMenu) {
        // this.el.addEventListener('contextmenu', () => return false);
      }
    }

    /**
     * Function is triggered when the video is ready to be played
     *
     * @method videoReadyCallback
     */
    videoReadyCallback() {
      // Prevent event from being repeatedly called
      this.el.removeEventListener('canplaythrough', this.playEvent, false);

      // Set original video height and width for resize and initial calculations
      this.options.originalVideoW = this.el.videoWidth;
      this.options.originalVideoH = this.el.videoHeight;

      // Bind events for scroll, reize and parallax
      this.bindEvents();
      // Request first tick
      this.requestTick();
    }

    bindEvents() {
      this.ticking = false;

      if (this.options.parallax) {
        window.addEventListener('scroll', this.requestTick.bind(this));
      }

      window.addEventListener('resize', this.requestTick.bind(this));
    }

    updatePosition() {
      this.positionObject();
      this.ticking = false;
    }

    requestTick() {
      if (!this.ticking) {
        window.requestAnimationFrame(this.updatePosition.bind(this));
        this.ticking = true;
      }
    }

    positionObject() {
      const scrollPos = window.pageYOffset;
      let {xPos, yPos} = this.scaleObject();

      // Check for parallax
      if (this.options.parallax) {
        // Prevent parallax when scroll position is negative to the window
        if (scrollPos >= 0) {
          yPos = this.calculateYPos(yPos, scrollPos);
        } else {
          yPos = this.calculateYPos(yPos, 0);
        }
      } else {
        yPos = -yPos;
      }

      const transformStyle = (this.options.has3d) ? `translate3d(-${xPos}px, ${yPos}px, 0)` : `translate(-${xPos}px, ${yPos}px)`;
      // Style with prefix
      this.el.style[`${this.options.browserPrexix}transform`] = transformStyle;
      // Style without prefix
      this.el.style.transform = transformStyle;
    }

    scaleObject() {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const heightScale = windowWidth / this.options.originalVideoW;
      const widthScale = windowHeight / this.options.originalVideoH;
      let scaleFactor;

      console.log(heightScale, widthScale)

      this.options.bvVideoWrap.style.width = `${windowWidth}px`;
      this.options.bvVideoWrap.style.height = `${windowHeight}px`;

      scaleFactor = heightScale > widthScale ? heightScale : widthScale;

      if (scaleFactor * this.options.originalVideoW < this.options.minimumVideoWidth) {
       scaleFactor = this.options.minimumVideoWidth / this.options.originalVideoW;
      }

      const videoWidth = scaleFactor * this.options.originalVideoW;
      const videoHeight = scaleFactor * this.options.originalVideoH;


      this.el.style.width = `${videoWidth}px`;
      this.el.style.height = `${videoHeight}px`;

      return {
       // Return x and y axis values for positioning
       xPos: -(parseInt(this.el.style.width - windowWidth / 2)),
       yPos: parseInt(this.el.style.height - windowHeight) / 2
      };
    }

    calculateYPos(yPos, scrollPos) {
      const videoPosition = parseInt(this.options.bvVideoWrap.offsetTop);
      const videoOffset = videoPosition - scrollPos;
      console.log(scrollPos);
      yPos = -((videoOffset / this.options.parallax.effect) + yPos);

      return yPos;
    }

    /**
     * Create a container around the video tag
     *
     * @method setVideoWrap
     */
    setVideoWrap(iteration) {
      const wrapper = document.createElement('div');

      // Set video wrap class for later use in calculations
      this.options.bvVideoWrapClass = `bv-video-wrap-${iteration}`;

      addClass(wrapper, 'bv-video-wrap');
      addClass(wrapper, this.options.bvVideoWrapClass);

      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'hidden';
      wrapper.style.zIndex = '10';

      this.el.parentNode.insertBefore(wrapper, this.el);
      wrapper.appendChild(this.el);

      // Set wrapper element for class wide use
      this.options.bvVideoWrap = document.querySelector(`.${this.options.bvVideoWrapClass}`);
    }

    /**
     * Set attributes and styles for video
     *
     * @method setVideoProperties
     */
    setVideoProperties() {
      this.el.setAttribute('preload', 'metadata');
      this.el.setAttribute('loop', 'true');
      this.el.setAttribute('autoplay', 'true');
      this.el.style.position = 'absolute';
      this.el.style.zIndex = '1';
    }

    /**
     * Insert videos from `src` property defined
     *
     * @method insertVideos
     */
    insertVideos() {
      for(let i = 0; i < this.options.src.length; i++) {
        let videoTypeArr = this.options.src[i].split('.');
        let videoType = videoTypeArr[videoTypeArr.length - 1];

        this.addSourceToVideo(this.options.src[i], `video/${videoType}`);
      }
    }

    /**
     * Insert videos from `src` property defined
     *
     * @method insertVideos
     * @params {string} src - source of the video
     * @params {string} type - type of video
     */
    addSourceToVideo(src, type) {
      const source = document.createElement('source');

      source.src = src;
      source.type = type;

      this.el.appendChild(source);
    }

    /**
     * Detect browser and return browser prefix for CSS
     *
     * @method detectBrowser
     */
    detectBrowser() {
      const val = navigator.userAgent.toLowerCase();
      let browserPrexix;

      if (val.indexOf('chrome') > -1 || val.indexOf('safari') > -1) {
        browserPrexix = '-webkit-';
      } else if (val.indexOf('firefox') > -1) {
        browserPrexix = '-moz-';
      } else if (val.indexOf('MSIE') !== -1 || val.indexOf('Trident/') > 0) {
        browserPrexix = '-ms-';
      } else if (val.indexOf('Opera') > -1) {
        browserPrexix = '-o-';
      }

      return browserPrexix;
    }

    /**
     * Shim requestAnimationFrame to ensure it is available to all browsers
     *
     * @method shimRequestAnimationFrame
     */
    shimRequestAnimationFrame() {
      /* Paul Irish rAF.js: https://gist.github.com/paulirish/1579671 */
      var lastTime = 0;
      var vendors = ['ms', 'moz', 'webkit', 'o'];

      for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
      }

      if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
          var currTime = new Date().getTime();
          var timeToCall = Math.max(0, 16 - (currTime - lastTime));
          var id = window.setTimeout(function() { callback(currTime + timeToCall); },
            timeToCall);
          lastTime = currTime + timeToCall;
          return id;
        };

      if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
          clearTimeout(id);
        };
    }

    /**
     * Detect if 3D transforms are avilable in the browser
     *
     * @method detect3d
     */
    detect3d() {
      var el = document.createElement('p'),
        t, has3d,
        transforms = {
          'WebkitTransform': '-webkit-transform',
          'OTransform': '-o-transform',
          'MSTransform': '-ms-transform',
          'MozTransform': '-moz-transform',
          'transform': 'transform'
        };

      document.body.insertBefore(el, document.body.lastChild);

      for (t in transforms) {
        if (el.style[t] !== undefined) {
          el.style[t] = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
          has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
        }
      }

      el.parentNode.removeChild(el);

      if (has3d !== undefined) {
        return has3d !== 'none';
      } else {
        return false;
      }
    }

  }


  // Add lightweight jQuery wrapper, if available
  if (window.jQuery) {
    const $ = window.jQuery;

    $.fn[pluginName] = function(options) {
      options = options || {};

      return this.each(function() {
        // add plugin to element data
        if (!$.data(this, 'plugin_' + pluginName)) {
          options.element = this;
          $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
        }
      });
    };
  }


  return Plugin;
}));
