var rend = function(spec){
    var that = {};

    that.feeder = spec.feeder;

    that.fg = spec.fg || "#BDE7FC";
    that.bg = spec.bg || "#041BB5";

    that.winpad = spec.winpad || 10;
    that.canw = spec.canw || $(window).width() - (that.winpad * 2);
    that.canh = spec.canh || $(window).height() - (that.winpad * 2);
    that.dst_box_height = 30;
    that.port_rad = 15;

    that.s = null;

    var src_y_scale = d3.scale.linear()
                      .domain([0, that.feeder.get_srcs().length])
                      .range([200, that.canh]);
    
    that.init = function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("width", that.canw)
        .attr("height", that.canh);
        that.redraw();
    }

    that.get_can = function(){
        return that.s;
    }

    that.get_src_line_height = function(n){
        return src_y_scale(n + 1 / that.feeder.get_srcs().length); 
    }

    that.get_host_box_width = function(n){
        return (that.canw - that.winpad * 2) / (that.feeder.get_dsts().length);
    }
    
    that.paint_srcs = function(){
        var srcs = that.get_can().selectAll(".srclines")
           .data(that.feeder.get_srcs());

        srcs.enter()
           .append("svg:line")
           .attr("class", "srclines")
           .style("stroke", "grey")
           .attr("x1", that.winpad)
           .attr("y1", function(d, i){ return that.get_src_line_height(i) })
           .attr("x2", that.canw)
           .attr("y2", function(d, i){ return that.get_src_line_height(i) });
        srcs.enter()
            .append("text")
            .attr("x", 0)
            .attr("y", function(d, i){ return that.get_src_line_height(i) })
            .attr("dy", "1em")
            .attr("dx", "1em")
            .style("color", "white")
            .attr("class", "src-line-label")
            .attr("text-anchor", "right")
            .text(function(d) { return d });
    }

    that.paint_dsts = function(){
        var host_width = that.get_host_box_width();
        var sets = that.feeder.get_dst_host_ports();

        var nest = d3.nest()
            .key(function(d) { return d.dst })
            .entries(sets);

        console.log("nest", nest);

        var dstsg = that.get_can().selectAll(".dst-group")
            .data(nest).enter()
            .append("svg:g")
            .attr("class", "dst-group")
            .attr("transform", function (d,i){ return "translate("+ (that.winpad + host_width * i) +", "+that.winpad+")"});
        
        var boxes = dstsg.selectAll(".dst-box")
            .data(function(d, i){ return(d.values)})
            .enter()
            .append("svg:rect")
            .attr("x", function(d, i) { return 0 })
            .attr("y", -that.dst_box_height)
            .attr("class", "dst-box")
            .attr("id", function(d) { return "dst" + d } )
            .style("stroke", "grey")
            .attr("width", host_width)
            .attr("height", that.dst_box_height)
            .transition()
                .attr("fill", "none")
                .attr("y", that.winpad)
                .duration(2000);

        dstsg.selectAll(".dst-box-label")
            .data(function(d, i){ return(d.values)})
            .enter()
            .append("text")
            .attr("x", host_width / 2)
            .attr("y", that.dst_box_height / 2)
            .attr("dy", "1.3em")
            .attr("dx", "1em")
            .style("color", "white")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d,i) { return d.dst });
        

    }

    that.paint_ports = function(dst, ports){
        var circles = d3.selectAll(".dst-group")
            .selectAll(".dportbox")
            //.data(function(d, i){ return sets[i]["ports"]})
            //.data(function(d, i){ console.log("1", d.values.map(function(e){ return e.ports }));return d.values.map(function(e){ return [e.ports] })})
            .data(function(d, i){ return  d.values[0].ports})
            .enter().append("svg:circle")
            .attr("cy", that.dst_box_height + that.port_rad + that.winpad )
            .attr("cx", function (d, i){ console.log("xpos", d, i); return (that.port_rad * 2 * i + that.port_rad)  })
            .attr("fill", "none")
            .attr("stroke", "grey")
            .text(function(d, i) { d })
            .attr("color", "white")
            .attr("r", that.port_rad);
        d3.selectAll(".dst-group").selectAll(".dportlabel")
            .data(function(d, i){ return  d.values[0].ports})
            .enter()
            .append("text")
            .attr("y", that.dst_box_height + that.port_rad + that.winpad )
            .attr("x", function (d, i){ console.log("xpos", d, i); return (that.port_rad * 2 * i + that.port_rad)  })
            .attr("dy", "0.3em")
            .attr("dx", "0em")
            .style("color", "white")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d,i) { return d });
 
    }

    that.redraw = function(){
        that.paint_dsts(); 
        that.paint_ports();
        that.paint_srcs(); 
    }

    return that;
};

var feeder = function(spec){

    var that = {};

    var data = spec.data;
    var speed = 1;
    var time = spec.time || 0;

    that.dsts = [];
    that.srcs = [];
    that.dst_ports = [];
    that.conns = [];
    
    that.init = function(){
        // TODO: put all collection routines in single loop
        that.dsts = data.map(function(e,i,o){return e.dst}).unique(); 
        that.srcs = data.map(function(e,i,o){return e.src}).unique(); 
        that.dst_ports = that.map_dst_host_ports();
    }

    that.get_dsts = function(){
        return that.dsts;
    }

    that.get_srcs = function(){
        return that.srcs;
    }

    that.get_dst_host_ports = function(){
        return that.dst_ports;
    }

    that.map_dst_host_ports = function(){
        // could do it as an object of objects, but d3 wants an array of 
        // objects
        var sets = [];

        for (var d = 0; d <= data.length; d++){
           if (data.hasOwnProperty(d)){
               var dport = data[d].dport;
               var dst = data[d].dst;
               var dst_pos = -1;
               var dst_port_pos = -1;
               
               for (var i = 0; i < sets.length; i++){
                    if (sets[i].dst == dst){
                        dst_pos = i;
                        break;
                    }
               }
               if (dst_pos == -1){
                   sets.push({"dst": dst, "ports": []});
                   dst_pos = sets.length - 1;
               }
               
               for (var i = 0; i < sets[dst_pos]["ports"].length; i++){
                    if (sets[dst_pos].ports[i] == dport){
                        dst_port_pos = i;
                        break;
                    }
               }
               if (dst_port_pos == -1){
                   sets[dst_pos]["ports"].push(dport);    
               }
            }
        }
        return sets;
    }

    return that;
}

Array.prototype.unique = function() {
    var o = {}, i, l = this.length, r = [];
    for(i=0; i<l;i+=1) o[this[i]] = this[i];
    for(i in o) r.push(o[i]);
    return r;
};

