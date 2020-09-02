@echo off

start wt --title Discord -d .. cmd.exe /k npm run-script discord_bot ;^
 split-pane --title Master -d .. cmd.exe /k npm run-script discord_master ;^
 split-pane -H --title Builder -d .. cmd.exe /k npm run-script build:watch ;^
 focus-tab -t 0