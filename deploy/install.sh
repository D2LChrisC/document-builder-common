#!/usr/bin/env bash

sudo apt update
sudo apt install python3.4
curl -O https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py --user
export PATH=~/.local/bin:$PATH

pip install awscli --upgrade --user

which aws
