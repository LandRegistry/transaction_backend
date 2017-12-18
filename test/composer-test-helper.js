'use strict';

// Connection 
const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;

// Browser File System
const bfs = require('browserfs/dist/node/index');
const fs = bfs.BFSRequire('fs');

// Logging
const log4js = require('log4js');
const logger = log4js.getLogger('ComposerTestHelper');

// Other
const path = require('path');

/**
 * Wrapper for the Business Network Connection that simplifies a lot of the commands to 
 * single calls and adds some helper functions for creating large amounts of dummy data.
 */
class ComposerTestHelper {

    //-----------------------------------------------------------------------------
    // Network Admin
    //-----------------------------------------------------------------------------

    /**
     * Create an In-memory network and connect to it with the admin
     * @param {*} archivePath 
     * @param {*} networkName 
     */
    createNetwork(archivePath, networkName) {
        // Create an in-memory network
        logger.debug("Creating network");
        BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
        this.adminConnection = new AdminConnection({ fs: fs });
        this.businessNetworkConnections['admin'] = new BusinessNetworkConnection({ fs: fs });

        // Create a connection profile for the network
        logger.debug("Establishing admin connection as admin");
        this.adminConnection.createProfile('testProfile', {type : 'embedded'}).then(() => {
            return this.adminConnection.connect('testProfile', 'admin', 'adminpw');

        // Create a .bna from the supplied directory
        }).then(() => {
            logger.debug("Making BNA");
            return BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, archivePath));

        // Deploy the network
        }).then((businessNetworkDefinition) => {
            logger.debug("Deploying BNA");
            return this.adminConnection.deploy(businessNetworkDefinition);

        // Establish a business network connection
        }).then(() => {
            logger.debug("Establishing user connection as admin");
            return this.businessNetworkConnection['admin'].connect('testProfile', networkName, 'admin', 'adminpw');

        // Get the factory
        }).then(() => {
            this.factory = this.businessNetworkConnection['admin'].getBusinessNetwork().getFactory();
        });
    }


    //-----------------------------------------------------------------------------
    // Resources
    //-----------------------------------------------------------------------------

    /**
     * Create a resource
     * @param {*} namespace fds
     * @return {Promise} Promise that resolves when the resource has been created
     */
    createResource(namespace, type, id, attrs) {
        let newResource = this.factory.newResource(namespace, type, id);
        Object.keys(attrs).forEach((key) => {
            newResource[key] = attrs[key];
        });
    }

    /**
     * Create a number of assets and return their IDs
     * @param {*} namespace 
     * @param {*} type 
     * @param {*} number 
     * @return {Promise} Promise that resolves to a string array of IDs
     */
    createResources(namespace, type, number) {
        return null;
    }

    //-----------------------------------------------------------------------------
    // Identities
    //-----------------------------------------------------------------------------

    /**
     * 
     */
    createIdentity() {

    }

    /**
     * Change the 
     * @param {*} id 
     */
    changeIdentity(id) {

    }
}

module.exports = ComposerTestHelper;