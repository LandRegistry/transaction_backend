# Transaction Backend

Contains the ability to run Hyperledger Composer and Fabric, plus a custom built API that connects directly to Fabric via the Composer SDK.

## Running

### Everything running locally

You will need:

* Docker (running)
* Docker-compose
* Node

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