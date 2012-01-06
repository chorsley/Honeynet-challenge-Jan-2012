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

    var time_scale = d3.scale.linear()
                     .domain([that.feeder.get_min_time(), that.feeder.get_max_time()])
                     .range([that.winpad, that.canw - that.winpad]);

    that.init = function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("width", that.canw)
        .attr("height", that.canh);
        that.paint_dsts(); 
        that.paint_ports();
        that.paint_srcs(); 
        that.paint_sweep();
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
   
    that.paint_sweep = function(){
        /*var currtime = that.feeder.get_time();
        console.log(time_scale(currtime), currtime);
        var x = 0;
        */
        var currtime = that.feeder.get_time();
        var sweep = that.get_can().selectAll(".sweep");
        /*console.log(sweep, sweep.empty());
        if (!sweep.empty()){
            console.log("x1",sweep.x1);
            x = sweep.attr("x1");

            sweep.transition()
                .attr("x1", time_scale(currtime))
                .attr("x2", time_scale(currtime))
                .duration(that.feeder.get_refresh_time());
        }
        else{*/
            sweep
               .data([time_scale(currtime)])
               .enter()
               .append("svg:line")
               .attr("class", "sweep") 
               .style("stroke", "lime")
               .attr("y1", 0)
               .attr("y2", that.canh)
               .attr("x1", function(d){ console.log("D", d);return d })
               .attr("x2", function(d){ console.log(d);return d })
               .transition()
                   .duration(10000)
                   .attr("x1", time_scale(that.feeder.get_max_time()))
                   .attr("x2", time_scale(that.feeder.get_max_time()));
        /*}*/
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
        //that.paint_sweep();
        console.log(that.feeder.get_refresh_time());
        if (that.feeder.is_running()){
            setTimeout(function(){that.redraw()}, that.feeder.get_refresh_time());
        }
    }

    return that;
};

var feeder = function(spec){

    var that = {};

    var data = spec.data;
    
    that.runtime = 5000;
    that.slottime = 100;

    that.dsts = [];
    that.srcs = [];
    that.dst_ports = [];
    that.conns = [];
    that.time_start;
    that.time_end;
    that.time = spec.time || 0;
    that.running = true;
    
    that.init = function(){
        // TODO: put all collection routines in single loop
        that.dsts = data.map(function(e,i,o){return e.dst}).unique(); 
        that.srcs = data.map(function(e,i,o){return e.src}).unique(); 
        that.dst_ports = that.map_dst_host_ports();
        that.init_timer();
        that.tick();
    }

    that.get_dsts = function(){
        return that.dsts;
    }

    that.get_srcs = function(){
        return that.srcs;
    }

    that.is_running = function(){
        return that.running;
    }

    that.get_dst_host_ports = function(){
        return that.dst_ports;
    }

    that.get_time = function(){
        return that.time;
    }

    that.get_refresh_time = function(){
        return that.slottime;
    }

    that.get_min_time = function(){
        return that.time_start;
    }

    that.get_max_time = function(){
        return that.time_end;
    }

    that.tick = function(){
        if (that.time < that.time_end){
            that.time = that.time + ((that.time_end - that.time_start) / (that.runtime / that.slottime));
            setTimeout(function(){that.tick()}, that.slottime); 
        }
        else{
            that.running = false;
        }
    }

    that.init_timer = function(){
        var max = data[0].time;
        var min = data[0].time;

        for (var d = 0; d < data.length; d++){
            if (data[d].time < min){
                min = data[d].time;
            }
            if (data[d].time > max){
                max = data[d].time;
            }
        }
        that.time = min;
        that.time_start = min;
        that.time_end = max;
    }

    that.map_dst_host_ports = function(){
        // could do it as an object of objects, but d3 wants an array of 
        // objects
        var sets = [];

        for (var d = 0; d < data.length; d++){
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

