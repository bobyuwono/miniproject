'use strict';
import express from 'express';
import {readFileSync, writeFileSync} from 'fs';
import { request } from 'http';
import {addErrorTriggerScheduler, errorTrigger, errorTriggerManual, removeErrorTriggerScheduler} from "./mischiefs.js";

// Implement simple file reader
// Returns boolean
// Reads an important file that contains very critical information that if its invalid,
//   the app crashes, sending 500 status code to every request
function readImportantFile() {
    let rawData = readFileSync('important_file');
    const keyword = 'healthy';
    return rawData
        .toString()
        .split('\n')
        .map(el => el.split('='))
        .find(el => el[0] === keyword)
        [1]
}

function readImportantFileManualConfig() {
    let rawData = readFileSync('important_file');
    const keyword = 'manual_config';
    return rawData
        .toString()
        .split('\n')
        .map(el => el.split('='))
        .find(el => el[0] === keyword)
        [1]
}

// Implement important_file default setter
// Replace the value in important file to default: healthy=true
// Notice that it does not reset the manual config value
function resetImportantFile() {
    const currentManualConfigValue = readImportantFileManualConfig();
    writeFileSync('important_file', `healthy=true\nmanual_config=${currentManualConfigValue}`);
}

// Implement simple error reporter
// Simplified the process from error log parsing to reporting
// For simplicity's sake of the demonstration, instead of dumping logs and reading it to parse and send,
//   this function cuts the process to only just report a valid json to the backend
function reportErrorToBackend() {
    const data = new TextEncoder().encode(
        JSON.stringify({
            type: "test",
            from: "127.0.0.1",
            timestamp: "now"
        })
    )
    const req = request({
        hostname: 'localhost',
        port: 3000,
        path: '/log',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, res => {
        console.log(`statusCode: ${res.statusCode}`)
        res.on('data', d => {
            process.stdout.write(d)
        })
    });
    req.on('error', error => {
        console.error(error)
    })
    req.write(data)
    req.end()
}

// Implement simple http service with express
// Simulating interaction with other service/user/3rd party
// When error happens, it will send 500 status code
//
// How does it "fail"?
// For every request, it reads a file (via),
//   suppose it contains very critical information that if its invalid,
//   the app crashes, sending 500 status code to every request
//   and reports the error to the actual backend
const httpService = express();
const port = 4444;
const HOST_PORT = process.env.HOST_PORT || port; // needed for docker-compose services
const HOST_ADDRESS = process.env.HOST_ADDRESS || 'localhost'; // Alamat tombol break me di localhost vs production harusnya beda

const body =
    `<div>Hello there. I am working and healthy :)</div>
<br><button onclick="let r = new XMLHttpRequest(); r.open('GET', 'http://${HOST_ADDRESS}:${HOST_PORT}/break', false); r.send(null);location.reload()">Break me</button>
&nbsp; <button onclick="let r = new XMLHttpRequest(); r.open('GET', 'http://${HOST_ADDRESS}:${HOST_PORT}/breakManual', false); r.send(null);location.reload()">Break me (solve manually)</button>
&nbsp; <button onclick="let r = new XMLHttpRequest(); r.open('GET', 'http://${HOST_ADDRESS}:${HOST_PORT}/addcron', false); r.send(null);location.reload()">Add cronjob</button> 
&nbsp; <button onclick="let r = new XMLHttpRequest(); r.open('GET', 'http://${HOST_ADDRESS}:${HOST_PORT}/removecron', false); r.send(null);location.reload()">Remove cronjob</button>`;

httpService.get('/', (req, res) => {
    // main logic
    const isAppHealthy = readImportantFile();
    const isManualConfigValid = readImportantFileManualConfig();
    if (isAppHealthy === "true" && isManualConfigValid === "valid") {
        res.send(body);
    } else {
        reportErrorToBackend();
        res.status(500).send("Internal server error. I am not healthy :(");
    }
});

// Failure endpoint. Fire a request here to break the app
httpService.get('/break', (req, res) => {
    errorTrigger();
    res.send('success');
});

httpService.get('/breakManual', (req, res) => {
    errorTriggerManual();
    res.send('success');
});

// Add failure cronjob endpoint. Fire a request here to add cronjob that sets healthy to false every minute
httpService.get('/addcron', (req, res) => {
    addErrorTriggerScheduler();
    res.send('success');
});

// Remove failure cronjob endpoint. Fire a request here to remove the cronjob
httpService.get('/removecron', (req, res) => {
    removeErrorTriggerScheduler();
    res.send('success');
});

// Reset the important file before running
resetImportantFile();

// Run the simple http service a.k.a. testApp
httpService.listen(port, () => {
    console.log(`Test app listening at port: ${port}`);
});
