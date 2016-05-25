function initPeer(messageCallback, channelCallback){
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;

    var wsUri = "ws://localhost:8090/";
    var signalingChannel = createSignalingChannel(wsUri);
    var servers = {iceServers: [{urls: "stun:stun.1.google.com:19302"}]};

    signalingChannel.pcs={};
    
    function startCommunication(peerId) {
        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
        
	signalingChannel.pcs[peerId]=pc;

	pc.oniceconnectionstatechange = function(evt) {
	    console.log("ICE connection state change: " + evt.target.iceConnectionState);
	}

        pc.onicecandidate = function (evt) {
            if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                signalingChannel.sendICECandidate(evt.candidate, peerId);
            } 
        };

        //:warning the dataChannel must be opened BEFORE creating the offer.
        var _commChannel = pc.createDataChannel('communication', {
            reliable: false
        });

	pc.createOffer(function(offer){
	    pc.setLocalDescription(offer);
	    console.log('send offer to peer '+peerId);
	    signalingChannel.sendOffer(offer, peerId);
	}, function (e){
	    console.error(e);
	});

        _commChannel.onclose = function(evt) {
            console.log("dataChannel closed");
        };

        _commChannel.onerror = function(evt) {
            console.error("dataChannel error");
        };

        _commChannel.onopen = function() {
            console.log("dataChannel opened");
        };

        _commChannel.onmessage = function(message){
            messageCallback(message.data, peerId);
        };

	return _commChannel;
    }

    function createPeerConnection(peerId){
        var pc = new RTCPeerConnection(servers, {
	    optional: [{
                DtlsSrtpKeyAgreement: true
	    }]
        });

	signalingChannel.pcs[peerId]=pc;
	
	pc.oniceconnectionstatechange = function(evt) {
	    console.log("ICE connection state change: " + evt.target.iceConnectionState);
	}

        pc.onicecandidate = function (evt) {
	    if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                signalingChannel.sendICECandidate(evt.candidate, peerId);
	    }
        };
	
        pc.ondatachannel = function(event) {
	    var receiveChannel = event.channel;
	    console.log("channel received");
	    channelCallback(receiveChannel, peerId);
	    receiveChannel.onmessage = function(event){
		messageCallback(event.data, peerId);
	    };
        };
	
        return pc;
    }
    
    signalingChannel.onOffer = function (offer, source) {
        console.log('receive offer');
        var peerConnection = createPeerConnection(source);
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        peerConnection.createAnswer(function(answer) {
	    peerConnection.setLocalDescription(answer);
	    console.log('send answer');
	    signalingChannel.sendAnswer(answer, source);
        }, function (e){
	    console.log(e);
        });
    };
    
    signalingChannel.onAnswer = function (answer, source) {
        console.log('receive answer from ', source);
        signalingChannel.pcs[source].setRemoteDescription(new RTCSessionDescription(answer));
    };
    
    signalingChannel.onICECandidate = function (ICECandidate, source) {
	console.log("receiving ICE candidate from ",source);
	signalingChannel.pcs[source].addIceCandidate(new RTCIceCandidate(ICECandidate));
    };
	
    function connectPeers() {
	if (signalingChannel.peers) {
	    signalingChannel.peers.forEach(function (peerId) {
		channelCallback(startCommunication(peerId), peerId);
	    })
	} else setTimeout(connectPeers,4);
    }
    connectPeers();

    return signalingChannel;
}
