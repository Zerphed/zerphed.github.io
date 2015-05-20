var serialport = require('serialport');
var express = require('express');
var firebase = require('firebase');

var HTML_DIR = __dirname + '/public/html/';

const SEND_INTERVAL = 2000;
const TIMEOUT = 5000; // Timeout until tag is removed if it hasn't advertised itself
const PORT_NAME = ''; // Name of the serial port

var PORT = null;
var NODES = [];
var LINKS = [];
var removeIdx = null;
var SerialPort = serialport.SerialPort;
var PRUNING = false;
var ADDING = false;

/*
 * ================= UTILITY FUNCTIONS =====================
 */

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeWithIndex(array, index) {
    array.splice(index, 1);
}

/*
 * ================= SERIAL DATA HANDLING =====================
 */

function Node(id) {
    this.id = id;
    this.type = getTypeById(id);
    this.timestamp = new Date();
}

function Link(source, target, value) {
    this.source = source;
    this.target = target;
    this.value = value;
}

function isTag(id) {
    if ((id%2 === 0) && (id !== 0)) {
        return true;
    }
    return false;
}

function isReceiver(id) {
    if (id%2 === 1) {
        return true;
    }
    return false;
}

function isServer(id) {
    if (id === 0) {
        return true;
    }
    return false;
}

function getTypeById(id) {
    // Types are 0: server, 1: receiver, 2: tag
    if (isTag(id)) {
        return 2;
    }
    else if (isReceiver(id)) {
        return 1;
    }
    else if (isServer(id)) {
        return 0;
    }
}

function findNodeWithId(id) {
    for (var i = 0; i < NODES.length; i++) {
        if (NODES[i].id == id) {
            return NODES[i];
        }
    }
    return null;
}

function findNodeIndex(node) {
    for (var i = 0; i < NODES.length; i++) {
        if (NODES[i].id == node.id) {
            return i;
        }
    }
    return null;
}

function getReceiverIndices() {
    var receivers = [];
    for (var i = 0; i < NODES.length; i++) {
        if (!isTag(NODES[i].id)) {
            receivers.push(i);
        }
    }
    return receivers;
}

function getTagIndices() {
    var tags = [];
    for (var i = 0; i < NODES.length; i++) {
        if (isTag(NODES[i].id)) {
            tags.push(i);
        }
    }
    return tags;
}

function getPreviousReceiverNodeIndex(idx) {
    var receivers = getReceiverIndices();
    var prevIdx = receivers.indexOf(idx) - 1;
    if (prevIdx >= 0) {
        return receivers[prevIdx];
    }
    return null;
}

function getNextReceiverNodeIndex(idx) {
    var receivers = getReceiverIndices();
    var nextIdx = receivers.indexOf(idx) + 1;
    if (nextIdx > 0 && nextIdx < receivers.length) {
        return receivers[nextIdx];
    }
    return null;
}

function addNode(node) {
    var receiverIndices = getReceiverIndices();

    if (isTag(node.id)) {
        // Can't add tags if there are no receivers,
        // wait for next advertisement
        if (receiverIndices.length !== 0) {
            var source = NODES.push(node) - 1;
            var target = receiverIndices[getRandomInt(0, receiverIndices.length-1)];
            addLink(source, target);
        }
    }
    else if (isReceiver(node.id)) {
        var source = receiverIndices[receiverIndices.length-1];
        var target = NODES.push(node) - 1;
        addLink(source, target);
    }
    else if (isServer(node.id)) {
        // Server doesn't have links
        NODES.push(node);
    }
}

function removeNode(node) {
    // Get the node array index
    var nodeIdx = findNodeIndex(node);

    // Remove the link that have this node as source/target
    removeLinksForNodeIndex(nodeIdx);

    // Nodes array will be one shorter now, so shift all the link
    // indices that point to nodes after the removed one since their node
    // indices are one smaller now
    for (var j = 0; j < LINKS.length; j++) {
        if (LINKS[j].source > nodeIdx) {
            LINKS[j].source = LINKS[j].source - 1;
        }
        if (LINKS[j].target > nodeIdx) {
            LINKS[j].target = LINKS[j].target - 1;
        }
    }

    // Remove the node from the NODES array
    console.log("### Removing node:");
    console.log(NODES[nodeIdx]);
    removeWithIndex(NODES, nodeIdx);
}

function addLink(source, target) {
    LINKS.push(new Link(source, target, 5));
}

