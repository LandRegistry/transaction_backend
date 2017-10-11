curl -sSL https://hyperledger.github.io/composer/install-hlfv1.sh | bash
cd ..
composer archive create -a hmlr-network.bna -t dir -n ./hmlr-network
sleep 20
composer network deploy -a hmlr-network.bna -p hlfv1 -i PeerAdmin -s adminpw

pkill -f app.js
pkill -f composer-rest-server

export NODE_ENV=development # Ensure only config/default.json is loaded
npm prune && npm install
node app.js &
composer-rest-server -p hlfv1 -n org-acme-biznet -i PeerAdmin -s adm1npw -N always -w true &

#Auto call populate
#curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{ }' 'http://localhost:3500/api/populate'

