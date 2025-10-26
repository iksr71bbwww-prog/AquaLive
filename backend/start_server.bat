@echo off
echo Starting Groundwater Wells MongoDB Server...
echo.
echo Make sure MongoDB is running on localhost:27017
echo Database: groundwaterDB
echo Collection: wells
echo.
cd /d "%~dp0"
python wells_server.py
pause