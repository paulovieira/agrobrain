-create local db (same name as in dev/production config)
-execute sql runner: node database/sql-runner --dev
-start: nodemon index.js --dev
-copy-paste the dummy data created by curl

-start server with pm2 
    -configure 'pm2 resurrect' with 'sudo crontab'?
    -see the option: "-u --user <username>                 define user when generating startup scrip"

-restart server
-is there anything to do in cron now?

npm modules to control the GPIO
https://github.com/EnotionZ/GpiO
https://github.com/JamesBarwell/rpi-gpio.js
https://github.com/rakeshpai/pi-gpio
https://github.com/fivdi/onoff
https://github.com/brnt/node-rpio


-handle ctrl+c signals (what to do?)
