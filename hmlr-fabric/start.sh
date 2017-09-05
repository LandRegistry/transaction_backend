#!/bin/bash

# Kill everything first
docker rm -f $(docker ps -aq)

COUNT=1
VERBOSE=false
ARCHIVE_NAME="hmlr-network.bna"

CHANNEL_TX_PROFILE="OneOrgChannel"
GENESIS_BLOCK_PROFILE="OneOrgOrdererGenesis"

while getopts "h:v?:a:" opt; do
    case "$opt" in
    h|\?)
        echo "help"
        exit 0
    ;;
    v)  VERBOSE=true
    ;;
    a)  ARCHIVE_NAME=$OPTARG
    ;;
    esac
done

# Print Everything
if [ "$VERBOSE" = true ] ; then
    echo "Verbose Mode On"
    set -ev
fi

# Network name
NAME="${PWD##*/}"
export COMPOSE_PROJECT_NAME=${NAME//-}

# Remove Artefacts
rm -rf crypto-config
rm -rf config
rm -rf ~/.composer-connection-profiles
rm -rf ~/.composer-credentials


# ------------------------------------------------------------------
# Generate Artefacts
# ------------------------------------------------------------------

mkdir config
export FABRIC_CFG_PATH=$PWD

# Crypto materials
./cryptogen generate --config=./crypto-config.yaml
export CA_ROOT_CERT=$(ls crypto-config/peerOrganizations/org1.example.com/ca/ | grep sk)

# Orderer Genesis Block
./configtxgen -profile $GENESIS_BLOCK_PROFILE -outputBlock ./config/genesis.block

# Publish Channel Config Transaction
./configtxgen -profile $CHANNEL_TX_PROFILE -outputCreateChannelTx "./config/hmlrchannel.tx" -channelID "hmlrchannel"

# ------------------------------------------------------------------
# Start Network
# ------------------------------------------------------------------

# Start the network
docker-compose up -d

# Sleep for a bit to make sure the network has run
sleep 10



# ------------------------------------------------------------------
# Create & Join Channels
# ------------------------------------------------------------------

# Global channel
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c "hmlrchannel" -f "/etc/hyperledger/configtx/hmlrchannel.tx"
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel join -b "hmlrchannel.block"
mkdir ~/.composer-connection-profiles
mkdir ~/.composer-connection-profiles/hmlrchannel
cat << EOF > ~/.composer-connection-profiles/hmlrchannel/connection.json
{
    "type": "hlfv1",
    "orderers": [
    { "url" : "grpc://localhost:7050" }
    ],
    "ca": { "url": "http://localhost:7054", 
            "name": "ca.org1.example.com"
    },
    "peers": [
        {
            "requestURL": "grpc://localhost:7051",
            "eventURL": "grpc://localhost:7053"
        }
    ],
    "keyValStore": "${HOME}/.composer-credentials",
    "channel": "hmlrchannel",
    "mspID": "Org1MSP",
    "timeout": "300"
}
EOF


# ------------------------------------------------------------------
# Identity
# ------------------------------------------------------------------

# Copy over the admin account for deployment
composer identity import -p hmlrchannel \
                        -u PeerAdmin \
                        -c ./crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem \
                        -k ./crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/$(ls crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/)

# ------------------------------------------------------------------
# Deploy BNAs
# ------------------------------------------------------------------

composer network deploy -p "hmlrchannel" -a "hmlr-network.bna" -i PeerAdmin -s bleh
