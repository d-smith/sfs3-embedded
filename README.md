# sfs3-embedded

This project shows how to embed a step function state machine execution inside a REST service.

## Overview

The following diagram illustrates the context:

![sequence diagram](./embedded.png)

In this scenario, we want to expose a RESTful service endpoint a client can call to invoke some action and obtain the result of the action they initiated. In the service, we want to use AWS step functions to orchestrate a potentially complex sequence of calls, as well as handle retry logic, error handling, and so on.

The [Step Functions API](https://docs.aws.amazon.com/step-functions/latest/apireference/Welcome.html) provides the StartExecution action to start a new instance of the specified state machine, which returns the execution id of the started state machine. Note, however, it only indicate the state machine has been started -- it does not wait for the termination of the state machine to return a termination status.

In this scenario, it is assumed the orchestration executed by the state machine is relatively short lived - maybe half a minute to a couple minutes in duration, certainly not days, weeks, or months (which step function can accomodate).

To obtain the termination state of the step machine, the DescribeExecution action is invoked with the execution id returned by StartExecution. DescribeExecution is called repeatedly (while a sensible interval between calls) until the status in the response is no longer RUNNING.

At that point the response back to the client can be completed.

### S3 Side Car Pattern

### Dealing with S3 Consistency

## Step Function Deployment

## Sample Service