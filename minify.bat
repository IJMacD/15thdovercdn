@echo off
cd css
echo Minifying colour.v4.css
java -jar E:\Code\yuicompressor-2.4.7\build\yuicompressor-2.4.7.jar -o colour.v4.min.css colour.v4.css
echo Minifying colour.v4.6.css
java -jar E:\Code\yuicompressor-2.4.7\build\yuicompressor-2.4.7.jar -o colour.v4.6.min.css colour.v4.6.css
echo Minifying calendar.v4.css
java -jar E:\Code\yuicompressor-2.4.7\build\yuicompressor-2.4.7.jar -o calendar.v4.min.css calendar.v4.css
echo Minifying news.v4.css
java -jar E:\Code\yuicompressor-2.4.7\build\yuicompressor-2.4.7.jar -o news.v4.min.css news.v4.css
echo Done
pause