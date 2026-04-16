@echo off
cd /d "D:\aPLICATIVOS\Plantão comercial"
set PORT=3005
set NODE_ENV=development
node node_modules\tsx\dist\cli.mjs watch server\_core\index.ts > dev-server-3005.log 2>&1
