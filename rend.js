var rend = function(spec){
    var that = {};

    that.feeder = spec.feeder;

    that.fg = spec.fg || "#BDE7FC";
    that.bg = spec.bg || "#041BB5";

    that.winpad = spec.winpad || 10;
    that.canw = spec.canw || $(window).width() - (that.winpad * 2);
    that.canh = spec.canh || $(window).height() - (that.winpad * 2);
    that.dst_box_height = 30;

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

        var boxes = that.get_can().selectAll(".dstbox")
            .data(that.feeder.get_dsts());
        
        boxes.enter()
            .append("svg:rect")
            .attr("x", function(d, i) { return that.winpad + host_width * i })
            .attr("y", -that.dst_box_height)
            .attr("class", "dstbox")
            .attr("id", function(d) { return "dst" + d } )
            .style("stroke", "grey")
            .attr("width", host_width)
            .attr("height", that.dst_box_height)
            .transition()
                .attr("fill", "none")
                .attr("y", that.winpad)
                .duration(2000);
        boxes.enter()
            .append("text")
            .attr("x", function(d, i) { return (that.winpad + host_width * i) + host_width / 2 })
            .attr("y", 10)
            .attr("dy", "1.3em")
            .attr("dx", "1em")
            .style("color", "white")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d) { return d });
        boxes.append("svg:circle")
            .data(that.feeder.get_dst_host_ports())
            .attr("cy", that.winpad + that.dst_box_height)
            .attr("cx", 1)
            .attr("r", 10);
    }

    that.paint_ports = function(dst, ports){
        data = feeder.get_dst_host_ports();
        for (d in data){ 
            console.log("#dst"+d);
            /*box = that.get_can().select(function(){return "#dst"+d});
            console.log(box);
            console.log(box.attr("x"));
            box.append("svg:circle")
                .attr("cy", that.winpad + that.dst_box_height)
                .attr("cx", 1)
                .attr("r", 1);*/
        }

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
        sets = {};

        for (d = 0; d <= data.length; d++){
           if (data.hasOwnProperty(d)){
               dport = data[d].dport;
               if (!sets.hasOwnProperty(data[d].dst)){
                   sets[data[d].dst] = {};
               }
               if (!sets[data[d].dst].hasOwnProperty(dport)){
                   sets[data[d].dst][dport] = 1;
               }
               else{
                   sets[data[d].dst][dport]++;
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

