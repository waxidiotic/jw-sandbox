var VpaidVideoPlayer = function() {
    this._slot = null;
    this._videoSlot = null;
    this._eventsCallbacks = {};
    this._parameters = {};
    this._quartileEvent = -1;
    this._quartiles = ['AdVideoStart', 'AdVideoFirstQuartile', 'AdVideoMidPoint', 'AdVideoThirdQuartile'];
};

VpaidVideoPlayer.prototype.initAd = function(width, height, viewMode,
                                            desiredBitrate, creativeData, environmentVars) {

    this._slot = environmentVars.slot;
    this._videoSlot = environmentVars.videoSlot;

    // Parse the incoming parameters
    this._parameters = JSON.parse(creativeData['AdParameters']);

    this._attributes = this._parameters['attributes'];

    this._attributes['width'] = width;
    this._attributes['height'] = height;
    this._attributes['viewMode'] = viewMode;
    this._attributes['desiredBitrate'] = desiredBitrate;

    if (this._attributes['linear']) {
        this._updateVideoSlot();
        this._videoSlot.addEventListener('timeupdate', this._timeHandler.bind(this), false);
        this._videoSlot.addEventListener('ended', this.stopAd.bind(this),false);
    }

    //create click-through container
    this.vpaidContainer = document.createElement('div');
    this.vpaidContainer.id = 'vpaid-container';
    this.vpaidContainer.style = 'position:absolute;width:100%;height:100%;z-index:auto;pointer-events:auto;cursor:pointer;';
    this._slot.appendChild(this.vpaidContainer);
    this.vpaidContainer.addEventListener('click', this._adClickThrough.bind(this), false);

    this._callEvent('AdLoaded');
};

VpaidVideoPlayer.prototype._adClickThrough = function() {
    this._callEvent('AdClickThru');
    this._videoSlot.pause();
    this._callEvent('AdPaused');
};

VpaidVideoPlayer.prototype._updateVideoSlot = function() {
    if (this._videoSlot == null) {
        this._videoSlot = document.createElement('videoAd');
        this._slot.appendChild(this._videoSlot);
    }

    var foundSource = false;
    var videos = this._parameters.videos || [];
    for (var i = 0; i < videos.length; i++) {
        // Choose the first video with a supported mimetype.
        if (this._videoSlot.canPlayType(videos[i].mimetype) != '') {
            this._videoSlot.setAttribute('src', videos[i].url);
            foundSource = true;
            break;
        }
    }
    if (!foundSource) {
        // Unable to find a source video.
        this._callEvent('AdError');
    }
};

VpaidVideoPlayer.prototype._timeHandler = function() {
    // call quartile event
    var quartile = Math.floor((this._videoSlot.currentTime/this._videoSlot.duration*100)/25);
    if (this._quartileEvent !== quartile) {
        this._quartileEvent = quartile;
        this._callEvent(this._quartiles[quartile-1]);
    }
    // change remaining time
    this._attributes['remainingTime'] = this._videoSlot.duration - this._videoSlot.currentTime;
    this._callEvent('AdRemainingTimeChange');
}

/**
 * Returns the versions of VPAID ad supported.
 */
VpaidVideoPlayer.prototype.handshakeVersion = function(version) {
    return '2.0';
};

/**
 * Called by the wrapper to start the ad.
 */
VpaidVideoPlayer.prototype.startAd = function() {
    if (this._attributes['linear']) {
        this._videoSlot.play();

        if (this.getAdSkippableState()) {
            var skipoffset = this.getAdSkipOffset() * 1000;
            var _createAdButton = this._createAdButton.bind(this);
            var _callEvent = this._callEvent.bind(this);
            var skipAd = this.skipAd;
            if (skipoffset) {
                setTimeout(function() {
                    _createAdButton('Skip', skipAd);
                    _callEvent('AdSkippableStateChange');
                }, skipoffset);
            } else {
                _createAdButton('Skip', skipAd);
                _callEvent('AdSkippableStateChange');
            }
        }

        this._createAdButton('Resume', this.resumeAd);
        this._createAdButton('Pause', this.pauseAd);

        this._callEvent('AdStarted');
        this._callEvent('AdImpression');
    }
};

VpaidVideoPlayer.prototype._createAdButton = function(text, eventType) {
    var adButton = document.createElement('button');
    var buttonText = document.createTextNode(text);
    adButton.appendChild(buttonText);
    adButton.addEventListener('click', eventType.bind(this), false);
    preventEventBubbling(adButton);
    this.vpaidContainer.appendChild(adButton);


};

function preventEventBubbling(button) {
    button.onclick = function(e) {
        e.stopPropagation();
    };
}

/**
 * Called by the wrapper to stop the ad.
 */
VpaidVideoPlayer.prototype.stopAd = function() {
    var callback = this._callEvent.bind(this);
    this._callEvent('AdVideoComplete');
    this._callEvent('AdStopped');
};


/**
 * @param {number} value The volume in percentage.
 */
