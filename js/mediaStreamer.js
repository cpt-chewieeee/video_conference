function videoConference(settingsObj, domObj){
	var connection = new RTCMultiConnection();
	connection.body = domObj;
	var signaler = initReliableSignaler(connection, '/');
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
	window.createRoom = function(sessionid){
		connection.channel = connection.sessionid = connection.userid = sessionid;
	    connection.open({
	        onMediaCaptured: function() {
	            signaler.createNewRoomOnServer(connection.sessionid);
	        }
	    });
	}
	window.joinRoom = function(sessionid){
		signaler.getRoomFromServer(sessionid, function(sessionid) {
	        connection.channel = connection.sessionid = sessionid;
	        connection.join({
	            sessionid: sessionid,
	            userid: sessionid,
	            extra: {},
	            session: connection.session
	        });
	    });
	}
}
