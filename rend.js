var rend = function(spec){
    var that = {};

    that.fg = spec.fg || "#BDE7FC";
    that.bg = spec.bg || "#041BB5";
    that.winpad = spec.winpad || 10;
    that.canw = spec.canw || $(window).width() - (that.winpad * 2);
    that.canh = spec.canh || $(window).height() - (that.winpad * 2);
    that.s = null;
    that.hosts = [];

    that.init = function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("width", that.canw)
        .attr("height", that.canh);
    }

    that.get_canvas = function(){
        return that.s;
    }

    that.add_host = function(){
        that.hosts.push(that.draw_host_rect());
        var host_width = (that.canw - that.winpad * 2) / (that.hosts.length);
        for (var host = 0; host < that.hosts.length; host++){
            that.hosts[host].transition()
                .attr("width", host_width)
                .attr("x", that.winpad + host_width * host)
                .duration(1000);
        }
    }

    that.draw_host_rect = function(){
        var a = that.s.append("svg:rect")
            .style("stroke", that.fg)
            .style("fill", that.bg)
            .attr("width", 50)
            .attr("height", 40)
            .attr("x", 0)
            .attr("y", 0)
            .text("127.0.0.1");
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

// working update code using data

/*function redraw(){
        rend.get_canvas()
        .selectAll("rect")
        .data(hosts)
        .enter()
        .append("svg:rect")
        .attr("x", function(d, i) { return d * 20 })
        //.attr("x", 10)
        .attr("y", 10)
        .style("stroke", "grey")
        .attr("width", 50)
        .attr("height", 50)

        rend.get_canvas()
        .selectAll("rect")
        .data(hosts).exit().remove();
    }

    redraw();

    setTimeout("hosts.push(10); redraw()", 1000);
    setTimeout("hosts.pop(); redraw()", 2000);
*/

