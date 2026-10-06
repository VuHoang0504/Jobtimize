@echo off
chcp 65001 >nul
title Kích hoạt cổng 1433 cho SQL Server
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-sql.ps1"
