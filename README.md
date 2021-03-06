# PeopleCount Collector for Room Devices [![published](https://static.production.devnetcloud.com/codeexchange/assets/images/devnet-published.svg)](https://developer.cisco.com/codeexchange/github/repo/ObjectIsAdvantag/roomkit-collector)

Collects PeopleCount events from Webex Room Devices, stores them in an in-memory Time Series database to compute weighted averages over flexible time windows, and returns these data through a RESTful API.

Background: 
- Webex Room Devices fire events every time they notice a change. As participants in meeting roms happen to move their head, it is frequent to see updates to the PeopleCount counter even though no participant entered or left the room. Thus, when queried several times, even in close intervals, the PeopleCount value returned by a Room Kit would be expected to differ.
- The collector batch utility and 'barycentre' computation help create a stable counter for each device part of a RoomKit deployment. Concretely, PeopleCounter events for each device are collected and stored in an in-memory timeseries database. Moreover, a REST API lets you retreive computed averaged values for a custom period of time.

This repo contains 3 components:
1. [a collector batch](collector/collector.js): collects PeopleCount events for a pre-configured list of devices, and stores them as TimeSeries (also recycles all elapsed TimeSeries, aka, out of the observation window),
2. [a 'barycentre' utility](util/barycentre.js): computes an average value from a Time Series, by weighting each value based on its duration (before next event happens,
3. [a REST API](server.js): exposes the latest and average weighted value from PeopleCount events fired by a [pre-configured list of devices](devices.json). 


## Quickstart

To install and configure the collector, run the instructions below:

```shell
git clone https://github.com/ObjectIsAdvantag/roomkit-collector
cd roomkit-collector
npm install
```

Let's now configure the collector for your Room Devices deployment:
Edit the [devices.json file](devices.json) with your Room Devices deployment.

Here is an example of a deployment of RoomKits in the DevNet Zone:

```json
[
  {
    "id": "Workbench1",
    "location": "Workshop 1",
    "ipAddress": "192.68.1.32",
    "username" : "integrator",
    "password" : "integrator"
  },
  {
    "id": "Workbench2",
    "location": "Workshop 2",
    "ipAddress": "192.68.1.33",
    "username" : "integrator",
    "password" : "integrator"
  },
  {
    "id": "Workbench3",
    "location": "Workshop 3",
    "ipAddress": "192.68.1.34",
    "username" : "integrator",
    "password" : "integrator"
  }
]
```

Now, we will run the collector in DEBUG mode, and with an observation window of 60 seconds (time series older than 1 minute are erased):

```shell
# Starts the collector collecting PeopleCount for devices listed in devices.json, and computes averages over 60s periods
DEBUG=collector*,api*  WINDOW=60 node server.js
...
  collector:fine connecting to device: Workbench1 +0ms
  collector:fine connecting to device: Workbench2 +16ms
  collector:fine connecting to device: Workbench3 +18ms
  collector collecting window: 60 seconds +0ms

Collector API started at http://localhost:8080/
   GET / for healthcheck
   GET /devices for the list of devices
   GET /devices/{device} to get the details for the specified device
   GET /devices/{device}/last for latest PeopleCount value received
   GET /devices/{device}/average?period=30 for a computed average

  collector:fine connexion successful for device: Workbench1 +334ms
  collector connected to device: Workbench1 +336ms
  collector:fine fetched PeopleCount for device: Workbench1 +17ms
  collector:fine adding count: 0, for device: Workbench1 +1ms
  collector:fine adding feedback listener to device: Workbench1 +1ms
...
```

All set! 

You can now query the Collector's API (make sure to replace `Workbench1` below by one of the devices identifier configured in your devices.json):

- GET / => healthcheck
- GET /devices => returns the list of devices for which data is  collected
- GET /devices/Workbench1 => returns the details for the specified device
- GET /devices/Workbench1/last => returns the latest PeopleCount value fired by the 'Workbench1' device
- GET /devices/Workbench1/max => returns the max value on the default period (15 seconds)  
- GET /devices/Workbench1/average?period=60 => returns an averaged PeopleCount value computed from the PeopleCount events fired by the 'Workbench1' device, over the last 60 seconds

Example:

`GET http://localhost:8080/devices/Workbench1/average?period=60`

```json
{
    "device": "Workbench1",
    "peopleCount": 8.508,
    "period": "60",
    "unit": "seconds"
}
```

_Note that the average weighted value is not rounded by default, in order to maximize your options to use these averages._


## Mock service

For tests purpose, a mock mimics the collector API and returns random data for the same list of devices.

```shell
DEBUG=collector*,api*  WINDOW=60 node mock.js
...
Collector API started at http://localhost:8080/
   GET / for healthcheck
   GET /devices for the list of devices
   GET /devices/{device} to get the details for the specified device
   GET /devices/{device}/last for latest PeopleCount value received
   GET /devices/{device}/average?period=30 for a computed average

  api:fine returned mock latest: 7, for device: Workbench1 +0ms
  api:fine returned mock latest: 4, for device: Workbench1 +2s
  api:fine returned mock latest: 6, for device: Workbench1 +879ms
  api:fine returned mock average: -1, for device: Workbench1 +9s
  api:fine returned mock average: 1, for device: Workbench1 +3s
...
```


## History

v1.0: release for DevNet Automation Exchange

v0.5: updates for Cisco Live US 2018

v0.4: updates for [DevNet Create](https://devnetcreate.io/) with a [React Map](https://github.com/ObjectIsAdvantag/roomkit-react-map) companion

v0.3: updates for [Cisco Connect Finland](https://www.cisco.com/c/m/fi_fi/training-events/2018/cisco-connect/index.html#~stickynav=2) (Messukeskus)

v0.2: updates for [Cisco Live Melbourne](https://www.ciscolive.com/anz/)

v0.1: created at [BCX18 - Bosch IoT Hackathon Berlin](https://github.com/ObjectIsAdvantag/hackathon-resources/tree/master/bcx18-berlin)
