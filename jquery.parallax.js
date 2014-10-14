/**
 * @fileOverview jQuery Parallax Plugin
 * @author <a href="mailto:brianfegan@gmail.com">Brian Fegan</a>
 * @version 0.9
 */

/**
 * @name $
 * @function
 * @description jQuery namespace
 */

/**
 * @name $.fn
 * @type object
 * @description Object to attach jQuery plugin extensions to.
 */

/**
 * @name $.fn.parallax
 * @function
 * @description The public api method for the parallax plugin. Options are...
 * <ul>
 * 	<li><strong>queueName</strong>: if we want to add this element to a queue for an sequence animation.</li>
 * 	<li><strong>complete</strong>: if we want to jump right to the end state on initialization.</li>
 *  <li><strong>animation</strong>: an animation object.
 * 		<ul>
 *  	<li><strong>type</strong>: 'manual' (user-controlled) or 'auto' (user-initiated, runs once).</li>
 * 		<li>
 * 			<strong>props</strong>: an object of css properties to animiate; each one of these contains a "from", "to", and optional "suffix".
 * 			<ul>
 * 			<li><strong>from</strong>: an object of css props to animate from</li>
 *			<li><strong>to</strong>: an object of css props to animate to</li>
 *			<li><strong>suffix</strong>: the suffix for the animation property (i.e. px, %, etc.)</li>
 * 			</ul>
 * 		</li>
 * 		<li><strong>speed (optional)</strong>: if 'auto', the animation speed. defaults to 0.5s.</li>
 * 		<li><strong>proceed (optional)</strong>: if 'auto', only allow next animation to happen once past this value. defaults to 0s.</li>
 * 		<li><strong>bidirectional (optional)</strong>: if 'manual', allow user-controlled animation to happen in both directions. defaults to false.</li>
 * 		</ul>
 * 	</li>
 * 	<li><strong>differenceOffsetPct (optional)</strong>: pct difference of eleHeight from ele.offsetBottom where animation start is; (offsetBottom - (ele.height * differenceOffsetPct)). defaults to 0.
 * 	<li><strong>pctOfEleHeight (optional)</strong>: if 'manual', used to calculate the range of allowable user-controlled animation.
 * @param {mixed} method Either the public method we want to call, an options object, or a param needed for the method being called.
 * @returns {object} The chained jQuery object.
 */
