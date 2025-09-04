# Changelog

All notable changes to Stoffel Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.04] - 2025-09-04

### Added
- 🎵 Complete interactive music bot system with Discord Player
- YouTube and Spotify playlist/song support with auto-detection
- Interactive music control buttons (play, pause, skip, stop, volume, etc.)
- Rich visual music displays with progress bars, thumbnails, and queue info
- Advanced music features: shuffle, loop modes (Off → Track → Queue)
- Auto-leave functionality (when empty/done) with configurable timeouts
- Volume controls with ±10% buttons and manual adjustment (1-100%)
- Queue management with position tracking and detailed song information
- Music settings panel in frontend with comprehensive configuration options
- Platform controls (YouTube/Spotify enable/disable toggles)
- Queue size limits and playlist support controls
- Global command registration system for faster Discord integration

### Fixed
- Discord bot permissions and OAuth scopes (`applications.commands` scope added)
- Command registration issues causing "unknown integration" errors
- Bot startup hanging due to missing opus audio processing library
- Variable naming conflicts in music command implementation
- Port conflicts between multiple bot instances

### Technical
- Added required dependencies: `@discordjs/opus`, `discord-player`, `@discord-player/extractor`, `@distube/ytdl-core`, `ffmpeg-static`
- Implemented button interaction handlers for music controls
- Added voice connection intents (`GuildVoiceStates`)
- Created helper functions for progress bars, duration formatting, and rich embeds
- Exported music utility functions for cross-component usage

## [v0.03] - 2025-09-04

### Added
- Bot customization system with `/customize` Discord command
- Server-specific bot nickname changes with real-time updates
- Complete API endpoints for bot customization management (GET/POST/DELETE)
- Frontend bot customization interface in automod settings page
- Portuguese translations for all bot customization UI elements
- Input validation and error handling for nickname changes
- User tracking for customization history with timestamps

### Changed  
- Streamlined frontend command list by removing /ping, /update, /stats commands
- Updated command descriptions to focus on user-facing functionality only
- Enhanced multilingual support with comprehensive Portuguese translations

### Removed
- Avatar customization functionality (Discord API limitation)
- Unnecessary command references from frontend display

## [v0.02] - 2025-09-01

### Added
- Complete PayPal subscription payment system
- Bilingual support (English/Portuguese) using next-i18next
- Discord OAuth authentication with NextAuth.js
- Subscription management with localStorage fallback
- Development testing functionality for subscription bypass
- PayPal sandbox integration with monthly ($6.99) and yearly ($49.99) plans
- Client-side subscription status checking
- Payment success/cancel pages with proper UX flow

### Fixed
- Session persistence issues in Pages Router
- PayPal component destruction and re-rendering issues
- Server-side rendering conflicts with client-side storage
- Subscription status checking for testing scenarios

## [v0.01] - 2025-09-01

### Added
- Initial project setup
- Created repository structure
- Added CLAUDE.md for development guidance
- Added CHANGELOG.md for version tracking
- Added DEVLOG.md for development logging