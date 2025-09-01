# Changelog

All notable changes to Stoffel Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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