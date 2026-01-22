@echo off
setlocal

:: Base repo URL
set REPO_PATH=https://msgit.rnd.metricstream.com/GS/RCBC/
:: Local target directory
set TARGET_DIR=C:\RCBC_GIT

:: List of modules
set MODULES=AXU GRX CMX MEX RSX DMX XTS TVX TSX LSX ISX QSX RXG SBX TPX SPX XTR RCX XTC ORX

:: Create target directory if it doesn't exist
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

cd /d "%TARGET_DIR%"

for %%M in (%MODULES%) do (
    echo =====================================
    echo Processing %%M

    if not exist "%%M" (
        echo Cloning %%M...
        git clone "%REPO_PATH%%%M.git"
    ) else (
        echo Repo %%M already exists. Updating...
    )

    cd /d "%TARGET_DIR%\%%M"

    :: Fetch latest branches
    git fetch origin

    :: Checkout Development branch (create if missing)
    git branch --list Development >nul
    if %errorlevel%==0 (
        git checkout Development
    ) else (
        git checkout -b Development origin/Development
    )

    :: Revert local changes and pull latest
    git reset --hard
    git clean -fd
    git pull origin Development

    cd /d "%TARGET_DIR%"
)

echo All repositories updated and on Development branch.
pause
