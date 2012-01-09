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
    that.cached_colors = {};

    that.s = null;

    var src_y_scale = d3.scale.linear()
                      .domain([0, that.feeder.get_data().map(function(e){ return e.src}).unique().length])
                      .range([150, that.canh]);

    var time_scale = d3.scale.linear()
                     .domain([that.feeder.get_min_time(), that.feeder.get_max_time()])
                     .range([that.winpad, that.canw - that.winpad]);

    var port_color_scale = d3.scale.category20();
    var host_color_scale = d3.scale.category20b();

    that.init = function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("width", that.canw)
        .attr("height", that.canh);

        that.paint_dsts(); 
        that.paint_ports();
        that.paint_sweep();
        that.paint_time_hud();
        that.paint_data_hud();
        that.redraw();
    }

    that.get_can = function(){
        return that.s;
    }

    that.get_src_line_height = function(n){
        console.log( that.feeder.get_data().length, n, src_y_scale(n));
        return src_y_scale(n);
        //return src_y_scale(n + 1 / that.feeder.get_srcs().length); 
    }

    that.get_host_box_width = function(n){
        return (that.canw - that.winpad * 2) / (that.feeder.get_dsts().length);
    }
  
    that.paint_time_hud = function(){
        var time_elem = that.get_can().selectAll(".time");
            
            time_elem.data([that.feeder.get_time()])
            .enter()
            .append("svg:text")
            .attr("class", "hud time")
            .attr("x", that.winpad)
            .attr("y", that.winpad)
            .attr("dy", "0.3em")
            .attr("text-anchor", "left");
            //.text(function(d){ return d });

        time_elem.transition()
            .text(function(d){ var d = new Date(); d.setTime(that.feeder.get_time() * 1000); return d});
    }

    that.paint_data_hud = function(){

    }

    that.paint_sweep = function(){
       var currtime = that.feeder.get_time();
       var sweep = that.get_can().selectAll(".sweep");
       sweep
           .data([time_scale(currtime)])
           .enter()
           .append("svg:line")
           .attr("class", "sweep") 
           .attr("id", "sweep")
           .style("stroke", "black")
           .attr("y1", 0)
           .attr("y2", that.canh)
           .attr("x1", function(d){ return d })
           .attr("x2", function(d){ return d })
           .transition()
               .ease("linear")
               .duration(that.feeder.get_runtime())
               .attr("x1", time_scale(that.feeder.get_max_time()))
               .attr("x2", time_scale(that.feeder.get_max_time()));
    }

    that.paint_conns = function(){
        var conns = that.feeder.get_conns();

        var conn_lines = that.get_can().selectAll(".connline")
            .data(conns);

        conn_lines.enter()
            .append("svg:line")
            .style("stroke", function(d,i){
                if (that.cached_colors.hasOwnProperty(d.dport)){
                    return that.cached_colors[d.dport];
                }
                else{
                    return port_color_scale(i);
                }
            })
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", function(d){
                    if (!d.valid){
                        return [10,10];
                    }
                    else{
                        return "none";
                    }
            })
            .attr("class", "connline")
            .attr("desc", "Test")
            .on("mouseover", function(d){ console.log("trigger", d)})
            .attr("title", "Test")
            .attr("y1", function(d, i) { 
                return (that.get_line_attr(that.css_safen("#src"+d.src)).y);
            })
            .attr("y2", function(d, i) { 
                return (that.get_line_attr(that.css_safen("#src"+d.src)).y);
            })
            .attr("x1", function(d) {return time_scale(d.time) })
            .attr("x2", function(d) {return time_scale(d.time) })
            .transition()
                .ease("linear")
                .duration(500)
                .attr("x2", function (d) { 
                    return that.get_circle_attr(d.dst, d.dport).cx 
                })
                .attr("y2", function(d,i){ 
                    return that.get_circle_attr(d.dst, d.dport).cy + that.port_rad
                });
    }

    that.get_circle_attr = function(dst, dport){
        // need to translate back from the svg group co-ords:
        // is there a nicer way to do this?
        var elemref = d3.select(that.css_safen("#port" + dst + "_" + dport));
        var gref = d3.select(that.css_safen("#dst-group" + dst));

        return({cy:(+elemref.attr("cy")) + (+gref.attr("y")), 
                cx:(+elemref.attr("cx")) + (+gref.attr("x"))});
    }

    that.get_line_attr = function(elem){
        var elemref = d3.select(elem);
        if (elemref.empty()){
            console.log("Warn: " + elem + " is empty"); 
            return;
        }
        else{
            var bbox = elemref.node().getBBox();
            return ({x:bbox.x, y:bbox.y, width:bbox.width, height:bbox.height});
        }
    }

    that.paint_srcs = function(){
        var srcs = that.get_can().selectAll(".srclines")
           .data(that.feeder.get_srcs());

        srcs.enter()
           .append("svg:line")
           .attr("class", "srclines_base")
           .attr("id", function(d) { return that.css_safen("srcbase" + d) } )
           .style("stroke", "#CCCCCC")
           .attr("stroke-dasharray",  [5,5])
           .attr("x1", function(d){ 
              return that.winpad
           })
           .attr("y1", function(d, i){ return that.get_src_line_height(i) })
           .attr("x2", function(d) { 
              return time_scale(that.feeder.get_src_times()[d].max) + 5
           })
           .attr("y2", function(d, i){ return that.get_src_line_height(i) });
 
        srcs.enter()
           .append("svg:line")
           .attr("class", "srclines")
           .attr("id", function(d) { return that.css_safen("src" + d) } )
           .style("stroke", "black")
           .attr("x1", function(d){ 
              return time_scale(that.feeder.get_src_times()[d].min) - 5
           })
           .attr("y1", function(d, i){ return that.get_src_line_height(i) })
           .attr("x2", function(d) { 
              return time_scale(that.feeder.get_src_times()[d].max) + 5
           })
           .attr("y2", function(d, i){ return that.get_src_line_height(i) });

        srcs.enter()
            .append("text")
            //.attr("x", that.get_line_attr("#sweep").x)
            .attr("x", that.can_w)
            .attr("y", function(d, i){ return that.get_src_line_height(i) })
            .attr("dy", "1em")
            .attr("dx", "0em")
            .style("fill", "white")
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

        var dstsg = that.get_can().selectAll(".dst-group")
            .data(nest).enter()
            .append("svg:g")
            .attr("id", function (d) { return that.css_safen("dst-group" + d.key)})
            .attr("class", "dst-group")
            .attr("fill", function(d,i){ return port_color_scale(i)})
            .attr("x", function (d,i){ return (that.winpad + host_width * i) })
            .attr("y", function (d,i){ return that.winpad })
            .attr("transform", function (d,i){ return "translate("+ (that.winpad + host_width * i) +", "+that.winpad+")"});
        
        var boxes = dstsg.selectAll(".dst-box")
            .data(function(d, i){ return(d.values)})
            .enter()
            .append("svg:rect")
            .attr("x", function(d, i) { return 0 })
            .attr("y", that.winpad)
            .attr("class", "dst-box")
            .attr("id", function(d) { return that.css_safen("dst" + d.dst) } )
            .style("stroke", "grey")
            .attr("fill", function(d,i){ return host_color_scale(i)})
            .attr("width", host_width)
            .attr("height", that.dst_box_height);

        dstsg.selectAll(".dst-box-label")
            .data(function(d, i){ return(d.values)})
            .enter()
            .append("text")
            .attr("x", host_width / 2)
            .attr("y", that.dst_box_height / 2)
            .attr("dy", "1em")
            .attr("dx", "0.5em")
            .attr("fill", "lightgray")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d,i) { return d.dst });
        

    }

    that.paint_ports = function(dst, ports){
        var circles = d3.selectAll(".dst-group")
            .selectAll(".dportbox")
            .data(function(d, i){ 
                return(  
                    d.values[0].ports.map(function (e,i,o){ 
                        return { dst: d.values[0].dst, dport: e }
                    })
                )
            })
            .enter().append("svg:circle")
            .attr("cy", that.dst_box_height + that.port_rad + that.winpad )
            .attr("title", "Test")
            .attr("cx", function (d, i){ return (that.port_rad * 2 * i + that.port_rad)  })
            .attr("id", function (d) { return that.css_safen("port" + d.dst + "_" + d.dport) })
            .style("fill", function(d,i){
                if (that.cached_colors.hasOwnProperty(d.dport)){
                    return that.cached_colors[d.dport];
                }
                else{
                    that.cached_colors[d.dport] = port_color_scale(Object.size(that.cached_colors));
                    return that.cached_colors[d.dport];
                }
            })
            .attr("stroke", "grey")
            .text(function(d) { d.dport })
            .attr("color", "white")
            .attr("r", that.port_rad);
        d3.selectAll(".dst-group").selectAll(".dportlabel")
            .data(function(d){ return  d.values[0].ports})
            .enter()
            .append("text")
            .attr("y", that.dst_box_height + that.port_rad + that.winpad )
            .attr("x", function (d, i){ return (that.port_rad * 2 * i + that.port_rad)  })
            .attr("dy", "0.3em")
            .attr("dx", "0em")
            .style("fill", "white")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d,i) { return d });
    }

    that.redraw = function(){
        that.paint_srcs(); 
        that.paint_conns();
        that.paint_time_hud();
        //if (that.feeder.is_running()){
        setTimeout(function(){that.redraw()}, that.feeder.get_refresh_time());
        //}
    }

    that.css_safen = function(s){
        return s.replace(/\./g, "_");
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
    that.src_times = {};
    that.dst_ports = [];
    that.conns_colors = [];
    that.time_start;
    that.time_end;
    that.time = spec.time || 0;
    that.running = true;
    
    that.init = function(){
        // TODO: put all collection routines in single loop
        that.dsts = data.map(function(e){return e.dst}).unique(); 
        //that.srcs = data.map(function(e){return e.src}).unique(); 
        that.dst_ports = that.map_dst_host_ports();
        that.init_timers();
        that.tick();
    }

    that.get_data = function(){
        return data;
    }

    that.get_conns = function(){
        return that.conns;
    }

    that.get_dsts = function(){
        return that.dsts;
    }

    that.get_srcs = function(){
        return that.srcs;
    }

    that.get_src_times = function(){
        return that.src_times;
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

    that.get_runtime = function(){
        return that.runtime;
    }

    that.get_min_time = function(){
        return that.time_start;
    }

    that.get_max_time = function(){
        return that.time_end;
    }

    that.tick = function(){
        that.conns = [];

        if (that.time < that.time_end){
            that.time = that.time + ((that.time_end - that.time_start) / (that.runtime / that.slottime));
            
            that.conns = that.find_events_older_than(that.time);
            setTimeout(function(){that.tick()}, that.slottime); 
        }
        else{
            that.running = false;
        }
    }

    that.find_events_older_than = function(time){
            var found_events = [];
            for (var i = 0; i < data.length; i++){
                if (data[i].time <= time){
                    found_events.push(data[i]);
                }
               // data must be sorted by time for efficiency
                else{
                    break;
                }
               
                if (that.srcs.indexOf(data[i].src) < 0){
                    that.srcs.push(data[i].src);
                }
 
            }
            return found_events;
    }

    that.init_timers = function(){
        var max = data[0].time;
        var min = data[0].time;

        for (var d = 0; d < data.length; d++){
            if (data[d].time < min){
                min = data[d].time;
            }
            if (data[d].time > max){
                max = data[d].time;
            }
            if (!that.src_times.hasOwnProperty(data[d].src)){
                that.src_times[data[d].src] = {
                    min: data[d].time,
                    max: data[d].time,
                }
            }    
            else{
                if (that.src_times[data[d].src].min > data[d].time){
                    that.src_times[data[d].src].min = data[d].time;
                }
                
                if (that.src_times[data[d].src].max < data[d].time){
                    that.src_times[data[d].src].max = data[d].time;
                }
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

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
