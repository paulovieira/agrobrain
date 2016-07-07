#/bin/bash

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=80.1&data[0][type]=h&data[0][desc]=microfone_1' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=3000&data[0][type]=h&data[0][desc]=microfone_1' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=90.1&data[0][type]=h&data[0][desc]=pt_robotics' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=20.1&data[1][type]=t&data[1][desc]=pt_robotics' http://$1:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=4000.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=-40.1&data[1][type]=t&data[1][desc]=pt_robotics' http://$1:8001/api/v1/readings;
sleep 1;