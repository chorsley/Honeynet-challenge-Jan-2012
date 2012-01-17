import time
import anyjson
import re
import csv
import operator

log_dir = "sanitized_log"
auth_log = log_dir + "/auth.log"
web_access_log = log_dir + "/apache2/www-access.log"
media_access_log = log_dir + "/apache2/www-access.log"

bundle_window = 60*60

log_data = []
conn_tracker = {}

def parse_auth_log(auth_log):
    with open(auth_log, 'r') as f:
        for line in f:
            result = {}
            conn = {}
            m = re.search( \
                    "(\w+  ?\d+ \d+\:\d+\:\d+) ([^\s]+) (\w+)\[(\d+)\]\: (.*)", \
                    line)
            if m:
                conn["time"] = ssh_log_time_to_epoch(m.group(1), 2010)
                conn["dst"] = m.group(2)
                conn["pname"] = m.group(3)
                conn["pid"] = m.group(4)
                conn["data"] = m.group(5)
                #print ("%s, %s, %s, %s, %s\n" % (date, hostname, pname, pid, data))
                if conn["pname"] == "sshd":
                    sshm = re.search("(\w+) password for (\w+) from ([\d\.]+) port \d+ ssh2", conn["data"])
                    if sshm:
                        conn["dport"] = 22
                        conn["result"] = sshm.group(1)
                        conn["user"] = sshm.group(2)
                        conn["src"] = sshm.group(3)
                        #print "%s ssh login for %s from %s\n" % (result, user, remoteip)
                        conn["valid"] = False if conn["result"] == "Failed" else True
                        if (not bundle_if_possible(conn)):
                            yield({'src': conn["src"], 'dst': conn["dst"], 'dport': conn["dport"], 'valid': conn["valid"], "time": conn["time"], "num_conns": 1})

def parse_web_access_log(web_log):
    # 10.0.1.2 - - [19/Apr/2010:08:30:12 -0700] "GET /feed/ HTTP/1.1" 200 16605 "-" "Apple-PubSub/65.12.1" oxOvcAoAAQ4AAEY@W5kAAAAB 4159446

    fields = {'src':0, 'ident':1, 'uname':2, 'date':3, 'tzone':4, 'req':5, 'status':6, 'bytes':7, 'referer':8, 'agent':9, 'recv':10}
    f = csv.reader(open(web_log, 'rb'), delimiter=' ', quotechar='"')
    for row in f:
        conn= {}
        # chop off that pesky [
        conn["time"] = apache_log_time_to_epoch((row[fields['date']])[1:])
        conn["dst"] = "app-1" # not in the log file, assuming same box
        conn["dport"] = 80
        conn["valid"] = get_http_code_validity(row[fields['status']])
        conn["src"] = row[fields['src']]
        #conn["valid"] = is_http_code_value
        if (not bundle_if_possible(conn)):
            yield({'src': conn["src"], 'dst': conn["dst"], 'dport': conn["dport"], 'valid': conn["valid"], "time": conn["time"], "num_conns": 1})

def bundle_if_possible(conn):
    global log_data
    global bundle_window
    
    for i in xrange(len(log_data) - 1, 0, -1):
         
        if (conn["time"] >= log_data[i]["time"] + bundle_window):
            # outside the window, return
            return None
        else:
            if (conn["src"] == log_data[i]["src"] and
                conn["dst"] == log_data[i]["dst"] and 
                conn["dport"] == log_data[i]["dport"] and
                conn["valid"] == log_data[i]["valid"]):
                log_data[i]["num_conns"] += 1
                return True

def get_http_code_validity(code):
    return (int(code) >= 200 and int(code) < 400)

def apache_log_time_to_epoch(dtime):
    # 19/Apr/2010:08:30:12 -0700
    pattern = "%d/%b/%Y:%H:%M:%S"
    convdate = time.strptime(dtime, pattern)
    etime = int(time.mktime(convdate))
    return etime

def ssh_log_time_to_epoch(dtime, year):
    pattern = "%Y %b %d %H:%M:%S"
    convdate = time.strptime(str(year) + " " + dtime, pattern)
    etime = int(time.mktime(convdate))
    return etime

if __name__ == "__main__":
    for res in parse_auth_log(auth_log):
        log_data.append(res)
    for res in parse_web_access_log(media_access_log):
        log_data.append(res)
    for res in parse_web_access_log(web_access_log):
        log_data.append(res)

    #log_data.sort(log_data, key=operator.attrgetter('time'))
    log_data.sort(key=lambda row: row["time"])
    print "traffic = " + anyjson.serialize(log_data)
