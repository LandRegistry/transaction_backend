'use strict';

const cth = require('./composer-test-helper.js');

describe('Submission Tests', () => {

    before(() => {
        const helper = new ComposerTestHelper();
        helper.createNetwork();
    });

    beforeEach(() => {
        console.log('this should happen many times');
    });

    it('do a thing', () => {
        console.log('1');
    });

    it('do another thing', () => {
        console.log('2');
    });
});