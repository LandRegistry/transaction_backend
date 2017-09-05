cd ..
composer archive create -a hmlr-network.bna -t dir -n ./hmlr-network
composer network update -a hmlr-network.bna -p hlfv1 -i PeerAdmin -s adminpw
