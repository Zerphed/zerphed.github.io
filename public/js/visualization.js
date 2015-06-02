$(function() {

    var graph;
    var host = window.location;

    function myGraph(el) {

        // Previous data in JSON format for difference comparison
        this.prevJsonData = null;

        // Add and remove elements on the graph object
        this.addNode = function (node) {
            nodes.push(node);
            this.update();
        };

        this.addNodeWithId = function(id) {
            var type = null;

            if (id === 0) {
                type = 0;
            }
            else if (id%2 === 0) {
                type = 2;
            }
            else {
                type = 1;
            }

            nodes.push({"id": id, "type": type});
        }

        this.removeNode = function (id) {
            var i = 0;
            var n = this.findNode(id);
            while (i < links.length) {
                if ((links[i]['source'] == n)||(links[i]['target'] == n))
                {
                    links.splice(i,1);
                }
                else i++;
            }
            nodes.splice(this.findNodeIndex(id),1);
            this.update();
        };

        this.removeLink = function(source, target) {
            for (var i=0; i < links.length; i++)
            {
                if (links[i].source === source && links[i].target === target)
                {
                    links.splice(i,1);
                    break;
                }
            }
            this.update();
        };

        this.removeAllLinks = function() {
            links.splice(0, links.length);
        };

        this.removeAllNodes = function() {
            nodes.splice(0, nodes.length);
        };

        this.addLink = function(link) {
            links.push(link);
            this.update();
        };

        this.findNode = function(id) {
            for (var i in nodes) {
                if (nodes[i]["id"] === id) {
                    return nodes[i];
                }
            }
        };

        this.findNodeIndex = function(id) {
            for (var i=0; i < nodes.length; i++) {
                if (nodes[i].id === id) {
                    return i;
                }
            }
        };

        // set up the D3 visualisation in the specified element
        var w = parseInt($('#visualization-container').width()),
            h = parseInt($('#visualization').height());
        var vis = d3.select("#visualization-container")
            .append("svg:svg")
            .attr("width", w)
            .attr("height", h)
            .attr("id","svg")
            .attr("pointer-events", "all")
            .attr("viewBox","0 0 "+w+" "+h)
            .attr("perserveAspectRatio","xMinYMid")
            .append('svg:g');


        vis.append("g").attr("class", "links");
        vis.append("g").attr("class", "nodes");

        var force = d3.layout.force();

        var nodes = force.nodes(),
            links = force.links();

        this.update = function() {
            var link = vis.select(".links").selectAll("line")
                .data(links, function(d) {
                    return d.source.id + "-" + d.target.id;
                });

            link.enter().append("line")
                .attr("id",function(d){return d.source.id + "-" + d.target.id;})
                .attr("class", "link")
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

            link.exit().remove();

            var node = vis.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;});

            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .call(force.drag);

            nodeEnter.append("svg:circle")
                .attr("r", 16)
                .attr("id",function(d) { return "Node;"+d.id;})
                .attr("class","nodeStrokeClass")
                .style("fill", function(d) {
                    var typeColors = ["#f90706", "#ffa10f", "#1f9bc9"]
                    return typeColors[d.type];
                });

            nodeEnter.append("svg:text")
                .attr("class", "text")
                .attr("dx", "1.3em")
                .attr("dy", "0.3em")
                .text(function(d) {
                    var types = ["Server", "Receiver", "Tag"];
                    return types[d.type] + " id: " + d.id;
                });

            node.exit().remove();
            force.on("tick", function() {

                node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y         + ")"; });

                link.attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; });
            });

            // Restart the force layout.
            force
            .charge(-1200)
            .linkDistance(90)
            .size([w, h])
            .start();
        };


    // Make it all go
    this.update();
}

function initGraph()
{
    graph = new myGraph("#visualization-container");

    $.getJSON(host + 'data')
        .done(function(json) {

            // Duplicate the JSON object in initialization
            graph.prevJsonData = JSON.parse(JSON.stringify(json));

            for (var n in json.nodes) {
                var node = json.nodes[n];
                graph.addNode(node);
            }

            for (var l in json.links) {
                var link = json.links[l];
                graph.addLink(link);
            }
        }).then(function() {
            graph.update();
        });
}

initGraph();

setInterval(function() {
    $.getJSON(host + 'data')
        .done(function(json) {

            // Replace the previous JSON data with the new
            var prevJsonData = graph.prevJsonData;
            graph.prevJsonData = json;

            // Check which nodes are to be added and which removed
            var prevNodeIds = _.map(prevJsonData.nodes, function(n) { return n.id; });
            var nextNodeIds = _.map(json.nodes, function(n) { return n.id; });
            var addedNodeIds = _.difference(nextNodeIds, prevNodeIds);
            var removedNodeIds = _.difference(prevNodeIds, nextNodeIds);

            // Remove and add the appropriate nodes
            for (var i in removedNodeIds) {
                graph.removeNode(removedNodeIds[i]);
            }

            for (var i in addedNodeIds) {
                graph.addNodeWithId(addedNodeIds[i]);
            }

            // Check which links are to be added and which removed
            var prevLinks = _.map(prevJsonData.links, function(l) { return (String(l.source) + "-" + String(l.target)); });
            var nextLinks = _.map(json.links, function(l) { return (String(l.source) + "-" + String(l.target)); });
            var addedLinks = _.difference(nextLinks, prevLinks);
            var removedLinks = _.difference(prevLinks, nextLinks);

            // CRUFTY HACK XXXXX
            // If there are many updated links, just rebuild the thing
            if (removedLinks.length > 3) {
                graph.removeAllLinks();
                for (var i in json.links) {
                    var link = json.links[i];
                    graph.addLink(link);
                }
            }
            // If there are only a few, handle it properly
            else {
                // Remove and add the appropriate links
                for (var i in removedLinks) {
                    var values = removedLinks[i].split("-");
                    graph.removeLink(parseInt(values[0]), parseInt(values[1]));
                }

                for (var i in addedLinks) {
                    var values = addedLinks[i].split("-");
                    graph.addLink({"source": parseInt(values[0]), "target": parseInt(values[1]), "value": 5});
                }
            }
        });
}, 5000);

});
