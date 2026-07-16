@echo off
:: Double-click this to run the standard date-based synchronization push.
:: To completely overwrite GitHub with your local files, use Sync-Push-Force.bat or add "-Force" at the end of the PowerShell command below.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sync-Push.ps1"
pause
