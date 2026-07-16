@echo off
:: Double-click this to run the standard date-based synchronization pull.
:: To completely overwrite your local folder with GitHub's state, use Sync-Pull-Force.bat or add "-Force" at the end of the PowerShell command below.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Sync-Pull.ps1"
pause