function removeLinksForNodeIndex(nodeIdx) {
    var node = NODES[nodeIdx];
    var remove = [];

    // If this is a tag just remove the links
    if (isTag(node.id)) {
        for (var i = 0; i < LINKS.length; i++) {
            if (LINKS[i].source == nodeIdx || LINKS[i].target == nodeIdx) {
                remove.push(i);
            }
        }
    }
    else {
        var prevReceiverNodeIdx = getPreviousReceiverNodeIndex(nodeIdx);
        var nextReceiverNodeIdx = getNextReceiverNodeIndex(nodeIdx);

        for (var i = 0; i < LINKS.length; i++) {
            if (LINKS[i].source === nodeIdx) {
                if (isTag(NODES[LINKS[i].target].id)) {
                    LINKS[i].source = prevReceiverNodeIdx || nextReceiverNodeIdx;
                }
                else {
                    // If the receiver is the source for the receiver to receiver
                    // link just remove the link. We will update the link in the
                    // target branch if need be
                    remove.push(i);
                }
            }
            else if (LINKS[i].target === nodeIdx) {
                if (isTag(NODES[LINKS[i].source].id)) {
                    LINKS[i].target = prevReceiverNodeIdx || nextReceiverNodeIdx;
                }
                else {
                    // If this was a tag in the middle, fix the links
                    if (prevReceiverNodeIdx !== null && nextReceiverNodeIdx !== null) {
                        LINKS[i].target = prevReceiverNodeIdx;
                        LINKS[i].source = nextReceiverNodeIdx;
                    }
                    else {
                        remove.push(i);
                    }
                }
            }
        }
    }

    for (var i = 0; i < remove.length; ++i) {
        console.log("### Removing link:");
        console.log(LINKS[i]);
        removeWithIndex(LINKS, remove[i]);
    }
}

function pruneNodesArray() {
    PRUNING = true;

    var time = new Date();
    var node = null;

    var numNodes = NODES.length;
    var numDeadNodes = 0;

    console.log("### Pruning nodes @ " + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds());

    for (var i = 0; i < NODES.length; i++) {
        node = NODES[i];

        // Server has no liveness counter
        if (node.id === 0)
            continue;

        if (time - node.timestamp > TIMEOUT) {
            removeNode(node);
            numDeadNodes++;
        }
    }

    console.log("### Total nodes: " + numNodes + " dead: " + numDeadNodes + " alive: " + (numNodes - numDeadNodes));
    PRUNING = false;
}

/*
 * ===================== TEST FUNCTIONS =======================
 */
function initialize() {
    for (var i = 0; i < 11; ++i) {
        if (i === removeIdx)
            continue;
        receiveData(String(i) + "\r\n");
    }
}

setTimeout(function() {
    receiveData(String(11) + "\r\n");
}, 8000);

/*
 * ================= SERIAL PORT FUNCTIONS ====================
 */

// List available serial ports
serialport.list(function (err, ports) {
    console.log('### Available serial ports:');
    ports.forEach(function(port) {
        console.log(port.comName);
    });
});

/*
PORT = new SerialPort(PORT_NAME, {
   baudRate: 9600,
   // Each new packet should end in a return and newline
   parser: serialport.parsers.readline("\r\n")
});

PORT.on('open', showPortOpen);
PORT.on('data', saveLatestData);
PORT.on('close', showPortClose);
PORT.on('error', showError);
*/

function showPortOpen() {
   console.log('### Serial port open with baud rate: ' + PORT.options.baudRate);
}

function receiveData(data) {
    //console.log('### Received data from serial port: ' + data.trim());
    var id = parseInt(data.trim());
    var node = findNodeWithId(id);

    if (node) {
        node.timestamp = new Date();
    }
    else {
        node = new Node(id);
        ADDING = true;
        addNode(node);
        ADDING = false;
    }
}

function showPortClose() {
   console.log('### Serial port closed');
}

function showError(error) {
   console.log('### Serial port error: ' + error);
}

/*
 * ======================= EXPRESS FUNCTIONS ==========================
 */

var app = express();

app.set('view engine', 'html');
app.set('views', __dirname + '/html');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(HTML_DIR + 'index.html');
});

app.get('/data', function(req, res) {

    while (PRUNING || ADDING);

    res.json(JSON.parse(JSON.stringify({
        "nodes": NODES,
        "links": LINKS
    })));
});

setTimeout(function() {
    removeIdx = 1;
}, 10000);

setInterval(initialize, SEND_INTERVAL);
setInterval(pruneNodesArray, TIMEOUT);

app.listen(3000);
