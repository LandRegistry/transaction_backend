 /**
  * o be called by Buyer Representative - "Update contract if needed"
  * @param {org.hmlr.model.UpdateContract} args - the submitPrice transaction
  * @transaction
  */
  function updateContract(args) {
    return getAssetRegistry('org.hmlr.model.Contract').then(function(reg) {
        return reg.get(args.contractToUpdateId).then(function(contract) {

            if(contract["status"] === "DRAFTED") {
                //Update the contract object with new information
                Object.keys(args).forEach(function(key) {
                    var blacklist = ['contractToUpdateId', 'transactionId', 'timestamp', 'contractId'];

                    if(key.indexOf('$') === -1 && !blacklist.includes(key)) {
                        contract[key] = args[key];
                    }
                });

                //Clear out the signatures as the contract has been updated
                contract["agreed"] = [];

                return reg.update(contract);
            } else {
                throw new Error("Contract must be in DRAFTED state to be editable");
                return;
            }
        });
    });
}

/**
 * To be called by a buyer - "Request move date"
 * @param {org.hmlr.model.UpdateContractCompletionDate} args - the submitPrice transaction
 * @transaction
 */
function updateContractCompletionDate(args) {
    return getAssetRegistry('org.hmlr.model.Contract').then(function(reg) {
        return reg.get(args.contractId).then(function(contract) {

            if(contract["status"] === "DRAFTED") {
            //Set completion date in contract object
                contract["completionDate"] = args["completionDate"];

                //Clear out the signatures as the contract has been updated
                contract["agreed"] = [];

                return reg.update(contract);
            } else {
                throw new Error("Contract must be in DRAFTED state to update date");
                return;
            }
        });
    });
}


/**
 * To be called by a buyer and a seller to "sign" a contract
 * @param {org.hmlr.model.ApproveContract} args - the submitPrice transaction
 * @transaction
 */
function approveContract(args) {
    return getAssetRegistry('org.hmlr.model.Contract').then(function(reg) {
        return reg.get(args.contractToUpdateId).then(function(contract) {

            //Check to see if the contract is in DRAFTED state
            if(contract["status"] === "DRAFTED") {

                //Check to see if the contract has a completion date

                if(contract["completionDate"]) {
                    //If the contract array doesn't exist (it's a optional field), create it
                    if(!contract["agreed"]) {
                        contract["agreed"] = [];
                    }

                    //Check to see if the contract has already been signed by the current signer
                    if(contract["agreed"].includes(getCurrentParticipant().getIdentifier())) {
                        throw new Error("Can only sign contract once");
                        return;
                    }

                    //Add the current participant to the list of signatures
                    contract["agreed"].push(getCurrentParticipant().getIdentifier());

                    //If both buyer and seller have agreed and a completion date exists, update the status of the contract
                    if(contract["agreed"].length >= (contract["buyer"].length) + contract["seller"].length && contract["completionDate"] !== null) {
                        contract["status"] = "FINALISED";
                    }

                    return reg.update(contract);
                } else {
                    throw new Error("Contract must have a completion date to be agreed");
                    return;
                }
            } else {
                throw new Error("Contract must be in DRAFTED state to approve");
                return;
            }
        });
    });
}

/**
 * Confirms the deposit has been made
 * @param {org.hmlr.model.ConfirmDepositPayment} args - the submitPrice transaction
 * @transaction
 */
function confirmDepositPayment(args) {
    // Get property exchange
    return getAssetRegistry('org.hmlr.model.PropertyExchange').then(function(propReg) {
            return propReg.get(args.propertyExchangeId).then(function(propertyExchange) {

                // Get receipt
                return getAssetRegistry('org.hmlr.model.DepositReceipt').then(function(depReg) {
                    return depReg.get(args.depositReceiptId).then(function(depositReceipt) {

                        if(propertyExchange["depositReceipt"]) {
                            throw new Error("Payment cannot be made again");
                            return;
                        } else {
                            //Update the depositReceipt object
                            propertyExchange["depositReceipt"] = depositReceipt;

                            return propReg.update(propertyExchange);
                        };
                });
            });
        });
    });
}

/**
 * Confirms the mortgage payment has been made
 * @param {org.hmlr.model.ConfirmMortgagePayment} args - the submitPrice transaction
 * @transaction
 */
function confirmMortgagePayment(args) {
    // Get property exchange
    return getAssetRegistry('org.hmlr.model.PropertyExchange').then(function(propReg) {
        return propReg.get(args.propertyExchangeId).then(function(propertyExchange) {

            // Get receipt
            return getAssetRegistry('org.hmlr.model.MortgageReceipt').then(function(depReg) {
                return depReg.get(args.mortgageReceiptId).then(function(mortgageReceipt) {

                    if(propertyExchange["mortgageReceipt"]) {
                        throw new Error("Payment cannot be made again");
                        return;
                    } else {
                        //Update the mortgageReceipt object

                        if(propertyExchange["depositReceipt"]) {
                            propertyExchange["mortgageReceipt"] = mortgageReceipt;
                            
                            return propReg.update(propertyExchange);
                        } else {
                            throw new Error("Deposit must be made before mortgage can be paid");
                            return;
                        }
                    }
                });
            });       
        });
    });
}



