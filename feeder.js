var feeder = function(spec){

    var that = {};

    var data = spec.data;
    
    that.runtime = 1000;
    that.slottime = 100;

    that.dsts = [];
    that.srcs = [];
    that.src_times = {};
    that.dst_ports = [];
    that.conns_colors = [];
    that.time_start;
    that.time_end;
    that.sweep_start_time;
    that.sweep_end_time;
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

    that.get_sweep_start_time = function(){
        return that.sweep_start_time;
    }

    that.set_sweep_start_time = function(time){
        that.sweep_start_time = time;
    }

    that.get_sweep_end_time = function(){
        return that.sweep_end_time;
    }

    that.set_sweep_end_time = function(time){
        that.sweep_end_time = time;
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

    that.run = function(){
        that.running = true;
        that.tick();
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

    that.update_data = function(){
        console.log("Updating data");
        that.conns = [];
        that.conns = that.find_events_older_than(that.sweep_end_time);
    }

    that.tick = function(){
        that.conns = [];

        if (that.time < that.sweep_end_time){
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
        that.sweep_start_time = min;
        that.sweep_end_time = max;
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
