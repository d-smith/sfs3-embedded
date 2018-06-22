const express = require('express');
const timeout = require('connect-timeout');
const app = express();
const bodyParser = require('body-parser');
const rp = require('request-promise-native');


// Stick the express response objects in a map, so we can
// lookup and complete the response when the process state
// is published.
let txnToResponseMap = new Map();

const callStepFunc = async (input, serviceResponse) => {
    let options = {
        method: 'POST',
        uri: process.env.START_ENDPOINT,
        body: input,
        json:true,
        headers: {
            'x-api-key':process.env.API_KEY
        }
    };
    console.log(`start process with input ${JSON.stringify(input)}`);
    try {
        let callResult = await rp(options);
        console.log(callResult);
        txnToResponseMap.set(callResult['executionId'],serviceResponse);
    } catch(theError) {
        serviceResponse.status(500).send(theError.message);
    }
}


const headersSentForTransaction = (executionArn, response, txnMap) => {
    if(response.headersSent) {
        console.log(`headers sent for ${executionArn} - most likely timed out`);
        txnMap.delete(executionArn);
        return true;
    }

    return false;
}

const sendResponseBasedOnState = (state, executionArn, response, txnMap) => {
    // When polling the state machine might still be running.
    if(state == 'RUNNING') {
        console.log('status is running - poll later');
        return;
    }

    if(state == 'SUCCEEDED') {
        console.log('response success');
        response.send(state);
    } else {
        console.log('response failure');
        response.status(400).send(state);
    }

    txnMap.delete(executionArn);
}

const checkStateForTxn = async (txnMap, executionArn, resp) => {
    console.log(`checking state for execution ${executionArn}`);

    if(headersSentForTransaction(executionArn, resp, txnMap)) {
        return;
    }

    let options = {
        method: 'GET',
        uri: process.env.STATE_ENDPOINT + '?executionArn=' + executionArn,
        json:true
    };

    try {
        let callResult = await rp(options);

        console.log(`call result: ${JSON.stringify(callResult)}`);

        let state = callResult['status'];
        sendResponseBasedOnState(state, executionArn, resp, txnMap);
    } catch(err) {
        console.log(err.message);
    }

}


const doPollForResults = async () => {

    txnToResponseMap.forEach((txnResponse, executionArn)=> {
        checkStateForTxn(txnToResponseMap, executionArn, txnResponse);
    });

    console.log('polling for results');
    setTimeout(doPollForResults, 1500);
}

//Global timeout handler
const haltOnTimeout = (req, res, next) => {
    if (!req.timedout) next();
}

// Set up a timeout for this sample app - your timeout may be 
// different
app.use(timeout(20*1000));
app.use(haltOnTimeout);
app.use(bodyParser.json(type='application/json'));

// Sample endpoint to initiate the step function process
// and the communication back of the response.
app.post('/p1', function (req, res) {
    console.log(req.body);
    callStepFunc(req.body, res);
});

const doInit = async () => {
    doPollForResults();

    let port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Example app listening on port ${port}`))
}

doInit();