/**
 * Confirms the additional funds have been made
 * @param {org.hmlr.model.ConfirmAdditionalFundsPayment} args - the submitPrice transaction
 * @transaction
 */
function confirmAdditionalFundsPayment(args) {
    // Get property exchange
    return getAssetRegistry('org.hmlr.model.PropertyExchange').then(function(propReg) {
        return propReg.get(args.propertyExchangeId).then(function(propertyExchange) {

            // Get receipt
            return getAssetRegistry('org.hmlr.model.AdditionalFundsReceipt').then(function(additionalFundsReg) {
                return additionalFundsReg.get(args.additionalFundsReceiptId).then(function(additionalFundsReceipt) {
                    if(propertyExchange["additionalFundsReceipt"]) {
                        throw new Error("Payment cannot be made again");
                        return;
                    } else {
                        if(propertyExchange["mortgageReceipt"]) {
                            //Update the additionalFundsReceipt object
                            propertyExchange["additionalFundsReceipt"] = additionalFundsReceipt;
                        
                            return propReg.update(propertyExchange);
                        } else {
                            throw new Error("Mortgage must be paid before additional funds can be paid");
                            return;
                        }
                    };
                });
            });       
        });
    });
}


/**
* To be called by a buyer and a seller to "sign" a contract
* @param {org.hmlr.model.ConfirmEscrowPayoutReceipt} args - the submitPrice transaction
* @transaction
*/
function confirmEscrowPayoutReceipt(args) {
    // Get property exchange
    return getAssetRegistry('org.hmlr.model.PropertyExchange').then(function(propReg) {
        return propReg.get(args.propertyExchangeId).then(function(propertyExchange) {

            // Get receipt
            return getAssetRegistry('org.hmlr.model.EscrowPayoutReceipt').then(function(escReceiptReg) {
                return escReceiptReg.get(args.escrowPayoutReceiptId).then(function(escrowPayoutReceipt) {

                    if(propertyExchange["escrowPayoutReceipt"]) {
                        throw new Error("Payment cannot be made again");
                        return;
                    } else {

                        if(propertyExchange["additionalFundsReceipt"]) {
                            propertyExchange["escrowPayoutReceipt"] = escrowPayoutReceipt;
                            propertyExchange["status"] = "COMPLETED";

                            return propReg.update(propertyExchange);
                        } else {
                            throw new Error("Additional funds must be paid before payout can be made");
                        }

                    }
                });
            });       
        });
    });
}

/**
 * To be called by a buyer and a seller to "sign" a contract
 * @param {org.hmlr.model.UpdatePropertyExchange} args - the submitPrice transaction
 * @transaction
 */
function updatePropertyExchange(args) {
    return getAssetRegistry('org.hmlr.model.PropertyExchange').then(function(propReg) {
        return propReg.get(args.propertyExchangeId).then(function(propertyExchange) {
            if(propertyExchange["status"] === "COMPLETED") {
                propertyExchange["landRegUpdated"] = true;
                return propReg.update(propertyExchange).then(function() {
                    return getAssetRegistry('org.hmlr.model.Contract').then(function(contractReg){
                        return contractReg.get(propertyExchange["contract"].getIdentifier()).then(function(contract) {
                            return getAssetRegistry('org.hmlr.model.Property').then(function(propertyReg) {
                                return propertyReg.get(contract["property"].getIdentifier()).then(function(property) {
                                    //throw new Error(propertyExchange["buyer"]);
                                    property["owners"] = contract["buyer"];
                                    return propertyReg.update(property);
                                });
                            });
                        });
                    });
                });
            } else {
                throw new Error("Cannot mark Land Registry records as updated for an exchange that is not completed");
                return;
            }
        });
    });
}


 /**
  * o be called by Buyer Representative - "Update contract if needed"
  * @param {org.hmlr.model.LockProperty} args - the submitPrice transaction
  * @transaction
  */
  function lockProperty(args) {
    return getAssetRegistry('org.hmlr.model.Property').then(function(reg) {
        return reg.get(args.propertyId).then(function(property) {
            property["status"] = "IN_PROCESS_OF_EXCHANGE";
            return reg.update(property);

            // if(property["status"] === "DRAFTED") {
            //     //Update the contract object with new information
            //     Object.keys(args).forEach(function(key) {
            //         var blacklist = ['contractToUpdateId', 'transactionId', 'timestamp', 'contractId'];

            //         if(key.indexOf('$') === -1 && !blacklist.includes(key)) {
            //             contract[key] = args[key];
            //         }
            //     });

            //     //Clear out the signatures as the contract has been updated
            //     contract["agreed"] = [];

            //     return reg.update(contract);
            // } else {
            //     throw new Error("Contract must be in DRAFTED state to be editable");
            //     return;
            // }
        });
    });
}