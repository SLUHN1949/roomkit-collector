//
// Copyright (c) 2017 Cisco Systems
// Licensed under the MIT License 
//


/** 
 * Collects PeopleCount analystics from a collection of RoomKits
 * with a moving window interval
 */


const debug = require("debug")("collector");
const fine = require("debug")("collector:fine");
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;

// initialize DB
const url = 'mongodb://localhost:27017/';
MongoClient.connect(url, {useNewUrlParser: true}, (err, client) => {
    if (err) throw err;
    
    //create the database called people_presence
    const database = client.db("people_presence");

    database.createCollection("people_presence_db");
    // database.createCollection("rolling");
 
// }); - uncomment


    // Connects to a Room Device
    const jsxapi = require("jsxapi");
    function connect(device) {
        return new Promise(function (resolve, reject) {

            // Connect via SSH
            const xapi = jsxapi.connect(`ssh://${device.ipAddress}`, {
                username: device.username,
                password: device.password
            });
            xapi.on('error', (err) => {
                debug(`connexion failed for device: ${device.id}, ip address: ${device.ipAddress}, with err: ${err}`)
                reject(err)
            });
            xapi.on('ready', () => {
                fine(`connexion successful for device: ${device.id}`);
                resolve(xapi);
            });
        });
    }

    // initialization of dataStore variable (array)
    var dataStore = {};
    // function that fills dataStore variable with device.id, timestamp, count value and capacity
    function createData(device, date_internal, count) {
        dataStore = { "device": device.id, "date": date_internal, "count": count, "capacity": device.capacity};
        //console.log(typeof(dataStore))
        return dataStore;
    }

    // function that takes data and stores it in MongoDB people_presence collection "test"
    function write_in_db (internal_data) {
        database.collection("people_presence_db").insertOne(internal_data, function(err,res) {
            if(err) throw err;
            //console.log(res.connection)
            //console.log(res.ops)
            //client.close();
        })
    }

    // Initialize listeners for each device
    
    const devices = require("./devices.json");
    devices.forEach(device => {

        setInterval(function () {
            
            fine(`connecting to device: ${device.id}`)
            
            connect(device)

                .then(xapi => {
                    debug(`connected to device: ${device.id}`);

                    // Check devices can count
                    xapi.status
                        .get('RoomAnalytics PeopleCount')
                        .then((counter) => {
                            fine(`fetched PeopleCount for device: ${device.id}`);

                            // Abort if device does not count
                            var count = counter.Current;
                            if (count == -1) {
                                debug(`device is not counting: ${device.id}`);
                                return;
                            }
                            // converts count string into integer
                            count_int = parseInt(count);
                            
                            var current_data = createData (device, new Date(Date.now()), count_int);                            
                            
                            console.log(current_data);
                            write_in_db(current_data);

                            /* Listen to event not necessary in our use case since it makes computation of average complicated
                            // Listen to events
                            fine(`adding feedback listener to device: ${device.id}`);
                            xapi.feedback.on('/Status/RoomAnalytics/PeopleCount', (counter) => {
                                fine(`new PeopleCount: ${counter.Current}, for device: ${device.id}`);

                                // fetch PeopleCount value
                                var count = parseInt(counter.Current); // turn from string to integer
                                if (count == -1) {
                                    debug(`WARNING: device '${device.id}' has stopped counting`);
                                    return;
                                }

                                // register new TimeSeries
                                addCounter(device, new Date(Date.now()), count);
                            });
                            */
                        })
                        .catch((err) => {
                            debug(`Failed to retrieve PeopleCount status for device: ${device.id}, err: ${err.message}`);
                            //console.log(`Please check your configuration: seems that '${device.id}' is NOT a Room device.`);
                            console.log(err)
                            xapi.close();
                        });
                }) 
                .catch(err => {
                    debug(`Could not connect device: ${device.id}`)
                })
        // interval to call API people presence is every 60 seconds
        }, 1000 * 60 ); // 1000 is every second
    });

    // function that takes period and returns minimum date for timeframe
    function get_min_date(period) {
        var min_date = new Date(Date.now());
        
        var min = min_date.setMinutes(min_date.getMinutes() - period)
        console.log(min)
        return min;
    }

    // function that calls MongoDB collection "test" to get all records that are in timeframe (minimum date until now)
    function get_records (min_date, device_in) {
        var max_date = new Date(Date.now());
        var test_1;
        database.collection("people_presence_db").find({
            device: device_in,
            date: {
                $gte: min_date,
                $lt: max_date
            }
        }).toArray(function (err,res) {
            if (err) throw err;
            test_1 = res
        
            console.log(res);
            console.log(typeof(res))
            return res;
        })
    }
 
    // function that gets records and returns average
    function compute_average (array_in) {
        console.log(array_in)
        //console.log(array_in.length)
        console.log(typeof(array_in))

        var sum = 0;
        
        for (var i = 0; i < array_in.length; i++ ) {
            //console.log(array_in[i].count)
            sum += array_in[i].count
        }
        var ave = sum / array_in.length;
        //console.log(ave)
        return ave;
    }

    // function that returns average count over timeframe for device
    // 3 steps:
    //      1. calls function to get timeframe
    //      2. gets records for timefram and device
    //      3. calls function to get average
    function compute_average_in_timeframe (period_in, device_in) {
        var min = get_min_date(period_in);
        var arr = get_records (min, device_in);
        console.log (arr)
        var average_result = compute_average (arr)
        console.log(average_result)
        return average_result;
    }
    
    // call of the function with variabls 40 min and device "Workbench1"
    //compute_average_in_timeframe (40, "Workbench1") // average over last 40 min!


    // ToDo: Implementation of function that deletes records older then 4 weeks

    /*
    // 
    // Clean TimeSeries 
    //

    // Collect interval (moving window of collected time series)
    var window = process.env.WINDOW ? process.env.WINDOW : 15 * 60; // in seconds, 15*60 = 15 min
    debug(`collecting window: ${window} seconds`);

    // Individual store cleaner
    function cleanStore(store) {
        const oldest = Date.now() - window*1000; 
        
        const lowestDate = new Date(oldest).toISOString();
        store.forEach(serie => {
            if (serie[0] < lowestDate) {
                // shift functions takes element and removes it from array
                store.shift()
                
            }
        });
    }

    // Dump time series in a store
    function dumpSeries(store) {
        store.forEach(serie => {
                fine(`time: ${serie[0]}, count: ${serie[1]}`);
        });
    }

    // Run cleaner -  runs by default every second
    setInterval(function () {
        Object.keys(stores).forEach((key) => {
            fine(`cleaning TimeSeries for device: ${key}`);

            const store = stores[key];
            cleanStore(store);

            if ("production" !== process.env.NODE_ENV) {
                fine(`dumping stored series for device: ${key}`);
                dumpSeries(store);
            }
        })
    }, window * 1000); // in milliseconds
    */

    //
    // Return people count for the device and averaged on the period (in seconds)
    //

    const { computeBarycentre } = require("./util/barycentre");

    module.exports.averageOnPeriod = function (device, period) {
        fine(`searching store for device: ${device}`);

        const store = stores[device];
        if (!store) {
            fine(`could not find store for device: ${device}`);
            return undefined;
        }

        fine(`found store for device: ${device}`);

        // Compute average
        const to = new Date(Date.now()).toISOString();
        const from = new Date(Date.now() - period*1000).toISOString();
        const avg = computeBarycentre(store, from, to);
        fine(`computed avg: ${avg}, over last: ${period} seconds, for device: ${device}`);

        return avg;
    }

    module.exports.latest = function (device) {
        fine(`searching store for device: ${device}`);
        const store = stores[device];
        if (!store) {
            fine(`could not find store for device: ${device}`);
            return undefined;
        }
        fine(`found store for device: ${device}`);

        // Looking for last serie
        const lastSerie = store[store.length - 1];
        fine(`found last serie with value: ${lastSerie[1]}, date: ${lastSerie[0]}, for device: ${device}`);

        return lastSerie[1];
    }

    const { max } = require("./util/max");

    module.exports.max = function (device) {
        fine(`searching store for device: ${device}`);
        const store = stores[device];
        if (!store) {
            fine(`could not find store for device: ${device}`);
            return undefined;
        }
        fine(`found store for device: ${device}`);

        // Looking for max value in series
        const to = new Date(Date.now()).toISOString();
        const from = new Date(Date.now() - period*1000).toISOString();
        const maxSerie = computeMax(store, from, to);

        fine(`found max value: ${maxSerie[1]}, date: ${maxSerie[0]}, for device: ${device}`);

        return maxSerie;
    }
    
});
