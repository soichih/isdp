
#export HPSS_PRINCIPAL=doqqs
#export HPSS_AUTH_METHOD=keytab
#export HPSS_KEYTAB_PATH=/home/hayashis/test/gis/doqqs_kt.keytab

#export DEBUG=isdp:*
export PORT=22346 

nodemon isdp
