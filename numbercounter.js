/*
Copyright (c) 2012 Aaron L'Heureux

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//--------------------------------------------------------------------

jQuery NumberCounter - v0.5

NumberCounter is a small jQuery plugin to facilitate a 'count-up' animation for
numerical statistics

Requirements:
	jQuery >= 1.4 when not using easing (settings.easing = false)
	jQuery >= 1.4 when using easing along with jQuery.easing
	jQuery >= 1.7.2 when using easing without jQuery.easing

Suggested pairings:
	jQuery Waypoints

Changelog:
	v0.5
		- Clarify version requirements
		- Add support for function parameters to be called at specific moments during the execution of the plugin
		- Improve fade in logic
		- Implement current value tracking so it can be passed to registered functions
		- Bug fix from old naming convention
	v0.4
		- Publish to GitHub and begin formal version management. Easing (jQuery 1.7.2 swing/linear or jQuery.easing.1.3.js)
	v0.3
		- Ability to fade in as the animation starts
	v0.2
		- Base functionality.
	v0.1
		- Initial development.
		
Feature plans:
	- Support older versions of the jQuery easing functions from older jQuery versions
	- Expose getters/setters to change settings defined at initial creation

Acknowledgements:
	- requestAnimationFrame polyfill: http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
*/

(function($, window, undefined) {

	//----- polyfill requestAnimationFrame -----
		
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; x++) {
		window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
	}
	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() {
				callback(currTime + timeToCall);
			}, timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		}
	}
	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		}
	}
	
	//----- end polyfill requestAnimationFrame -----
	
	var NumberCounter = function(element, options) {
		var $elem = $(element);
		var obj = this;
		var settings = $.extend({
			       devMode: false,
			      duration: 2000,
			        fadeIn: false,
			    fadeInTime: 300,
			        easing: false,
			easingFunction: 'linear',
			      onUpdate: undefined,
			       onStart: undefined,
			         onEnd: undefined
		}, options || {});
		
		var animationID;
		var startVal, curVal, endVal;
		var startTime = null;
		var precision = 0;
		
		//----- PUBLIC -----
		
		this.updateNumbers = function(st, en) {
			//if input is provided, do the updating for the user
			if (st !== undefined) {
				$elem.attr('data-numbercounter-start', st);
			}
			if (en !== undefined) {
				$elem.text(en);
			}
			
			//if no input is provided, assume something external has changed the appropriate properties
			startVal = $elem.attr('data-numbercounter-start');
			endVal = $elem.text();
			
			checkInputValidityAndSetup();
		};
		
		this.resetCurrentNumbers = function() {
			$elem.text(startVal);
		};
		
		this.startCounter = function() {
			//test if the provided easing function exists, if it does not, reset the easing option to false
			if (settings.easing && jQuery.easing[settings.easingFunction] === undefined) {
				logger('NumberCounter Notice: The provided easing function does not exist, defaulting to no easing.');
				settings.easing = false;
			}
			
			//test if values are the same, if they are, animation is not required
			if (startVal == endVal) {
				logger('NumberCounter Notice: The starting and ending values are the same, no animation will occur.');
				
				if (settings.onStart !== undefined && typeof settings.onStart === 'function') {
					settings.onStart.call($elem);
				}
				
				if (settings.fadeIn) {
					if ($elem.css('display') == 'none') {
						$elem.css('opacity', 0);
						$elem.show();
					}
					$elem.animate({opacity: 1}, settings.fadeInTime, function() {
						if (settings.onEnd !== undefined && typeof settings.onEnd === 'function') {
							settings.onEnd.call($elem);
						}
					});
				}
				
				if (settings.onEnd !== undefined && typeof settings.onEnd === 'function') {
					settings.onEnd.call($elem);
				}
			}
			else {
				startVal = parseFloat(startVal);
				endVal = parseFloat(endVal);
				curVal = null;
				
				if (settings.onStart !== undefined && typeof settings.onStart === 'function') {
					settings.onStart.call($elem);
				}
				
				if (settings.fadeIn) {
					if ($elem.css('display') == 'none') {
						$elem.css('opacity', 0);
						$elem.show();
					}
					$elem.animate({opacity: 1}, settings.fadeInTime);
				}
				startTime = new Date();
				
				count();
			}
		};
		
		//----- PRIVATE -----
		
		var count = function() {
			animationID = requestAnimationFrame(count);
			increment();
		};
		
		var increment = function() {
			var timeElapsed = new Date() - startTime;
			var proportionOfTimeElapsed = timeElapsed / settings.duration;
			
			if (proportionOfTimeElapsed < 1) {
				if (settings.easing) {
					if (jQuery.easing['jswing'] !== undefined && settings.easingFunction != 'jswing') {
						//jQuery.easing library is available (multi variable input)
						curVal = jQuery.easing[settings.easingFunction](null, timeElapsed, startVal, endVal - startVal, settings.duration).toFixed(precision);
						$elem.text(curVal);
					}
					else {
						//default jQuery (>= 1.7.2) easing is all that is available (single variable input/output)
						if (endVal > startVal) {
							curVal = (startVal + (endVal - startVal) * jQuery.easing[settings.easingFunction](proportionOfTimeElapsed)).toFixed(precision);
							$elem.text(curVal);
						}
						else if (startVal > endVal) {
							curVal = (endVal + (startVal - endVal) * (1 - jQuery.easing[settings.easingFunction](proportionOfTimeElapsed))).toFixed(precision);
							$elem.text(curVal);
						}
					}
				}
				else {
					if (endVal > startVal) {
						curVal = (startVal + (endVal - startVal) * proportionOfTimeElapsed).toFixed(precision)
						$elem.text(curVal);
					}
					else if (startVal > endVal) {
						curVal = (endVal + (startVal - endVal) * (1 - proportionOfTimeElapsed)).toFixed(precision)
						$elem.text(curVal);
					}
				}
				
				if (settings.onUpdate !== undefined && typeof settings.onUpdate === 'function') {
					settings.onUpdate.call($elem, curVal, proportionOfTimeElapsed);
				}
			}
			else {
				curVal = endVal.toFixed(precision);
				$elem.text(curVal);
				
				if (settings.onUpdate !== undefined && typeof settings.onUpdate === 'function') {
					settings.onUpdate.call($elem, curVal, 1);
				}
				
				cancelAnimationFrame(animationID);
				startTime = null;
				
				if (settings.onEnd !== undefined && typeof settings.onEnd === 'function') {
					settings.onEnd.call($elem);
				}
			}
		};
		
		var isDecimal = function(n) {
			if (!isNaN(n) && n.indexOf('.') > -1) {
				return true;
			}
			return false;
		};
		
		var calculatePrecision = function() {
			if (isDecimal(startVal) && isDecimal(endVal)) {
				precision = Math.max(startVal.split('.')[1].length, endVal.split('.')[1].length);
			}
			else if (isDecimal(startVal)) {
				precision = startVal.split('.')[1].length;
			}
			else if (isDecimal(endVal)) {
				precision = endVal.split('.')[1].length;
			}
			//else it stays at 0
		};
		
		var checkInputValidityAndSetup = function() {
			if (startVal === undefined || startVal === "" || isNaN(startVal)) {
				logger('NumberCounter ERROR: The starting value for the counter with ID: ' + $elem.attr('id') + ' is invalid.');
				fatalError();
			}
			else if (endVal === undefined || endVal === "" || isNaN(endVal)) {
				logger('NumberCounter ERROR: The ending value for the counter with ID: ' + $elem.attr('id') + ' is invalid.');
				fatalError();
			}
			else {
				calculatePrecision();
				$elem.text(startVal);
				if (settings.fadeIn) {
					$elem.css('opacity', 0);
				}
			}
		};
		
		var logger = function(message) {
			if (window.console && typeof console.log === 'function' && settings.devMode) {
				console.log(message);
			}
		};
		
		var fatalError = function() {
			logger('NumberCounter FATAL ERROR: A combination of notices or errors will result in malfunction on ' + $elem.attr('id') + '.');
			
			//this won't work due to timing of how the constructor is setup
			//$.removeData($elem, 'numbercounter');
		};
		
		//----- INITIALIZE -----
		
		startVal = $elem.attr('data-numbercounter-start');
		endVal = $elem.text();
		
		checkInputValidityAndSetup();
	};
	
	$.fn.NumberCounter = function(options) {
		return this.each(function() {
			var $element = $(this);
			
			if ($element.data('numbercounter')) return;
			
			var numbercounter = new NumberCounter(this, options);
			
			$element.data('numbercounter', numbercounter);
		});
	};
})(jQuery, window);