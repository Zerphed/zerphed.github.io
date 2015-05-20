$(function() {

    var graph;
    var host = window.location;

    function myGraph(el) {

        // Add and remove elements on the graph object
        this.addNode = function (node) {
            nodes.push(node);
            this.update();
        };

        this.removeNode = function (id) {
            var i = 0;
            var n = findNode(id);
            while (i < links.length) {
                if ((links[i]['source'] == n)||(links[i]['target'] == n))
                {
                    links.splice(i,1);
                }
                else i++;
            }
            nodes.splice(findNodeIndex(id),1);
            this.update();
        };

        this.removeLink = function(source, target) {
            for(var i=0; i<links.length; i++)
            {
                if(links[i].source == source && links[i].target == target)
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
                    var types = ["Server", "Repeater", "Tag"];
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

    fetch(host + 'data')
        .then(function(response) {
            return response.json();
        }).then(function(json) {

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
    fetch(host + 'data')
        .then(function(response) {
            return response.json();
        }).then(function(json) {
            // Remove all nodes and links
            graph.removeAllNodes();
            graph.removeAllLinks();

            // Add the new nodes
            for (var n in json.nodes) {
                var node = json.nodes[n];
                graph.addNode(node);
            }

            // Add the new links
            for (var l in json.links) {
                var link = json.links[l];
                graph.addLink(link);
            }
        }).then(function() {
            // Update the graph
            graph.update();
        });
}, 5000);

});
