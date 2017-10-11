const ComposerCommon = require('composer-common');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const express = require('express');
const ObjectStorageWallet = require('./objectstorewallet');
const app = express();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const log4js = require('log4js');
const cfenv = require('cfenv');
const config = require('config');
const logger = log4js.getLogger();
logger.level = 'debug';
process.setMaxListeners(0);

// use NODE_ENV to tell config which config to choose
// development=config/default.json (for local)
// roduction=config/production.json (for bluemix) - will extend values from default
const connectionProfileName = config.get('Composer.connectionProfile');
const businessNetworkIdentifier = config.get('Composer.businessNetwork');
const userID = config.get('Composer.userId');
const userSecret = config.get('Composer.password');

let wallet = null; // Local
if (config.has('Composer.objectStoreService')) {
    // This wallet has the connection profile files (certs etc) in it. It'll load them from
    // the object store on bluemix
    wallet = new ObjectStorageWallet(config.get('Composer.objectStoreContainer'), config.get('Composer.objectStoreService'));
}


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let identities = [  {"userID":"100000001"}, {"userID":"100000002"}, {"userID":"100000003"}, {"userID":"100000004"}, {"userID":"100000005"}, {"userID":"100000006"},
                    {"userID":"100000007"}, {"userID":"100000008"}, {"userID":"100000009"}, {"userID":"100000010"}, {"userID":"100000011"}, {"userID":"100000012"},
                    {"userID":"santander"}, {"userID":"hsbc"}, {"userID":"halifax"}, {"userID":"shoosmiths"}, {"userID":"myhomemove"}, {"userID":"countrywide"},
                    {"userID":"escrow"}, {"userID":"hmrc"}, {"userID":"hmlr"}];

// Helpers
let serializer;
let factory;

let connections = {};
connections['admin'] = new BusinessNetworkConnection();

// Connect to business network
connections['admin'].connect(connectionProfileName, businessNetworkIdentifier, userID, userSecret, wallet == null ? {} : { wallet: wallet }).then((result) => {
    logger.debug('Connected to hmlr-network!');
    businessNetworkDefinition = result;
    serializer = businessNetworkDefinition.getSerializer();
    factory = businessNetworkDefinition.getFactory();
});


// TODO: create connection profile loader

// get the app environment from Cloud Foundry
// if running locally, it will return sensible defaults apparently!
var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, () => {
    logger.debug('Example app listening on port ' + appEnv.port);
});

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT");
    next();
});

app.get('/', function(req, res, next) {
// Handle the get for this route
res.send('OK');
});

app.post('/', function(req, res, next) {
// Handle the post for this route
res.send('OK');
});


/*
    prop exhcanges
    receipts
    contracts
*/


//------------------------------------------------------------------
// Create Functions & Endpoints
//------------------------------------------------------------------

/**
 * Creates a new Asset of the supplied types
 * @param {*} namespace Namespace of the .cto file containing the definitiion
 * @param {*} type Type of asset to be created
 * @param {*} id ID of the new asset
 * @param {*} attributes Attributes (relationships to be added later)
 * @param {*} bnc Business Network Connection object to execute the operation through
 */
