@echo off
echo.
echo ========================================
echo         Stoffel Bot Update Command
echo ========================================
echo.

REM Get current date and time
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a:%%b)

echo Current Time: %mydate% %mytime%
echo.
echo Updating documentation files...
echo.

REM Pull latest changes from git
echo Pulling latest changes from GitHub...
git pull origin main
echo.

REM Stage all documentation files
echo Staging documentation files...
git add CLAUDE.md CHANGELOG.md DEVLOG.md
echo.

REM Create commit with timestamp
echo Creating commit...
git commit -m "Update documentation - %mydate% %mytime%"
echo.

REM Push to GitHub
echo Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo Update complete!
echo ========================================
echo.