
#export HPSS_PRINCIPAL=doqqs
#export HPSS_AUTH_METHOD=keytab
#export HPSS_KEYTAB_PATH=/home/hayashis/test/gis/doqqs_kt.keytab

#export DEBUG=isdp:*
#export PORT=22346 

#nodemon isdp

pm2 delete isdp
pm2 start isdp.js --watch --ignore-watch="\.log \.git test"
pm2 save
