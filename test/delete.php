#!/usr/bin/php
<?php


$ch = curl_init();
//'http://localhost:12346');
 
//curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/json'));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_URL, "http://localhost:12346/04021c8a-2b15-4694-95cc-6f8da8349d21");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");

$result = curl_exec($ch);
curl_close($ch);
echo "result:".$result;

#curl -H "Accept: application/json" \
#    -H "Content-type: application/json" \
#    -X DELETE \
#    http://localhost:12346/9f7d80bc-80f2-4d31-9dbd-8d58bc7bc8c3

