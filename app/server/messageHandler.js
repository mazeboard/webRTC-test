var  connectedPeers = {};
var peerId = 0;

function onMessage(ws, message){
    var type = message.type;
    switch (type) {
        case "ICECandidate":
            onICECandidate(message.ICECandidate, message.destination, ws.id);
            break;
        case "offer":
            onOffer(message.offer, message.destination, ws.id);
            break;
        case "answer":
            onAnswer(message.answer, message.destination, ws.id);
            break;
        case "init":
            onInit(ws, message.init);
            break;
        default:
            throw new Error("invalid message type");
    }
}

function onInit(ws){
    var id = peerId++;
    console.log("init from peer:", id);
    ws.id = id;
    Object.keys(connectedPeers).forEach(function (peerId) {
	if (connectedPeers[peerId].readyState!=1) delete connectedPeers[peerId];
    })
    ws.send(JSON.stringify({
	type:'id',
	id:id,
	peers:Object.keys(connectedPeers)
    }));
    connectedPeers[id] = ws;
}

function onOffer(offer, destination, source) {
    console.log("offer from peer:", source, "to peer", destination);
    if (connectedPeers[destination].readyState==1) {
	connectedPeers[destination].send(JSON.stringify({
            type:'offer',
            offer:offer,
            source:source,
	}));
    } else delete connectedPeers[destination];
}

function onAnswer(answer, destination, source){
    console.log("answer from peer:", source, "to peer", destination);
    if (connectedPeers[destination].readyState==1) {
	connectedPeers[destination].send(JSON.stringify({
            type: 'answer',
            answer: answer,
            source: source,
	}));
    } else delete connectedPeers[destination];
}

function onICECandidate(ICECandidate, destination, source){
    console.log("ICECandidate from peer:", source, "to peer", destination);
    if (connectedPeers[destination].readyState==1) {
	connectedPeers[destination].send(JSON.stringify({
            type: 'ICECandidate',
            ICECandidate: ICECandidate,
            source: source,
	}));
    } else delete connectedPeers[destination];
}

module.exports = onMessage;

//exporting for unit tests only
module.exports._connectedPeers = connectedPeers;
