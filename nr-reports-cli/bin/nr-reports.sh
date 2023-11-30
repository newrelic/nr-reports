#!/bin/bash

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(dirname ${SCRIPT_DIR})"

read -a REPORTS_PACKAGE_INFO <<<$(node -e "const p=JSON.parse(require('fs').readFileSync('$ROOT_DIR/package.json'));console.log(\`\${p.name}\`);console.log(\`\${p.version}\`)")
export APP_NAME=${REPORTS_PACKAGE_INFO[0]}
export APP_VERSION=${REPORTS_PACKAGE_INFO[1]}

node $ROOT_DIR/index.js "$@"
