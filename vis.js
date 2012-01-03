var rend = function(spec){
    var that = {};
    that.canw = spec.canw;
    that.canh = spec.canh;
    that.winpad = spec.winpad || 10;
    that.s = null;
    that.hosts = [];

    that.init: function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("width", canw)
        .attr("height", canh);
    }

    that.add_host: function(){
        that.hosts.push(draw_host_rect());
        var host_width = that.canw / (that.hosts.length);
        for (var host = 0; host < that.hosts.length; host++){
            that.hosts[host].transition()
                .attr("width", host_width)
                .attr("x", that.winpad + host_width * host)
                .duration(1000);
        }
    }

    that.draw_host_rect: function(){
        var a = that.s.append("svg:rect")
            .style("stroke", "gray")
            .style("fill", "white")
            .attr("width", 50)
            .attr("height", 40)
            .attr("x", 0)
            .attr("y", 0);
        a.append("svg:rect")
            .attr("width", 30)
            .attr("height", 20)
            .style("stroke", "gray")
            .style("fill", "black")
            .attr("x", 10)
            .attr("y", 10);
        return a;
    }

    return that;
};