(function($){
	
	var defaults = {
		queueName: null,
		complete: false,
		animation: {
			type: 'auto',
			speed: 0.5, // in seconds
			proceed: 0, // in seconds
			bidirectional: false
		},
		differenceOffsetPct: 0,
		pctOfEleHeight: 1
	}
	$document = $(document),
	$window = $(window),
	methods = {},
	queues = {},
	HAS_TOUCH = ('ontouchstart' in window),
	HAS_RAF = ('requestAnimationFrame' in window),
	asset_uid = 0,
	scroll_top = null,
	scroll_bottom = null,
	RAF_FALLBACK_SPEED = 16,
	
	/**
	 * @name $.fn.parallax-_getScrollBottom
	 * @function
	 * @description Using the scrollTop and winInnerHeight, calculate the scroll bottom.
	 * @param {number} [scrollTop]
	 * @returns {number} 
	 */
	_getScrollBottom = function() {
		var winInnerHeight = (typeof(window.innerHeight) == 'number') ? window.innerHeight : document.documentElement.clientHeight;
		return (winInnerHeight + scroll_top);
	},
	
	/**
	 * @name $.fn.parallax-_animate
	 * @function
	 * @description An animation method that uses requestAnimationFrame syntax.
	 * @param {object} item An animatation object, with a time (duration), run (callback) key, and data key.
	 */
	_animate = function(item) {
		var duration = 1000*item.time,
			end = +new Date() + duration;
		var step = function() {
			var current = +new Date(),
				remaining = end - current;
			if(remaining < 60) {
				item.run(1, item.data);  //1 = progress is at 100%
				return;
			} else {
				var rate = 1 - remaining/duration;
				item.run(rate, item.data);
			}
			if (HAS_RAF) {
				window.requestAnimationFrame(step);
			} else {
				window.setTimeout(step, RAF_FALLBACK_SPEED);
			}
		}
		step();
	},
	
	/**
	 * @name $.fn.parallax-_Asset
	 * @class
	 * @description The private, parallax asset constructor.
	 * @param {object} $ele The jquery object representing the asset element.
	 * @param {object} data The data for this asset.
	 */
	_Asset = function($ele, data) {
		
		// save the element on the instance
		asset_uid++;
		this.$ele = $ele;
		this.uid = asset_uid;
		
		// if this asset is part of a queue 
		if (data.queueName) {
			if (queues[data.queueName]) {
				queues[data.queueName].push(true);
			} else {
				queues[data.queueName] = [true];
			}
			this.queueIndex = queues[data.queueName].length - 1;
		}
		
		// now save everything from the data object to this instance
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				this[key] = data[key];
			}
		}
		
		// also add some default settings that will be used by this instance
		$.extend(this, {scroll_ticking:false, startOffset:null, endOffset:null, complete:false, queue:true, progress:0});
		
		// if this is a touch device, use the auto animation to get around iOS scrolling limitations
		if (HAS_TOUCH) {
			this.animation.type = 'auto';
			this.animation.bidirectional = false;
		}
		
		// if the element should be moved to its end state right away
		// else, set up parallax animation
		if (this.complete) {
			this.setComplete(true); //true=addClass
		} else {
			this.setupAnimation();
		}
		
	};
	
	
	
	/**
	 * @description Contains all private prototyped methods of $.fn.parallax-_Asset
	 */
	_Asset.prototype = {
		
		/**
		 * @name $.fn.parallax-_Asset.setupAnimation
		 * @function
		 * @description Set up the animation for this asset.
		 */
		setupAnimation : function() {
			
			// preload image asset
			var asset = this;
			
			// save the value of the current css properties we are moving from
			// as well as the difference we are moving them
			for (var cssProp in asset.animation.props) {
				if (asset.animation.props.hasOwnProperty(cssProp)) {
					asset.animation.props[cssProp].from	= parseFloat(asset.animation.props[cssProp].from, 10);
					asset.animation.props[cssProp].to	= parseFloat(asset.animation.props[cssProp].to, 10);
					asset.animation.props[cssProp].diff	= asset.animation.props[cssProp].to - asset.animation.props[cssProp].from;
				}
			}
			
			// calculate the offsets of the animation range and determine if we need to do anything
			// based on scroll position when this asset has loaded
			asset.setStartAndEndOffsets({data:asset});
			asset.animateByScrollPosition({data:asset});
				
			// subscribe to relevant window events
			$window.on('scroll.parallax'+asset.uid, asset, asset.scroll).on('resize.parallax'+asset.uid, asset, asset.setStartAndEndOffsets);
			
		},
		
		/**
		 * @name $.fn.parallax-_Asset.setComplete
		 * @function
		 * @description Used to set a parallax asset element to its completed animation state.
		 * @param {boolean} [addClass] Whether we want to add the complete class to the element or not.
		 */
		setComplete : function(addClass) {
			if (!this.complete) {
				this.complete = true;
				$window.off('scroll.parallax'+this.uid).off('resize.parallax'+this.uid);
			}
			// if the asset is truly complete, add the complete class
			if (addClass) this.$ele.attr('style','').addClass('complete');
		},
		
		/**
		 * @name $.fn.parallax-Asset.setStartAndEndOffsets
		 * @function
		 * @description Calculate where an animation should start and end for this asset.
		 * @param {object} e
		 */
		setStartAndEndOffsets : function(e) {
			var asset = e.data,
				$ele = asset.$ele, 
				eleHeight = $ele.outerHeight(),
				pctOfEleHeight = asset.pctOfEleHeight || 0,
				differenceOffsetPct = asset.differenceOffsetPct || 0;
			asset.startOffset = ($ele.offset().top + eleHeight) - (eleHeight * differenceOffsetPct);
			asset.endOffset = asset.startOffset + (eleHeight * pctOfEleHeight);
			asset.offsetRange = asset.endOffset - asset.startOffset;  
		},
		
		/**
		 * @name $.fn.parallax-_Asset.getAnimationRangePosition
		 * @function
		 * @description Determine where asset is in relation to animation threshold.
		 * @param {number} scrollTop The current scrollTop position.
		 * @param {number} scrollBottom The current scrollBottom position.
		 * @returns {string}
		 */
		getAnimationRangePosition : function(scrollTop, scrollBottom) {
			if (scrollBottom < this.startOffset) {
				return 'above';
			} else if (scrollBottom < this.endOffset) {
				return 'within';
			} else {
				return 'below';
			}
		},
		
		/**
		 * @name $.fn.parallax-_Asset.adjustByRate
		 * @function
		 * @description Takes in a rate of animation and adjusts css properties based on that rate.
		 * @param {number} rate How far along we are in the asset adjustment range.
		 */
		adjustByRate : function(rate) {
			var asset = this;
			// dequeues this asset to allow next asset animation in the queue to start
			if (asset.queue && rate >= asset.animation.proceed) {
				asset.queue = false;
				queues[asset.queueName][asset.queueIndex] = false;
			}
			for (var cssProp in asset.animation.props) {
				if (asset.animation.props.hasOwnProperty(cssProp)) {
					var suffix = asset.animation.props[cssProp].suffix || '';
					if (rate <= 0) {
						asset.$ele.css(cssProp, asset.animation.props[cssProp].from+suffix);
					} else if (rate >= 1) {
						asset.$ele.css(cssProp, asset.animation.props[cssProp].to+suffix);
						if (!asset.animation.bidirectional) this.setComplete(true); //true=addClass
					} else {
						var adjustBy = rate * asset.animation.props[cssProp].diff;
						asset.$ele.css(cssProp, (asset.animation.props[cssProp].from + adjustBy)+suffix);
					}
				}
			}
		},
		
		/**
		 * @name $.fn.parallax-_Asset.checkPanelAnimationQueue
		 * @function
		 * @description If this is the first asset in a panel to animate, or a previous asset has finished animating,
		 * proceed with this animation, else check back every 15ms.
		 */
		checkPanelAnimationQueue : function() {
			var asset = this;
			if ( (asset.queueIndex === 0) || !queues[asset.queueName][asset.queueIndex-1] ) {
				var speed = asset.animation.speed;
				_animate({time:speed, run:function(rate){
					asset.adjustByRate(rate);
				}});
			} else {
				if (HAS_RAF) {
					window.requestAnimationFrame(function(){
						asset.checkPanelAnimationQueue();
					});
				} else {
					window.setTimeout(function(){
						asset.checkPanelAnimationQueue();
					}, RAF_FALLBACK_SPEED);
				}
			}
		},
		
		/**
		 * @name $.fn.parallax-_Asset.animateByScrollPosition
		 * @function
		 * @description Using the scroll positions passed in, determine if asset is within an animation threshold, and animates asset.
		 * @param {number} scrollTop The current scrollTop position.
		 * @param {number} scrollBottom The current scrollBottom position.
		 */
		animateByScrollPosition : function(scrollTop, scrollBottom) {
			
			// if its an auto animation, we want to kick of animation if we are within or below the asset
			// we only allow an auto animation to happen once per page load
			// find if we are above, within, or below the asset animation range
			// NOTE: we also check !this.complete here since we setComplete(false) to let animation proceed before
			// removing the instance, but we don't want to call this animation again
			if ( this.animation.type === 'auto' && !this.complete ) {
				var range = this.getAnimationRangePosition(scrollTop, scrollBottom);
				if ( range === 'within' || range === 'below' ) {
					this.setComplete(false); //false=addClass
					this.checkPanelAnimationQueue();
				}
			}
			
			// if its a manual animation controlled by scroll position
			// find the rate of progress and adjust the asset by that rate
			// if the asset can only animate in one direction, call _setAssetComplete once rate has exceeded '1'
			else if ( this.animation.type === 'manual' ) {
				var rate = (scrollBottom - this.startOffset) / this.offsetRange;
				if (this.animation.bidirectional) {
					this.adjustByRate(rate);
				} else if (rate > this.progress) {
					this.progress = rate;
					this.adjustByRate(rate);
				}
			}
			
		},
		
		/**
		 * @name $.fn.parallax-_Asset.scroll
		 * @function
		 * @description A scroll subscriber callback.
		 * @param {object} e
		 */
		scroll : function(e) {
			var asset = e.data;
			if (HAS_RAF) {
				if (!asset.scroll_ticking) {
					window.requestAnimationFrame(function(){
						asset.scroll_ticking = false;
						asset.animateByScrollPosition(scroll_top, scroll_bottom);
					});
				}
				asset.scroll_ticking = true;
			} else {
				asset.animateByScrollPosition(scroll_top, scroll_bottom);
			}
		}
			
	};
	
	/**
	 * @name $.fn.parallax.complete
	 * @function
	 * @description A public method to terminate all parallax functionality for the selector its called on and set
	 * the assets to their completed animation state; i.e. $(selector).parallax('complete')
	 * @returns {object} The chained jQuery object.
	 */
	methods.complete = function () {
		this.each(function (index, ele) {
			var asset = $(ele).data('asset');
			if (!asset.complete) {
				asset.setComplete(true); //true=addClass
			}
		});
		return this;
	};
	
	/**
	 * @name $.fn.parallax.init
	 * @function
	 * @description The default method used when called $(selector).parallax().
	 * @param {object} opts Overrides for the default options of the plugin.
	 * @returns {object} The chained jQuery object. 
	 */
	methods.init = function (opts) {
		
		// set scroll_top and scroll_bottom if its the first time plugin is called
		if (scroll_top === null) {
			scroll_top = $document.scrollTop();
			scroll_bottom = _getScrollBottom();
			$window.on('scroll', function(){
				scroll_top = $document.scrollTop();
				scroll_bottom = _getScrollBottom();
			});
		}
		
		// Loop through the jQuery objects passed in
		this.each(function (index, ele) {
		
			var $ele = $(ele),
				asset = $ele.data('asset'),
				data = {};
						
			// only proceed if there is NOT already asset data
			// extend the defaults and options into this instance
			// create an asset instance
			if (!asset) {
				$.extend(true, data, defaults, opts || {});
				asset = new _Asset($ele, data);
				$ele.data('asset', asset);
			}
		
		});
		
		// chain it
		return this;
	
	};
	
	/**
	 * @name $.fn.parallax
	 * @function
	 * @description The public api method for the parallax plugin.
	 * @param {mixed} method Either the public method we want to call, an options object, or a param needed for the method being called.
	 * @returns {object} The chained jQuery object.
	 */
	$.fn.parallax = function (method) {
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		}		
	};
	
}(jQuery));