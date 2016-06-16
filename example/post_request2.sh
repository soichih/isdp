#!/bin/bash

token="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE0MTY5MjkwNjEsImp0aSI6IjgwMjA1N2ZmOWI1YjRlYjdmYmI4ODU2YjZlYjJjYzViIiwic2NvcGVzIjp7ImlzZHAiOnsiYWN0aW9ucyI6WyJyZXF1ZXN0Il19fX0.ngTzwssllMNbb5CUsJRXPiLyOwISKFedFMxdteHttNsqjwRRI4tbXey4EdHT_cx7F_7046M-vaXIY9Isb1d3JbDsXslv0oDY48RIo1N6sIc23maB4L_e8VSUAAgJcPSFb1qgMR5YLtpRMwtRjnmj2DQtnfm_lwj_eZtw0vzUnd4"

curl -H "Accept: application/json" \
    -H "Content-type: application/json" \
    -H "Authorization: Bearer $token" \
    -X POST -d '
{
    "name": "Test request 2 for IDSP dev instance",
    "notification_email": "hayashis@iu.edu", 
    "files": [ 
        "intopo/historic/geopdf/24k/in_aberdeen_156636_1965_24000_geo.zip",
        "intopo/historic/geopdf/24k/in_aberdeen_156637_1965_24000_geo.zip",
        "intopo/historic/geopdf/24k/in_aberdeen_159421_1943_24000_geo.zip",
        "intopo/historic/geopdf/24k/in_aberdeen_159423_1953_24000_geo.zip",
        "intopo/historic/geopdf/24k/in_aberdeen_159425_1953_24000_geo.zip",
        "intopo/historic/geopdf/24k/in_aberdeen_159427_1965_24000_geo.zip"
    ]
}' \
    http://localhost:12346/request

