$(function () {
    var width = parseInt($('#visualization-container').width())
      , height = parseInt($('#visualization').height());

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-1200)
        .linkDistance(90)
        .size([width, height]);

    var svg = d3.select("#visualization-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    var host = window.location;

      d3.json(host + 'data', function(error, graph) {
    force
        .nodes(graph.nodes)
        .links(graph.links)
        .start();

    var link = svg.selectAll(".link")
        .data(graph.links)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });

    var gnode = svg.selectAll("g.gnode")
        .data(graph.nodes)
      .enter().append("g")
        .classed("gnode", true);

    var node = gnode.append("circle")
        .attr("class", "node")
        .attr("r", 15)
        .style("fill", function(d) {
            var typeColors = ["#f90706", "#ffa10f", "#1f9bc9"]
            return typeColors[d.type];
        })
        .call(force.drag);

    var labels = gnode.append("text")
        .attr("dx", "1.3em")
        .attr("dy", "0.3em")
        .text(function(d) {
            var types = ["Server", "Repeater", "Tag"];
            return types[d.type] + " id: " + d.id;
        });

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      gnode.attr("transform", function(d) {
        return "translate(" + [d.x, d.y] + ")";
      });
    });
    });
});
