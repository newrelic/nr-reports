#!/bin/bash

BUILD_TYPE=${BUILD_TYPE:-'deploy'}

node $SCRIPT_DIR/init.js $APP_DIR/deploy $BUILD_TYPE > $APP_DIR/deploy/.cfenv.$BUILD_TYPE && source $APP_DIR/deploy/.cfenv.$BUILD_TYPE

if [ -f "$APP_DIR/deploy/.cfenv" ]; then
  source $APP_DIR/deploy/.cfenv
fi

if [ -n "$PREFIX" ]; then
  PREFIX=${PREFIX}_
fi
