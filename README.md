jquery.parallax
===============

A jQuery Parallax plugin; apply animations to elements onscroll.

<p>This plugin allows for the easy manipulation of CSS properties of DOM elements relative to a user's scroll position.</p>
<p>It's built in a way so that it can be used on responsive designs, in addition to static designs. However, due to restrictions with iOS, where all JavaScript is paused while a user scrolls, all animations queue once the user has stopped scrolling on iOS devices.</p>
<p>NOTE: this plugin assumes all content is ready to be manipulated before it is initialized. If you are planning to animate images, and you don't know the width/height or aspect ratio of the image before it loads, please ensure the image is loaded before calling this plugin on it, or any parent element that contains the image.</p>
<h2>HTML Setup</h2>
    <div class="animate-me">
        I can be anything; text, image or more markup!
    </div>

<h2>CSS Setup</h2>
<p>The plugin needs to know the beginning and end of each animation. At one point, it was using jQuery to infer a start point, but there were too many cross-browser issues trying to infer what css measurement unit was implied to animate (i.e. px, %, em, or none)</p>
<p>Each element that needs to be animated should have a <code>.complete</code> class that defines what the final animation state is for the element (if there is one), with the <code>!important</code> keyword included.</p>
    .animate-me {
	    display: block;
		position: absolute;
        opacity: 0.5;
        width: 25%;
        height: auto;
    }
    .animate-me.complete {
        opacity: 1 !important;
        width: 75% !important;
    }

<h2>Options</h2>
<p>There are 2 key things to keep in mind when using this plugin:</p>
<ol>
	<li>
		Is there an element animation that runs once the user passes a scroll point, or is the animation always relative to a user's scroll position?
		<ul>
		<li>Animation runs once: We call this <code>auto</code></li>
		<li>Animation is relative to scroll: We call this <code>manual</code>. Secondly, a manual scroll can be <code>bidirectional</code> (up/down), while an auto animation is one and done.</li>
 		</ul>
	</li>
	<li>When do you want the element animation to happen? For this plugin, animation of an element is determined by its offsetBottom as a starting point. From there, using plugin settings, you can manipulate the start/end points of the animation range as a product of the element's height.</li>
 </ol>
    queueName: null, // optional. include a unique string to add this element to a queue for a sequence animation
    complete: false, // jump right to the end state on initialization
    animation: {
        type: 'manual', // 'manual' (user-controlled) or 'auto' (user-initiated, runs once)
        props: { // an object of css properties to animiate; each one of these contains a "from", "to", and optional "suffix". for example...
            width: {
                from: 25,
                to: 75,
                suffix: '%'
            },
            opacity: {
                from: 0.5,
                to: 1
            },
            ...
        },
        speed: 0.5, // optional. if 'auto', the animation speed. defaults to 0.5s.</li>
        proceed: 0, // optional. if 'auto', only allow next animation to happen once past this value. defaults to 0s.</li>
        bidirectional: false // optional. if 'manual', allow user-controlled animation to happen in both directions. defaults to false.</li>
    }
    differenceOffsetPct: 0, // optional. pct difference of eleHeight from ele.offsetBottom where animation start is; (offsetBottom - (ele.height * differenceOffsetPct)). defaults to 0.
    pctOfEleHeight: 1 // optional. if 'manual', used to calculate the range of allowable user-controlled animation.
    
<h2>Usage</h2>
    // initialize
    $('.animate-me').parallax(opts);
    
    // initialize with options example
    $('.animate-me').parallax({
    	queueName: 'fun-sequence',
		animation: {
			type: 'auto',
			props: {
                width: {
                    from: 25,
                    to: 75,
                    suffix: '%'
                },
                opacity: {
                    from: 0.5,
                    to: 1
                },
			},
            speed: 0.4,
            proceed: 0.75 // stop the next element in the queue until i am 75% done animating
		},
		differenceOffsetPct: 0.2, // start 20% away from my bottom
		pctOfEleHeight: 0.5 // end half of my height away from that 20% start point
    });
    
    // set element to parallax complete state
    $('.animate-me').parallax('complete');
