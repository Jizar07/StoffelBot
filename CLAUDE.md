# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Stoffel Bot

A Discord bot project with version tracking and development logging.

## Commands

### /update (or run `update.bat`)
Updates documentation files with current timestamps and pushes changes to GitHub.
- Pulls latest changes from GitHub
- Stages CLAUDE.md, CHANGELOG.md, and DEVLOG.md
- Creates timestamped commit
- Pushes to GitHub

**Important**: DO NOT automatically push to git. Only push when the /update command is explicitly called.

## Development Guidelines

1. **Version Control**
   - Track versions in CHANGELOG.md (currently at v0.01)
   - Log all development activities with timestamps in DEVLOG.md
   - Only push to GitHub via the /update command

2. **Terminal Commands**
   - DO NOT run any terminal commands unless specifically told to
   - The user will run all terminal commands themselves
   - Provide command instructions but do not execute them

3. **Architecture Overview** - To be documented as the bot's structure emerges

4. **Language Requirements**
   - All frontend content should be available in Portuguese and English
   - Support both USA and Brasil markets
   - Provide language toggle functionality

## Android Development Rules

When working on Android app development, follow these rules:

1. **Always analyze the given files before giving recommendations** - Update the files in memory as we go. DO NOT TRUNCATE FILES.
2. **Never use examples or make assumptions** - Do not ask to make sure, double check, assure, etc.
3. **Provide one-step-at-a-time instructions** - Issues should be addressed individually.
4. **Perform error checks before giving any suggestion** - Avoid issues like "unresolved reference", missing implementations, or errors.
5. **Be specific and detailed when recommending code insertions** - Include exact file names and before/after codes.
6. **Do not suggest generic fixes** - Search online if needed and check for the latest information.
7. **Prioritize answering questions over giving code suggestions**.
8. **Provide solutions without making unnecessary changes** - DO NOT change working code unless told.
9. **When providing code suggestions, include the code inside markdown code blocks with inline comments**.

## Notes

- Manual git push policy: Only push when /update command is executed
- All documentation updates should include timestamps