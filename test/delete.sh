#!/bin/bash

#token="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE0MTY5MjkwNjEsImp0aSI6IjgwMjA1N2ZmOWI1YjRlYjdmYmI4ODU2YjZlYjJjYzViIiwic2NvcGVzIjp7ImlzZHAiOnsiYWN0aW9ucyI6WyJyZXF1ZXN0Il19fX0.ngTzwssllMNbb5CUsJRXPiLyOwISKFedFMxdteHttNsqjwRRI4tbXey4EdHT_cx7F_7046M-vaXIY9Isb1d3JbDsXslv0oDY48RIo1N6sIc23maB4L_e8VSUAAgJcPSFb1qgMR5YLtpRMwtRjnmj2DQtnfm_lwj_eZtw0vzUnd4"

curl -H "Accept: application/json" \
    -H "Content-type: application/json" \
    -X DELETE \
    http://localhost:12346/9f7d80bc-80f2-4d31-9dbd-8d58bc7bc8c3