function createAsset(namespace, type, id, attributes, bnc) {
    logger.debug('createAsset() called with ' + namespace + ' ' + type + ' ' + id + ' ' + JSON.stringify(attributes));
    return new Promise((resolve, reject) => {

        if(!factory) reject(new Error('Factory is undefined'));

        // Make the asset
        let newResource;
        try {
            newResource = factory.newResource(namespace, type, id, { generate: 'empty', includeOptionalFields: false })
        } catch (error) {
            logger.error(error.message);
            reject(error);
        }

        // Add it's attributes
        Object.keys(attributes).forEach((key) => {

            logger.error('attributes[key] is ' + attributes[key] + ' type is ' + typeof(attributes[key]) + ' regex? ' + key.search(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/i));

            if(typeof(attributes[key]) === 'string' &&  attributes[key].search(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/i) === 0){
                newResource[key] = new Date(attributes[key]);
                logger.debug('Adding Date ' + key + ' with value ' + attributes[key] + ' to new ' + type);
            } else if(Array.isArray(attributes[key])) {
                if(attributes[key].length && typeof(attributes[key]) === 'object') {
                    newResource[key] = [];
                    attributes[key].forEach((element) => {
                        let relationship = factory.newRelationship(element.namespace, element.type, element.id);
                        newResource[key].push(relationship);
                    });
                } else {
                    newResource[key] = attributes[key];
                }
            } else if(typeof(attributes[key]) === 'object') {
                let relationship = factory.newRelationship(attributes[key].namespace, attributes[key].type, attributes[key].id);
                newResource[key] = relationship;
                logger.debug('Adding attribute ' + key + ' with relationship to ' + attributes[key].namespace + '.' + attributes[key].type + '#' + attributes[key].id + ' to new ' + type);

            } else {
                newResource[key] = attributes[key];
                logger.debug('Adding attribute ' + key + ' with value ' + attributes[key] + ' to new ' + type);
            }
        });

        // Add the asset
        logger.debug('Fetching registry for ' + namespace + '.' + type);
        return bnc.getAssetRegistry(namespace + '.' + type).then((reg) => {
            logger.debug('Got registry for ' + type);
            return reg.add(newResource).then(() => {
                logger.debug('Created a new ' + type + ' with id ' + id);
                resolve();
            }).catch((error) => {
                logger.error(error.message);
                reject(error);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function createParticipant(namespace, type, id, attributes, bnc) {
    logger.debug('createParticipant() called with ' + namespace + ' ' + type + ' ' + id + ' ' + JSON.stringify(attributes));
    return new Promise((resolve, reject) => {

        if(!factory) reject(new Error('Factory is undefined'));

        // Make the asset
        let newResource;
        try {
            newResource = factory.newResource(namespace, type, id, {generate: 'empty', includeOptionalFields: false})
        } catch (error) {
            logger.error(error.message);
            reject(error);
        }

        // Add it's attributes
        Object.keys(attributes).forEach((key) => {
            if(Array.isArray(attributes[key])) {
                if(attributes[key].length && typeof(attributes[key]) === 'object') {
                    newResource[key] = [];
                    attributes[key].forEach((element) => {
                        let relationship = factory.newRelationship(element.namespace, element.type, element.id);
                        newResource[key].push(relationship);
                    });
                } else {
                    newResource[key] = attributes[key];
                }

            } else if(typeof(attributes[key]) === 'object') {
                let relationship = factory.newRelationship(attributes[key].namespace, attributes[key].type, attributes[key].id);
                newResource[key] = relationship;
                logger.debug('Adding attribute ' + key + ' with relationship to ' + attributes[key].namespace + '.' + attributes[key].type + '#' + attributes[key].id + ' to new ' + type);

            } else if(typeof(attributes[key]) === 'string' && key.search(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/i) === 0) {
                newResource[key] = new Date(attributes[key]);
                logger.debug('Adding attribute ' + key + ' with value ' + attributes[key] + ' to new ' + type);

            } else {
                newResource[key] = attributes[key];
                logger.debug('Adding attribute ' + key + ' with value ' + attributes[key] + ' to new ' + type);
            }
        });

        // Add the asset
        return bnc.getParticipantRegistry(namespace + '.' + type).then((reg) => {
            logger.debug('Got registry for ' + type);
            return reg.add(newResource).then(() => {
                logger.debug('Created a new ' + type + ' with id ' + id);
                resolve();
            }).catch((error) => {
                logger.error(error.message);
                reject(error);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithAssetCreation(res, body, type) {
    logger.debug('respondWithAssetCreation() called with ' + JSON.stringify(body));
    createAsset('org.hmlr.model', body.type, body.id, body.attributes, connections[body.user]).then(() => {
        res.status(200).send("SUCCESS");
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

function respondWithParticipantCreation(res, body, type) {
    logger.debug('respondWithParticipantCreation() called with ' + JSON.stringify(body));
    createParticipant('org.hmlr.model', body.type, body.id, body.attributes, connections[body.user]).then(() => {
        res.status(200).send("SUCCESS");
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/create/asset", (req, res) => {
    respondWithAssetCreation(res, req.body);
});

app.post("/api/create/participant", (req, res) => {
    respondWithParticipantCreation(res, req.body);
});

//------------------------------------------------------------------
// Get Functions & Endpoints
//------------------------------------------------------------------

function getAsset(namespace, type, id, bnc) {
    logger.debug('getAsset() called for ' + namespace + '.' + type + '#' + id);
    return new Promise((resolve, reject) => {
        return bnc.getAssetRegistry(namespace + '.' + type).then((reg) => {
            return reg.resolve(id).then((asset) => {
                resolve(asset);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithAsset(res, body) {
    logger.debug('respondWithAsset() called with ' + JSON.stringify(body));
    getAsset('org.hmlr.model', body.type, body.id, connections[body.user]).then((asset) => {
        res.status(200).send(asset);
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/get/asset/", (req, res) => {
    respondWithAsset(res, req.body);
});

function getParticipant(namespace, type, id, bnc) {
    logger.debug('getParticipant() called for ' + namespace + '.' + type + '#' + id);
    return new Promise((resolve, reject) => {
        return bnc.getParticipantRegistry(namespace + '.' + type).then((reg) => {
            return reg.resolve(id).then((asset) => {
                resolve(asset);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithParticipant(res, body) {
    logger.debug('respondWithParticipant() called with ' + JSON.stringify(body));
    getParticipant('org.hmlr.model', body.type, body.id, connections[body.user]).then((asset) => {
        res.status(200).send(asset);
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/get/participant/", (req, res) => {
    respondWithParticipant(res, req.body);
});

//------------------------------------------------------------------
// Get All Functions & Endpoints
//------------------------------------------------------------------

function getAllAssets(namespace, type, bnc) {
    logger.debug('getAllAssets() called for ' + namespace + '.' + type);
    return new Promise((resolve, reject) => {
        return bnc.getAssetRegistry(namespace + '.' + type).then((reg) => {
            return reg.getAll().then((assets) => {
                resolve(assets);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithAllAssets(res, body) {
    logger.debug('respondWithAllAssets() called with ' + JSON.stringify(body));
    getAllAssets('org.hmlr.model', body.type, connections[body.user]).then((assets) => {
        let serialisedAssets = assets.map((asset) => {return serializer.toJSON(asset)});
        res.status(200).send(serialisedAssets);
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/get/asset/all", (req, res) => {
    respondWithAllAssets(res, req.body);
});

function getAllParticipants(namespace, type, bnc) {
    logger.debug('getAllParticipants() called for ' + namespace + '.' + type);
    return new Promise((resolve, reject) => {
        return bnc.getParticipantRegistry(namespace + '.' + type).then((reg) => {
            return reg.getAll().then((assets) => {
                resolve(assets);
            });
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithAllParticipants(res, body) {
    logger.debug('respondWithAllParticipants() called with ' + JSON.stringify(body));
    getAllParticipants('org.hmlr.model', body.type, connections[body.user]).then((assets) => {
        let serialisedAssets = assets.map((asset) => {return serializer.toJSON(asset)});
        res.status(200).send(serialisedAssets);
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/get/participant/all", (req, res) => {
    respondWithAllParticipants(res, req.body);
});



//------------------------------------------------------------------
// Transaction Functions & Endpoints
//------------------------------------------------------------------

function invokeTransaction(namespace, type, attributes, bnc) {
    logger.debug('issueTransaction() called with ' + namespace + ' ' + type + ' ' + JSON.stringify(attributes));
    return new Promise((resolve, reject) => {

        // Make the transaction
        let newTransaction;
        try {
            newTransaction = factory.newTransaction(namespace, type);
        } catch (error) {
            logger.error(error.message);
            reject(error);
        }

        Object.keys(attributes).forEach((key) => {
            if(Array.isArray(attributes[key])) {
                if(attributes[key].length && typeof(attributes[key]) === 'object') {
                    newTransaction[key] = [];
                    attributes[key].forEach((element) => {
                        let relationship = factory.newRelationship(element.namespace, element.type, element.id);
                        newTransaction[key].push(relationship);
                    });
                } else {
                    newTransaction[key] = attributes[key];
                }
                logger.debug('Adding array to ' + key);

            } else if(typeof(attributes[key]) === 'object') {
                let relationship = factory.newRelationship(attributes[key].namespace, attributes[key].type, attributes[key].id);
                newTransaction[key] = relationship;
                logger.debug('Adding attribute ' + key + ' with relationship to ' + attributes[key].namespace + '.' + attributes[key].type + '#' + attributes[key].id + ' to new ' + type);

            } else if(typeof(attributes[key]) === 'string' && attributes[key].search(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/i) === 0) {
                newTransaction[key] = new Date(attributes[key]);
                logger.debug('Adding attribute ' + key + ' with date value ' + attributes[key] + ' to new ' + type);

            } else {
                newTransaction[key] = attributes[key];
                logger.debug('Adding attribute ' + key + ' with value ' + attributes[key] + ' to new ' + type);
            }
        });

        // Submit the transaction
        logger.debug('Submitting new ' + type + ' transaction');
        return bnc.submitTransaction(newTransaction).then(() => {
            logger.debug('Successfully issued ' + type + ' with ' + JSON.stringify(attributes));
            resolve();
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithTransaction(res, body) {
    invokeTransaction('org.hmlr.model', body.type, body.attributes, connections[body.user]).then(() => {
        // if(body.attributes["type"] === "ApproveContract") {
        //     getAsset('org.hmlr.model', 'Contract', req.body.contractToUpdateId, connections[req.body.user]).then((contract) => {

        //         // if(contract["status"] === "FINALISED") {
        //         //     setTimeout();
        //         // }
        //         getAllAssets('org.hmlr.model', 'PropertyExchange', connections[body.user]).then((assets) => {
        //             let serialisedAssets = assets.map((asset) => {return serializer.toJSON(asset)});
        //             res.status(200).send(serialisedAssets);
        //         }).catch((error) => {
        //             res.status(200).send("ERROR " + error.message);
        //         });


        //     }).catch((error) => {
        //         logger.error(error.message);
        //         res.status(400).send("ERROR " + error.message);
        //     });
        // } else {
            res.status(200).send("SUCCESS");
        //}
    }).catch((error) => {
        res.status(400).send("ERROR " + error.message);
    });
}

app.post("/api/transaction/", (req, res) => {
    respondWithTransaction(res, req.body);
});

//------------------------------------------------------------------
// Identity Functions
//------------------------------------------------------------------

function connectToBusinessNetwork(identity) {
    logger.debug('connectToBusinessNetwork() called for ', identity);
    return new Promise((resolve, reject) => {

        // connect
        let newConnection = new BusinessNetworkConnection();
        return newConnection.connect(connectionProfileName, businessNetworkIdentifier, identity.userID, "blank", wallet == null ? {} : { wallet: wallet }).then((result) => {
            logger.debug('Created new connection object for for Participant ' + identity.userID );
            resolve(newConnection);
        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

app.post("/api/reconnect", (req, res) => {
    let promises = [];

    identities.forEach(function(identity) {
        promises.push(connectToBusinessNetwork(identity).then((connection) => {connections[identity.userID] = connection}));
    });

    Promise.all(promises).then(res.status(200).send("SUCCESS"));
});

// function reconnect() {

//     let promises = [];

//         identities.forEach(function(identity) {
//             promises.push(connectToBusinessNetwork(identity).then((connection) => {connections[identity.userID] = connection}));
//         });

//         Promise.all(promises);
// }

// reconnect();

function createIdentity(namespace, type, id, bnc) {
    logger.debug('createIdentity() called for ' + namespace + '.' + type + '#' + id);
    return new Promise((resolve, reject) => {

        // Issue the identity
        return bnc.issueIdentity(namespace + '.' + type + '#' + id, id).then((identity) => {
            logger.debug('Issued new identity \'' + id + '\' for ' + namespace + '.' + type + '#' + id);

            // Create a connection object for it
            let newConnection = new BusinessNetworkConnection();
            return newConnection.connect(connectionProfileName, businessNetworkIdentifier, identity.userID, identity.userSecret, wallet == null ? {} : { wallet: wallet }).then((result) => {
                logger.debug('Created new connection object for for Participant' + id + ', secret is ' + identity.userSecret);
                resolve(newConnection);
            });

        }).catch((error) => {
            logger.error(error.message);
            reject(error);
        });
    });
}

function respondWithCreateIdentity(res, body) {
    createIdentity('org.hmlr.model', body.type, body.id, connections[body.user]).then((connection) => {
        connections[body.id] = connection;
        res.status(200).send("SUCCESS");
    }).catch((error) => {
        res.status(200).send("ERROR " + error.message);
    });
}

app.post("/api/create/identity", (req, res) => {
    respondWithCreateIdentity(res, req.body);
});

function loadIdentityFromDisk() {

}

//==================================================================
//
// CONTRACT AGREEMENT
//
//==================================================================

app.post("/api/create/propertyexchange", (req, res) => {

    createAsset('org.hmlr.model', 'Contract', req.body.contractID, req.body.contractAttributes, connections[req.body.user]).then(() => {

        // Create a property exchange
        let contractRelationship = {
            namespace: 'org.hmlr.model',
            type: 'Contract',
            id: req.body.contractID
        };

        return createAsset('org.hmlr.model', 'PropertyExchange', req.body.propertyExchangeID, {contract: contractRelationship, status: "PRE_EXCHANGE"}, connections[req.body.user]).then(() => {

            return invokeTransaction('org.hmlr.model', 'LockProperty', {propertyId: req.body.contractAttributes.property.id}, connections[req.body.user]).then(() => {
                res.status(200).send("SUCCESS");
            }).catch((error) => {
                logger.error(error.message);
                res.status(400).send("ERROR " + error.message);
            });
        });

    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });
});


//==================================================================
//
// MAKING PAYMENTS
//
//==================================================================

app.post("/api/payment/deposit", (req, res) => {

    getAsset('org.hmlr.model', 'PropertyExchange', req.body.propertyExchangeId, connections[req.body.user]).then((propertyExchange) => {

        if(propertyExchange["contract"]["status"] === "FINALISED") {
            return createAsset('org.hmlr.model', 'DepositReceipt', req.body.receiptId, req.body.attributes, connections[req.body.user]).then(() => {

                return invokeTransaction('org.hmlr.model', 'ConfirmDepositPayment', {propertyExchangeId: req.body.propertyExchangeId, depositReceiptId: req.body.receiptId}, connections[req.body.user]).then(() => {
                    res.status(200).send("SUCCESS");

                }).catch((error) => {
                    logger.error(error.message);
                    res.status(400).send("ERROR " + error.message);
                });

            }).catch((error) => {
                logger.error(error.message);
                res.status(400).send("ERROR " + error.message);
            });
        } else {
            res.status(400).send("ERROR " + "Contract must be finalised before deposit can be made");
        }
    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });
});

app.post("/api/payment/mortgage", (req, res) => {

    getAsset('org.hmlr.model', 'PropertyExchange', req.body.propertyExchangeId, connections[req.body.user]).then((propertyExchange) => {
        if(propertyExchange["depositReceipt"]) {

            createAsset('org.hmlr.model', 'MortgageReceipt', req.body.receiptId, req.body.attributes, connections[req.body.user]).then(() => {
                return invokeTransaction('org.hmlr.model', 'ConfirmMortgagePayment', {propertyExchangeId: req.body.propertyExchangeId, mortgageReceiptId: req.body.receiptId}, connections[req.body.user]).then(() => {
                    res.status(200).send("SUCCESS");

                }).catch((error) => {
                    logger.error(error.message);
                    res.status(400).send("ERROR " + error.message);
                });

            }).catch((error) => {
                logger.error(error.message);
                res.status(400).send("ERROR " + error.message);
            });

        } else {
            res.status(400).send("ERROR " + "Deposit must be made before mortgage can be paid");
        }
    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });;
});

app.post("/api/payment/additional", (req, res) => {
    getAsset('org.hmlr.model', 'PropertyExchange', req.body.propertyExchangeId, connections[req.body.user]).then((propertyExchange) => {
        if(propertyExchange["mortgageReceipt"]) {

            return createAsset('org.hmlr.model', 'AdditionalFundsReceipt', req.body.receiptId, req.body.attributes, connections[req.body.user]).then(() => {

                return invokeTransaction('org.hmlr.model', 'ConfirmAdditionalFundsPayment', {propertyExchangeId: req.body.propertyExchangeId, additionalFundsReceiptId: req.body.receiptId}, connections[req.body.user]).then(() => {
                    res.status(200).send("SUCCESS");

                }).catch((error) => {
                    logger.error(error.message);
                    res.status(400).send("ERROR " + error.message);
                });

            }).catch((error) => {
                logger.error(error.message);
                res.status(400).send("ERROR " + error.message);
            });

        } else {
            res.status(400).send("ERROR " + "Mortgage must be paid before additional funds can be paid");
        }
    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });;
});

app.post("/api/payment/escrowpayout", (req, res) => {
    getAsset('org.hmlr.model', 'PropertyExchange', req.body.propertyExchangeId, connections[req.body.user]).then((propertyExchange) => {
        if(propertyExchange["additionalFundsReceipt"]) {

            return createAsset('org.hmlr.model', 'EscrowPayoutReceipt', req.body.receiptId, req.body.attributes, connections[req.body.user]).then(() => {

                return invokeTransaction('org.hmlr.model', 'ConfirmEscrowPayoutReceipt', {propertyExchangeId: req.body.propertyExchangeId, escrowPayoutReceiptId: req.body.receiptId}, connections[req.body.user]).then(() => {
                    res.status(200).send("SUCCESS");

                }).catch((error) => {
                    logger.error(error.message);
                    res.status(400).send("ERROR " + error.message);
                });

            }).catch((error) => {
                logger.error(error.message);
                res.status(400).send("ERROR " + error.message);
            });
        } else {
            res.status(400).send("ERROR " + "Additional funds must be paid before payout can be made");
        }
    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });
});

//==================================================================
//
// TRANSFER PROPERTY OWNERSHIP
//
//==================================================================
app.post("/api/property/transfer", (req, res) => {
    return invokeTransaction('org.hmlr.model', 'UpdatePropertyExchange', {propertyExchangeId: req.body.propertyExchangeId}, connections[req.body.user]).then(() => {
        res.status(200).send("SUCCESS");

    }).catch((error) => {
        logger.error(error.message);
        res.status(400).send("ERROR " + error.message);
    });
});

//------------------------------------------------------------------
// Populate Endpoints
//------------------------------------------------------------------

function createParticipantAndGiveIdentity(namespace, type, id, attributes) {
    logger.debug('createParticipantAndGiveIdentity called with ' + JSON.stringify(attributes));
    return createParticipant(namespace, type, id, attributes, connections['admin']).then(() => {
        return createIdentity(namespace, type, id, connections['admin']).then((connection) => {
            logger.debug('Adding connection for ' + id + ' to conenction map');
            connections[id] = connection;
        });
    });
}

/**
 * Go through the identities on disk and create them
 */
function createExistingIdentities() {

}


// app.post('/api/populate', (req, res) => {

//     Promise.resolve().then(() => {

//             return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', 'b3', {});
//         }).then(() => {

//             return createParticipantAndGiveIdentity('org.hmlr.model', 'Representative', 'r3', {});
//         }).then(() => {

//             return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', 's3', {});
//         }).then(() => {
//             return createParticipantAndGiveIdentity('org.hmlr.model', 'Lender', 'l3', {
//                 "name": "Halifax",
//                 "address": "Halifax, PO Box 548, Leeds, LS1 1WU"
//             }, connections['admin'])

//         }).then(() => {
//             return createAsset('org.hmlr.model', 'Property', 'p3', {
//                 "address": "10 Cotham Lawn Road, Cotham, (BS6 6DU)",
//                 "propertyValueInGBP": 500000,
//                 owners: [{ "namespace": "org.hmlr.model", "type": "Seller", "id": "b3" },
//                 { "namespace": "org.hmlr.model", "type": "Seller", "id": "s3" }]
//             }, connections['admin'])

//         }).then(() => {
//             return createParticipantAndGiveIdentity('org.hmlr.model', 'Escrow', 'e3', {
//                 "name": "Super secure Escrow Ltd.",
//                 "address": "1 Money Street, London"
//             }, connections['admin'])

//         }).then(() => {
//             return createAsset('org.hmlr.model', 'EscrowShadowAccount', 'es3', {
//                 owner: { "namespace": "org.hmlr.model", "type": "Escrow", "id": "e3" }
//             }, connections['admin'])

//         }).then(() => {
//             return createParticipantAndGiveIdentity('org.hmlr.model', 'HMRC', 'hmrc', {}, connections['admin'])

//         }).then(() => {
//             return createParticipantAndGiveIdentity('org.hmlr.model', 'HMLR', 'hmlr', {}, connections['admin'])

//         }).then(() => {

//         logger.debug('Connections: ' + JSON.stringify(Object.keys(connections)));

//         res.sendStatus(200);
//     });
// });







app.post('/api/populate', (req, res) => {


    Promise.resolve().then(() => {

    //     return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', 'b4', {balance: 0.0});
    // }).then(() => {

        return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000001', {
            "title": "Mr",
            "saleParticipantFirstName": "Fred",
            "saleParticipantLastName": "Jones"
        }, connections['admin']).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000002', {
                "title": "Mrs",
                "saleParticipantFirstName": "Tina",
                "saleParticipantLastName": "Jones"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000003', {
                "title": "Mr",
                "saleParticipantFirstName": "Mystery",
                "saleParticipantLastName": "Man"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000004', {
                "title": "Mrs",
                "saleParticipantFirstName": "Mary",
                "saleParticipantLastName": "Man"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000005', {
                "title": "Mr",
                "saleParticipantFirstName": "Charlie",
                "saleParticipantLastName": "Chalk"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000006', {
                "title": "Mrs",
                "saleParticipantFirstName": "Mary Grace",
                "saleParticipantLastName": "Chalk"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Seller', '100000007', {
                "title": "Mr",
                "saleParticipantFirstName": "Bill Brian",
                "saleParticipantLastName": "Badger"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', '100000008', {
                "title": "Mrs",
                "saleParticipantFirstName": "Jane",
                "saleParticipantLastName": "Smith"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', '100000009', {
                "title": "Mr",
                "saleParticipantFirstName": "Harry",
                "saleParticipantLastName": "White"
            }, connections['admin']);
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', '100000010', {
                "title": "Mrs",
                "saleParticipantFirstName": "Julie",
                "saleParticipantLastName": "White"
            }, connections['admin'])
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', '100000011', {
                "title": "Mr",
                "saleParticipantFirstName": "Jimmy",
                "saleParticipantLastName": "Porter"
            }, connections['admin'])
        }).then(() => {

            return createParticipantAndGiveIdentity('org.hmlr.model', 'Buyer', '100000012', {
                "title": "Mrs",
                "saleParticipantFirstName": "Sarah",
                "saleParticipantLastName": "Poole"
            }, connections['admin'])
        }).then(() => {

            return createAsset('org.hmlr.model', 'Property', '79984', {
                "address": "9 Cotham Lawn Road, Bristol (BS6 6DU)",
                "propertyValueInGBP": 500000,
                "status": "UP_FOR_SALE",
                owners: [{ "namespace": "org.hmlr.model", "type": "Seller", "id": "100000001" },
                { "namespace": "org.hmlr.model", "type": "Seller", "id": "100000002" }]
            }, connections['admin'])
        }).then(() => {

            return createAsset('org.hmlr.model', 'Property', '79861', {
                "address": "10 Cotham Lawn Road, Cotham, (BS6 6DU)",
                "propertyValueInGBP": 500000,
                "status": "UP_FOR_SALE",
                owners: [{ "namespace": "org.hmlr.model", "type": "Seller", "id": "100000003" },
                { "namespace": "org.hmlr.model", "type": "Seller", "id": "100000004" }]
            }, connections['admin'])
        }).then(() => {

            return createAsset('org.hmlr.model', 'Property', '83921', {
                "address": "21 Cotham Lawn Road, Cotham, Bristol (BS6 6DS)",
                "propertyValueInGBP": 500000,
                "status": "UP_FOR_SALE",
                owners: [{ "namespace": "org.hmlr.model", "type": "Seller", "id": "100000005" },
                { "namespace": "org.hmlr.model", "type": "Seller", "id": "100000006" }]
            }, connections['admin'])
        }).then(() => {

            return createAsset('org.hmlr.model', 'Property', '78537', {
                "address": "17 Cotham Lawn Road, Bristol (BS6 6DU)",
                "propertyValueInGBP": 500000,
                "status": "UP_FOR_SALE",
                owners: [{ "namespace": "org.hmlr.model", "type": "Seller", "id": "100000007" }]
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'Lender', 'santander', {
                "name": "Santander UK",
                "address": "10, The Mall, Eccles, Manchester M30 0EA"
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'Lender', 'hsbc', {
                "name": "HSBC UK",
                "address": "8 Canada Square, Canary Wharf, London E14 5HQ"
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'Lender', 'halifax', {
                "name": "Halifax",
                "address": "Halifax, PO Box 548, Leeds, LS1 1WU"
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'Escrow', 'escrow', {
                "name": "Super secure Escrow Ltd.",
                "address": "1 Money Street, London"
            }, connections['admin'])
        }).then(() => {
            return createAsset('org.hmlr.model', 'EscrowShadowAccount', 'escrowshadow1', {
                owner: { "namespace": "org.hmlr.model", "type": "Escrow", "id": "escrow" }
            }, connections['admin'])
        }).then(() => {
            return createAsset('org.hmlr.model', 'EscrowShadowAccount', 'escrowshadow2', {
                owner: { "namespace": "org.hmlr.model", "type": "Escrow", "id": "escrow" }
            }, connections['admin'])
        }).then(() => {
            return createAsset('org.hmlr.model', 'EscrowShadowAccount', 'escrowshadow3', {
                owner: { "namespace": "org.hmlr.model", "type": "Escrow", "id": "escrow" }
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'HMRC', 'hmrc', {
            }, connections['admin'])
        }).then(() => {
            return createParticipantAndGiveIdentity('org.hmlr.model', 'HMLR', 'hmlr', {}, connections['admin'])
        }).then(() => {
            logger.debug('Connections: ' + JSON.stringify(Object.keys(connections)));
            res.sendStatus(200);
        });
    });
    
});




/*
TODO:

- balance field in Buyer isn't created automatically
-
*/
