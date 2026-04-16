@echo off
cd /d "D:\aPLICATIVOS\Plantão comercial"
echo [%date% %time%] cwd=%cd% > launch-3005.trace.txt
set PORT=3005
set NODE_ENV=development
echo PORT=%PORT% NODE_ENV=%NODE_ENV% >> launch-3005.trace.txt
node node_modules\tsx\dist\cli.mjs watch server\_core\index.ts > dev-server-3005-direct.log 2>&1