VpaidVideoPlayer.prototype.setAdVolume = function(value) {
    this._attributes['volume'] = value;
    this._callEvent('AdVolumeChanged');
};


/**
 * @return {number} The volume of the ad.
 */
VpaidVideoPlayer.prototype.getAdVolume = function() {
    return this._attributes['volume'];
};


/**
 * @param {number} width The new width.
 * @param {number} height A new height.
 * @param {string} viewMode A new view mode.
 */
VpaidVideoPlayer.prototype.resizeAd = function(width, height, viewMode) {
    this._attributes['width'] = width;
    this._attributes['height'] = height;
    this._attributes['viewMode'] = viewMode;
    // if linear, resize video
    if (this._attributes['linear']) {
        try {
            this._videoSlot.setAttribute('width', width);
            this._videoSlot.setAttribute('height', height);
            this._videoSlot.style.width = width + 'px';
            this._videoSlot.style.height = height + 'px';
        } catch (e) {
            console.log('Could not resize video ad');
        }
    }

    this._callEvent('AdSizeChange');
};

/**
 * Pauses the ad.
 */
VpaidVideoPlayer.prototype.pauseAd = function() {
    this._videoSlot.pause();
    this._callEvent('AdPaused');
};

/**
 * Resumes the ad.
 */
VpaidVideoPlayer.prototype.resumeAd = function() {
    this._videoSlot.play();
    this._callEvent('AdResumed');
    this._callEvent('AdPlaying');
};

/**
 * Expands the ad.
 */
VpaidVideoPlayer.prototype.expandAd = function() {
    this._attributes['expanded'] = true;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    }
    this._callEvent('AdExpanded');
};

/**
 * Returns true if the ad is expanded.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdExpanded = function() {
    return this._attributes['expanded'];
};

/**
 * Returns the skippable state of the ad.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdSkippableState = function() {
    return this._attributes['skippableState'];
};

/**
 * Returns the skip offset of the ad, if present.
 * @return {number}
 */
VpaidVideoPlayer.prototype.getAdSkipOffset = function() {
    if (this._attributes['skipoffset']) {
        return this._attributes['skipoffset'];
    } else {
        return 0;
    }
}

/**
 * Collapses the ad.
 */
VpaidVideoPlayer.prototype.collapseAd = function() {
    this._attributes['expanded'] = false;
};

/**
 * Skips the ad.
 */
VpaidVideoPlayer.prototype.skipAd = function() {
    var skippableState = this._attributes['skippableState'];
    if (skippableState) {
        this._callEvent('AdSkipped');
        this._callEvent('AdStopped');
    }
};

/**
 * Registers a callback for an event.
 * @param {Function} aCallback The callback function.
 * @param {string} eventName The callback type.
 * @param {Object} aContext The context for the callback.
 */
VpaidVideoPlayer.prototype.subscribe = function(aCallback, eventName, aContext) {
    var callBack = aCallback.bind(aContext);
    this._eventsCallbacks[eventName] = callBack;
};

/**
 * Removes a callback based on the eventName.
 *
 * @param {string} eventName The callback type.
 */
VpaidVideoPlayer.prototype.unsubscribe = function(eventName) {
    this._eventsCallbacks[eventName] = null;
};

/**
 * @return {number} The ad width.
 */
VpaidVideoPlayer.prototype.getAdWidth = function() {
    return this._attributes['width'];
};

/**
 * @return {number} The ad height.
 */
VpaidVideoPlayer.prototype.getAdHeight = function() {
    return this._attributes['height'];
};

/**
 * @return {number} The time remaining in the ad.
 */
VpaidVideoPlayer.prototype.getAdRemainingTime = function() {
    return this._attributes['remainingTime'];
};

/**
 * @return {number} The duration of the ad.
 */
VpaidVideoPlayer.prototype.getAdDuration = function() {
    return this._attributes['duration'];
};

/**
 * @return {string} List of companions in vast xml.
 */
VpaidVideoPlayer.prototype.getAdCompanions = function() {
    return this._attributes['companions'];
};

/**
 * @return {string} A list of icons.
 */
VpaidVideoPlayer.prototype.getAdIcons = function() {
    return this._attributes['icons'];
};

VpaidVideoPlayer.prototype.onAdImpression = function() {
    this._callEvent('AdImpression');
}

/**
 * @return {boolean} True if the ad is a linear, false for non linear.
 */
VpaidVideoPlayer.prototype.getAdLinear = function() {
    return this._attributes['linear'];
};

/**
 * Calls an event if there is a callback.
 * @param {string} eventType
 */
VpaidVideoPlayer.prototype._callEvent = function(eventType) {
    if (eventType in this._eventsCallbacks && typeof this._eventsCallbacks[eventType] === 'function') {
        this._eventsCallbacks[eventType]();
    }
};

/**
 * Main function called by wrapper to get the VPAID ad.
 */
var getVPAIDAd = function() {
    return new VpaidVideoPlayer();
};
