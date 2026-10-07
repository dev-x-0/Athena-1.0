@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -r backend\requirements.txt
python run.py
