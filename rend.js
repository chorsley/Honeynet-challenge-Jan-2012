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
    that.highlights = {};
    that.status_msg;
    that.conn_area_y = 150;
    that.conn_line_pad = 2;
    that.inactive_opactity = 0.3;
    that.sweep_transition_time = 1000;
    that.infobox = infobox();

    that.s = null;

    /*var src_y_scale = d3.scale.linear()
                      .domain([0, that.feeder.get_data().map(function(e){ return e.src}).unique().length])
                      .range([that.conn_area_y, that.canh]);*/
    var src_y_scale = d3.scale.linear()
                      .domain([0, that.feeder.get_srcs().length])
                      .range([that.conn_area_y, that.canh]);

    var time_scale = d3.scale.linear()
                     .domain([that.feeder.get_sweep_start_time(), that.feeder.get_sweep_end_time()])
                     .range([that.winpad, that.canw - that.winpad]);
    var src_trust = d3.scale.quantile()
                     .domain([0, 0.001, 0.5, 1])
                     .range([
                         {color: "black", desc:"No valid connections"},
                         {color: "red", desc: "Suspect: low % valid connections"},
                         {color: "white", desc: "Suspicious: significant % of invalid connections" },
                         {color: "green", desc: "Mostly valid connections"}]);

    var port_color_scale = d3.scale.category20();
    var host_color_scale = d3.scale.category20b();

    that.init = function(){
        that.s = d3.select("#viz")
        .append("svg:svg")
        .attr("class", "bgcanvas")
        .attr("width", that.canw)
        .attr("height", that.canh)
        .on("click", function(d, i){
            // clear all highlights if you click canvas
           if (d3.event.target.tagName == "svg"){
                that.set_highlights();
                that.redraw();
           }
           if (d3.event.target.className.baseVal != "src-line-label"){
                that.infobox.unset();
           }
           else{
              
           }
       });

        that.paint_dsts(); 
        that.paint_ports();
        that.paint_time_hud();
        that.paint_start_sweep();
        that.paint_end_sweep();
        that.redraw();
    }

    that.redraw = function(){
        src_y_scale.domain([0, that.feeder.get_srcs().length]);
        that.paint_srcs();
        //that.paint_conns();
        that.paint_time_hud();
        that.paint_data_hud("");
        that.feeder.update_data();
        //setTimeout(function(){that.redraw()}, that.feeder.get_refresh_time());
    }


    that.set_highlights = function(type, value){
        for (var k in that.highlights){
            delete that.highlights[k];
        }

        if (type && value){
            that.highlights[type] = value;
        }

    }

    that.get_can = function(){
        return that.s;
    }

    that.get_src_line_y = function(n){
        return src_y_scale(n);
    }

    that.get_src_line_height = function(){
        return src_y_scale(1) - src_y_scale(0);
    }

    that.get_host_box_width = function(n){
        return (that.canw - that.winpad * 2) / (that.feeder.get_dsts().length);
    }
  
    that.paint_time_hud = function(){
        var time_elem = that.get_can().selectAll(".time");
            
            time_elem.data([1])
            .enter()
            .append("svg:text")
            .attr("class", "hud time")
            .attr("x", that.winpad)
            .attr("y", that.winpad)
            .attr("dy", "0.3em")
            .attr("text-anchor", "left");
            //.text(function(d){ return d });

        time_elem.transition()
            .text(function(d){ 
                var start_date = new Date(); 
                start_date.setTime(that.feeder.get_sweep_start_time() * 1000); 
                var end_date = new Date(); 
                end_date.setTime(that.feeder.get_sweep_end_time() * 1000); 
                return (start_date + " - " + end_date);
            });
    }

    that.paint_data_hud = function(t){
        var data_hud = that.get_can().selectAll("#data-hud")
            .data([t])
            .enter()
            .append("svg:text")
            .attr("id", "data-hud")
            .attr("class", "hud")
            .attr("x", that.winpad)
            .attr("y", that.canh)
            .text(t);
    }

    that.paint_end_sweep = function(){
       var time = that.feeder.get_sweep_end_time();

       sweep = that.paint_sweep("end", time, that.update_end_sweep);
       
       sweep
           .attr("x1", time_scale(that.feeder.get_sweep_end_time()))
           .attr("x2", time_scale(that.feeder.get_sweep_end_time()));

    }

    that.update_end_sweep = function(x){
        var max_bound = d3.min([time_scale.invert(x), 
                time_scale.invert(that.canw)]);

        that.feeder.set_sweep_end_time(
            d3.max([
                max_bound,
                that.feeder.get_sweep_start_time() 
            ])
        );
        that.paint_end_sweep();
    }

    that.paint_start_sweep = function(){
       var time = that.feeder.get_sweep_start_time();

       sweep = that.paint_sweep("start", time, that.update_start_sweep);
       
       sweep
           .attr("x1", time_scale(that.feeder.get_sweep_start_time()))
           .attr("x2", time_scale(that.feeder.get_sweep_start_time()));

    }

    that.update_start_sweep = function(x){
        //that.feeder.set_sweep_start_time(time_scale.invert(x));
        var min_bound = d3.max([time_scale.invert(x), 
        time_scale.invert(that.winpad)]);

        that.feeder.set_sweep_start_time(
            d3.min([
                min_bound,
                that.feeder.get_sweep_end_time() 
            ])
        );
        that.paint_start_sweep();
    }


    that.paint_sweep = function(sweep_type, time, sweep_updater){

       var sweep = that.get_can().selectAll("#sweep" + sweep_type);
       sweep
           .data([time_scale(time)])
           .enter()
           .append("svg:line")
           .attr("class", "sweep") 
           .attr("id", "sweep" + sweep_type)
           .style("stroke", "#666666")
           .style("stroke-width", 3)
           .attr("tooltip", "bing")
           .attr("y1", that.conn_area_y - 100)
           .attr("y2", that.canh)
           .attr("x1", function(d){ return d })
           .attr("x2", function(d){ return d })
           .call(d3.behavior.drag()
               .on("dragend", function(d){
                   that.feeder.update_data();
                   that.redraw();
               })
               .on("drag", function(d){
                   sweep_updater(d3.event.x);
                   that.paint_time_hud();
               })
           )
           //.transition()
           //    .ease("linear")
           //    .duration(that.feeder.get_runtime())
           //    .attr("x1", time_scale(that.feeder.get_sweep_end_time()))
           //    .attr("x2", time_scale(that.feeder.get_sweep_end_time()));

           return sweep;
    }

    that.paint_conns = function(){
        var conn_lines = that.get_can().selectAll(".connline")
            .data(that.feeder.get_conns());/*,
                  function(d) { 
                    return (d.dport + d.src + d.time + d.dst)
                  });*/

        var conn_lines_enter = conn_lines
            .enter()
                .append("svg:line")
                .attr("class", "connline")
                .style("stroke", function(d,i){
                    if (that.cached_colors.hasOwnProperty(d.dport)){
                        return that.cached_colors[d.dport];
                    }
                    else{
                        return port_color_scale(i);
                    }
                })
                .style("opacity", 0.5)
                .attr("stroke-width", function(d){ return d3.min([d.num_conns, 5]) })
                .attr("stroke-dasharray", function(d){
                        if (!d.valid){
                            return [10,10];
                        }
                        else{
                            return "none";
                        }
                });

            conn_lines
              //.attr("y1", function(d, i) {
              //    return (that.get_group_attr(that.css_safen("#src-group"+d.src)).y);
              //})
              .attr("y2", function(d, i) { 
                  var attrs = that.get_port_box_attr(d.dst, d.dport);
                  return attrs.y + that.dst_box_height;
                  return (that.get_group_attr(that.css_safen("#src-group"+d.src)).y);
              })
              .attr("x2", function(d) {
                  var attrs = that.get_port_box_attr(d.dst, d.dport);
                  return (attrs.x + attrs.width / 2);
                  return time_scale(d.time) 
              });

            conn_lines

            ;

            conn_lines.transition()
                .delay(0)
                .style("opacity", function(d, i){
                    var pass = true;

                    for (var k in that.highlights){
                        if (d.hasOwnProperty(k)){
                           if (that.highlights[k] != d[k]){
                               pass = false;
                               break;
                           }
                        }
                    }

                    if (pass){
                        return 0.5;
                    }
                    else{
                        return that.inactive_opactity;
                    }
                })
                .style("stroke", function(d, i){
                        var pass = true;

                        for (var k in that.highlights){
                            if (d.hasOwnProperty(k)){
                               if (that.highlights[k] != d[k]){
                                   pass = false;
                                   break;
                               }
                            }
                        }

                        if (pass){
                            if (that.cached_colors.hasOwnProperty(d.dport)){
                                return that.cached_colors[d.dport];
                            }
                            else{
                                return port_color_scale(i);
                            }
                        }
                        else{
                            return "#999999";
                        }
                   })
                .attr("y1", function(d, i) {
                   return (that.get_group_attr(that.css_safen("#src-group"+d.src)).y);
                })
                .attr("x1", function(d) {return time_scale(d.time) })


             conn_lines.exit().remove();

    }

    that.get_port_box_attr = function(dst, dport){
        // need to translate back from the svg group co-ords:
        // is there a nicer way to do this?
        var elemref = d3.select(that.css_safen("#port" + dst + "_" + dport));
        var gref = d3.select(that.css_safen("#dst-group" + dst));

        return({y:(+elemref.attr("y")) + (+gref.attr("y")), 
                x:(+elemref.attr("x")) + (+gref.attr("x")),
                width:(+elemref.attr("width"))
            });
    }

    that.get_group_attr = function(elem){
        var elemref = d3.select(elem);
        if (elemref.empty()){
            console.log("Warn: " + elem + " is empty"); 
            return;
        }
        else{
            return({x: elemref.attr("x"), y: elemref.attr("y")})
        }
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

        var nest = d3.nest()
            .key(function(d) { return d.src })
            .entries(that.feeder.get_srcs());

        var src_group = that.get_can().selectAll(".src-group")
            .data(that.feeder.get_srcs(), function(d) { return d.src });

        src_group.
          exit().remove();

        /// RE-ENABLE PAINT CONNS!!!

        src_group.enter()
            .append("svg:g")
            .attr("class", "src-group")
            .attr("id", function(d){ return that.css_safen("src-group" + d.src)})
            .on("click", function(d) { 
                that.set_highlights("src", d.src);
                that.redraw();
                that.set_src_infobox(d);
            })
            .attr("x", that.winpad)
            .attr("y", function(d,i){ return that.get_src_line_y(i) })
            .attr("transform", function (d,i){ return "translate("+ (that.winpad) +", "+that.get_src_line_y(i)+")"});

        src_group
          .transition()
            .duration(that.sweep_transition_time)
            .attr("x", (that.winpad))
            .attr("y", function(d,i){ return that.get_src_line_y(i) })
            .attr("transform", function (d,i){ return "translate("+ (that.winpad) +", "+that.get_src_line_y(i)+")"})
            .call(that.set_up_conns);


        var src_labels = src_group.selectAll(".src-line-label")
            .data(function(d){ return [d] });

        src_labels.enter()
            .append("text")
            .attr("class", "src-line-label")
            .attr("text-anchor", "right");
;
        src_labels.exit().remove();

        src_labels.attr("x", that.can_w)
            .attr("y", 0)
            .attr("dy", "1em")
            .attr("dx", "0em")
            .style("fill", function(d){
                return src_trust(d.valid_conns / d.num_conns).color
            })
            .text(function(d) { return d.src })
            .transition()
              .duration(that.sweep_transition_time)
              .style("font-size", function(d){ return (that.get_src_line_height() * 0.8) + "px"});

        
        var srclines_base = src_group
           .selectAll(".srclines_base")
           .data(function(d){return [d]})
           .enter()
           .append("svg:line")
           .attr("class", "srclines_base")
           .attr("id", function(d) { return that.css_safen("srcbase" + d.src) } )
           //.style("stroke", "#CCCCCC")
           .style("stroke", function (d){return src_trust(d.valid_conns / d.num_conns).color })
           .attr("stroke-dasharray",  [5,5])
           .attr("x1", 0)
           .attr("y1", 0)
           .attr("x2", function(d) { 
              return time_scale(that.feeder.get_src_times()[d.src].max) + that.conn_line_pad
           })
           .attr("y2", 0);
 
        src_group.selectAll(".srclines_vert_base")
           .data(function(d){return [d] })
           .enter()
           .append("svg:line")
           .attr("class", "srclines_vert_base")
           .attr("id", function(d) { return that.css_safen("srcbase" + d.src) } )
           .style("stroke", "#CCCCCC")
           .attr("stroke-dasharray",  [5,5])
           .attr("x1", 0)
           .attr("y1", 0)
           .attr("x2", 0)
           .attr("y2", function(d, i){ return that.get_src_line_height() * 0.8 });

        src_group.selectAll(".srcline")
           .data(function(d){ return [d] })
           .enter()
           .append("svg:line")
           .attr("class", "srcline")
           .attr("id", function(d) { return that.css_safen("src" + d.src) } )
           .style("stroke", "black")
           .attr("x1", function(d){ 
              return time_scale(that.feeder.get_src_times()[d.src].min) - that.conn_line_pad
           })
           .attr("y1", 0)
           .attr("x2", function(d) { 
              return time_scale(that.feeder.get_src_times()[d.src].max) + that.conn_line_pad
           })
           .attr("y2", 0);
    }

    that.set_src_infobox = function(d){
        var message = "<div>" + d.src + "</div>";
        message += "<div>Total conns: " + d.num_conns + "</div>";
        message += "<div>Valid conns: " + d.valid_conns + "</div>";
        message += "<div>Valid conn rate: " + Math.round((d.valid_conns / d.num_conns) * 10000) / 100 + "%</div>";
        color = 
        that.infobox.set(message, d3.event.x, d3.event.y);
    
    }

    that.set_up_conns = function(){
        setTimeout(that.paint_conns, that.sweep_transition_time + 100);
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
            .on("click", function(d) { 
                that.set_highlights("dst", d.dst);
                that.redraw();
            })
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
            .on("click", function(d){ 
                that.set_highlights("dst", d.dst);
                that.redraw();
            })
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
        var port_rects = d3.selectAll(".dst-group")
            .selectAll(".dportbox")
            .data(function(d, i){ 
                return(  
                    d.values[0].ports.map(function (e,i,o){ 
                        return { dst: d.values[0].dst, dport: e, num_dst_ports: d.values[0].ports.length }
                    })
                )
            });

        port_rects.enter().append("svg:rect")
            .attr("x", function (d, i){ 
                //console.log(that.get_host_box_width(), d.num_dst_ports)
                return (that.get_host_box_width() / d.num_dst_ports) * i  
            })
            .attr("y", that.dst_box_height + that.winpad )
            .attr("width", function (d, i){ return (that.get_host_box_width() / d.num_dst_ports) })
            .attr("height", that.dst_box_height)
            .attr("title", "Test")
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
            .on("click", function(d) { 
                that.set_highlights("dport", d.dport);
                that.redraw();
            })
            .text(function(d) { return d.dport });

        port_rects.enter()
            .append("text")
            .attr("x", function (d, i){ 
                //console.log(that.get_host_box_width(), d.num_dst_ports)
                return (that.get_host_box_width() / d.num_dst_ports) * i +  that.get_host_box_width() / d.num_dst_ports * 0.5
            })
            .attr("y", that.dst_box_height * 1.5 + that.winpad )
            .attr("dy", "0.3em")
            .attr("dx", "0em")
            .on("click", function(d) { 
                that.set_highlights("dport", d.dport);
                that.redraw();
            })
            .style("fill", "white")
            .attr("class", "dst-box-label")
            .attr("text-anchor", "middle")
            .text(function(d,i) { return d.dport });
    }

    that.css_safen = function(s){
        return s.replace(/\./g, "_");
    }

    return that;
};

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
