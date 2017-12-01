/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const cfenv = require('cfenv');
const ObjectStorage = require('bluemix-object-storage');
const path = require('path');
const request = require('request');
const url = require('url');
const Wallet = require('composer-common').Wallet;

/**
 * A wallet implementation that persists identities
 * into the IBM Bluemix Object Storage service.
 */
class ObjectStorageWallet extends Wallet {

    /**
     * Download the specified file.
     * @param {string} url The URL of the specified file.
     * @return {Promise} A promise that will be resolved with
     * the contents of the specified file, or rejected with an
     * error.
     */
    _getFile(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'X-Auth-Token': this.objectStorage.token
                }
            };
            request.get(url, options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve(body);
            });
        });
    }

    /**
     * Upload the specified file.
     * @param {string} url The URL of the specified file.
     * @param {string} body The body of the specified file.
     * @return {Promise} A promise that will be resolved with
     * the contents of the specified file, or rejected with an
     * error.
     */
    _putFile(url, body) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'X-Auth-Token': this.objectStorage.token
                },
                body: body
            };
            request.put(url, options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    /**
     * Delete the specified file.
     * @param {string} url The URL of the specified file.
     * @param {string} body The body of the specified file.
     * @return {Promise} A promise that will be resolved with
     * the contents of the specified file, or rejected with an
     * error.
     */
    _deleteFile(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'X-Auth-Token': this.objectStorage.token
                }
            };
            request.delete(url, options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    /**
     * Constructor.
     * @param {string} container The container.
     */
    constructor(container, objectStorageServiceName) {
        super();
        if (!container) {
            throw new Error('container not speciied');
        }
        const appEnv = cfenv.getAppEnv();
        const creds = appEnv.getServiceCreds(objectStorageServiceName);
        if (!creds) {
            throw new Error('could not find credentials for Object Storage service!');
        }
        this.creds = creds;
        this.objectStorage = new ObjectStorage(creds.userId, creds.password, creds.projectId, container);
    }

    /**
     * List all of the credentials in the wallet.
     * @return {Promise} A promise that is resolved with
     * an array of credential names, or rejected with an
     * error.
     */
    list() {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                return files.map((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName;
                });
            });
    }

    /**
     * Check to see if the named credentials are in
     * the wallet.
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved with
     * a boolean; true if the named credentials are in the
     * wallet, false otherwise.
     */
    contains(name) {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                return files.some((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName === name;
                });
            });
    }

    /**
     * Get the named credentials from the wallet.
     * @abstract
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved with
     * the named credentials, or rejected with an error.
     */
    get(name) {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                const file = files.find((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName === name;
                });
                if (!file) {
                    throw new Error('file ' + name + ' does not exist');
                }
                return this._getFile(file);
            });
    }

    /**
     * Add a new credential to the wallet.
     * @param {string} name The name of the credentials.
     * @param {string} value The credentials.
     * @return {Promise} A promise that is resolved when
     * complete, or rejected with an error.
     */
    add(name, value) {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                let file = files.find((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName === name;
                });
                if (file) {
                    throw new Error('file ' + name + ' already exists');
                }
                file = this.objectStorage.url + '/' + name;
                return this._putFile(file, value);
            });
    }

    /**
     * Update existing credentials in the wallet.
     * @param {string} name The name of the credentials.
     * @param {string} value The credentials.
     * @return {Promise} A promise that is resolved when
     * complete, or rejected with an error.
     */
    update(name, value) {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                const file = files.find((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName === name;
                });
                if (!file) {
                    throw new Error('file ' + name + ' does not exist');
                }
                return this._putFile(file, value);
            });
    }

    /**
     * Remove existing credentials from the wallet.
     * @param {string} name The name of the credentials.
     * @return {Promise} A promise that is resolved when
     * complete, or rejected with an error.
     */
    remove(name) {
        return this.objectStorage.listContainerFiles()
            .then((files) => {
                const file = files.find((file) => {
                    const fileURL = url.parse(file);
                    const fileName = path.basename(fileURL.pathname);
                    return fileName === name;
                });
                if (!file) {
                    throw new Error('file ' + name + ' does not exist');
                }
                return this._deleteFile(file);
            });
    }

}

module.exports = ObjectStorageWallet;