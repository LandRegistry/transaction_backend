# Transaction Backend

Contains the ability to run Hyperledger Composer and Fabric, plus a custom built API that connects directly to Fabric via the Composer SDK.

## Running

### Everything running locally

You will need:

* Docker (running)
* Docker-compose
* Node
* composer-cli installed globally (`npm install -g composer-cli@0.13.1`)
* composer-rest-server installed globally (`npm install -g composer-rest-server@0.13.1`)

```bash
/hmlr-populate/start.sh
```

This will start up Playground locally alongside a local instance of Hyperledger Fabric. It's basically doing [this](https://hyperledger.github.io/composer/installing/using-playground-locally.html).

Then it will run the custom API (app.js), which exposes REST endpoints for the front end to hit.

### Custom API local, Composer and Fabric on Bluemix

You will need:

* Node

```bash
export NODE_ENV=stage
npm install && node app.js
```

(Setting NODE_ENV ensures the stage.json overrides the connection profile name to be the one that is running on bluemix)

This will run the custom API locally, connecting to the Fabric SDK on Bluemix. Note that you will need to have downloaded the connection profile into ~/.composer-connection-profiles beforehand.

Updated the below content in the file after enhancement
------------------------------------------------------------------
Before running the application need to run the prepopulated data in the application to make it run . For this run the below command in postman
POST call :   http://localhost:6001/api/populate

NOTE:: As this code is written is composer version 0.13.1, so while installing the composer we have to stick to the version @0.13.1 . Else some of the functionality might not work as expected.

