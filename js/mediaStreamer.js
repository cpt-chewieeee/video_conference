function videoConference(settingsObj, domObj){
	if(!settingsObj) return;



	var connection = new RTCMultiConnection();
	var signaler = initReliableSignaler(connection, '/');
	var socketio = io();
	var multiStreamRecorder;
	var recordingInterval = 2;




	connection.body = domObj;
	
	connection.session = settingsObj;
	connection.sdpConstraints.mandatory = {
	    OfferToReceiveAudio: true,
	    OfferToReceiveVideo: true
	};


	var videoConstraints = {
	    mandatory: {
	        maxWidth: 160,
	        maxHeight: 160,
	        minAspectRatio: 1,
	        minFrameRate: 3,
	        maxFrameRate: 64
	    },
	    optional: []
	};

	var audioConstraints = {
	    mandatory: {
	        // echoCancellation: false,
	        // googEchoCancellation: false, // disabling audio processing
	        // googAutoGainControl: true,
	        // googNoiseSuppression: true,
	        // googHighpassFilter: true,
	        // googTypingNoiseDetection: true,
	        // googAudioMirroring: true
	    },
	    optional: []
	};

	connection.mediaConstraints = {
	    video: videoConstraints,
	    audio: audioConstraints
	};
	



	connection.onstream = function(event){
		var videoDOM = connection.body.appendChild(event.mediaElement);
		console.log("USER::", event.userid);
		socketio.emit('connection',{
	    	status: "connection established",
			gameid: event.userid
	    });  
		videoDOM.addEventListener('loadedmetadata', function(){
			
			multiStreamRecorder = new MultiStreamRecorder(event.stream);
			
			multiStreamRecorder.video = videoDOM;
			multiStreamRecorder.ondataavailable = function(blob){
				
				var files = {
					audio: {
						type: blob.audio.type || 'audio/wav',
						dataURL: blob.audio
					},
					video: {
						type: blob.video.type || 'video/webm',
						dataURL: blob.video
					}
				};
				socketio.emit('sendRecording', files);
			};
			multiStreamRecorder.start(recordingInterval * 1000);
		}, false);
		
	};

	
	connection.onstreamended = function(event){
		event.mediaElement.parentNode.removeChild(event.mediaElement);
	};


	window.createRoom = function(sessionId, userId){
		connection.channel = sessionId;
		connection.sessionid = sessionId;
		connection.userid = userId;
	    connection.open({
	    	captureUserMediaDemand: true,
	        onMediaCaptured: function() {
	            signaler.createNewRoomOnServer(connection.sessionid);
	        }
	    });
	   
	}
	window.joinRoom = function(sessionId, userId){
		signaler.getRoomFromServer(sessionId, function(sessionId) {
	        connection.channel = sessionId
	        connection.sessionid = sessionId;
	        connection.join({
	            sessionid: sessionId,
	            userid: userId,
	            extra: {},
	            session: connection.session
	        });
	    });
	}
}
