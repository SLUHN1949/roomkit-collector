//
// Server receive the events
// 

var express = require("express");
var app = express();

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var debug = require("debug")("api");
var fine = require("debug")("api:fine");


var started = Date.now();
app.route("/")
    // healthcheck
    .get(function (req, res) {
        res.json({
            message: "Congrats, your RoomAnalytics Aggregator is up and running",
            since: new Date(started).toISOString()
        });
    })

const { latest, averageOnPeriod } = require("./collector");

app.get("/analytics/:device/last", function (req, res) {
    const device = req.params.device;

    let period = req.query.period;
    if (!period) {
        period = 15; // in seconds
    }

    // Retreive count data for device
    const count = latest(device);

    res.json({
        device: device,
        peopleCount: count
    });
})

app.get("/analytics/:device/average", function (req, res) {
    const device = req.params.device;

    let period = req.query.period;
    if (!period) {
        period = 15; // in seconds
    }

    // Retreive count data for device
    const count = averageOnPeriod(device, 10);

    res.json({
        device: device,
        peopleCount: count,
        period: period,
        unit: "seconds"
    });
})


// Starts the service
//
var port = process.env.OVERRIDE_PORT || process.env.PORT || 8080;
app.listen(port, function () {
    console.log("Collector API started at http://localhost:" + port + "/");
    console.log("   GET / for healthcheck");
    console.log("   GET /analytics/{device} for data");
});