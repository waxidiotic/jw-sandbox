var BACKUP_STREAM =
    'http://storage.googleapis.com/testtopbox-public/video_content/bbb/' +
    'master.m3u8';

// Live stream asset key.
var TEST_ASSET_KEY = "sN_IYUG8STe1ZzhIIE_ksA";

// VOD content source and video IDs.
var TEST_CONTENT_SOURCE_ID = "2509872";
var TEST_VIDEO_ID = "5d14e05fbe407776cf39ae31";

var streamManager;   // used to request ad-enabled streams.
var hls = new Hls(); // hls.js video player
var videoElement;
var clickElement;

function initPlayer() {
  videoElement = document.getElementById('video');
  clickElement = document.getElementById('click');
  streamManager = new google.ima.dai.api.StreamManager(videoElement);
  streamManager.setClickElement(clickElement);
  streamManager.addEventListener(
    [google.ima.dai.api.StreamEvent.Type.LOADED,
     google.ima.dai.api.StreamEvent.Type.ERROR,
     google.ima.dai.api.StreamEvent.Type.AD_BREAK_STARTED,
     google.ima.dai.api.StreamEvent.Type.AD_BREAK_ENDED],
    onStreamEvent,
    false);

  // Timed metadata is only used for LIVE streams.
  hls.on(Hls.Events.FRAG_PARSING_METADATA, function(event, data) {
    if (streamManager && data) {
      // For each ID3 tag in our metadata, we pass in the type - ID3, the
      // tag data (a byte array), and the presentation timestamp (PTS).
      data.samples.forEach(function(sample) {
        streamManager.processMetadata('ID3', sample.data, sample.pts);
      });
    }
  });

  requestVODStream(TEST_CONTENT_SOURCE_ID, TEST_VIDEO_ID, null);
  // Uncomment the line below and comment out the one above to request a
  // LIVE stream instead of a VOD stream.
  //requestLiveStream(TEST_ASSET_KEY, null);
}

function requestVODStream(cmsId, videoId, apiKey) {
  var streamRequest = new google.ima.dai.api.VODStreamRequest();
  streamRequest.contentSourceId = cmsId;
  streamRequest.videoId = videoId;
  streamRequest.apiKey = apiKey;
  streamManager.requestStream(streamRequest);
}

function requestLiveStream(assetKey, apiKey) {
  var streamRequest = new google.ima.dai.api.LiveStreamRequest();
  streamRequest.assetKey = assetKey;
  streamRequest.apiKey = apiKey;
  streamManager.requestStream(streamRequest);
}

function onStreamEvent(e) {
  switch (e.type) {
    case google.ima.dai.api.StreamEvent.Type.LOADED:
      console.log('Stream loaded');
      loadUrl(e.getStreamData().url);
      break;
    case google.ima.dai.api.StreamEvent.Type.ERROR:
      console.log('Error loading stream, playing backup stream.' + e);
      loadUrl(BACKUP_STREAM);
      break;
    case google.ima.dai.api.StreamEvent.Type.AD_BREAK_STARTED:
      console.log('Ad Break Started');
      videoElement.controls = false;
      clickElement.style.display = 'block';
      break;
    case google.ima.dai.api.StreamEvent.Type.AD_BREAK_ENDED:
      console.log('Ad Break Ended');
      videoElement.controls = true;
      clickElement.style.display = 'none';
      break;
    default:
      break;
  }
}

function loadUrl(url) {
  console.log('Loading:' + url);
  hls.loadSource(url);
  hls.attachMedia(videoElement);
  hls.on(Hls.Events.MANIFEST_PARSED, function() {
    console.log('Video Play');
    videoElement.play();
  });
}
