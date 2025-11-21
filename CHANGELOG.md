# Changelog

All notable changes to the WebForm CLI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **CRITICAL:** Implemented missing `scrape` command handler with full functionality
  - Support for schema loading and selection
  - HTML fetching with retry mechanism
  - Data extraction with structured schema support
  - Optional AI processing with Gemini
  - Output formatting (JSON/text) and file saving
  - Verbose mode for debugging
  - Progress indicators with spinners

- **CRITICAL:** Implemented missing `test` command handler
  - Raw data extraction without AI processing
  - Useful for testing CSS selectors and debugging schemas
  - Visual extraction summary showing field success rate
  - Helpful tips for troubleshooting

- Added comprehensive error handling for all command operations
- Added detailed progress feedback with colored output
- Added extraction statistics (field count, non-empty fields)

### Fixed
- Fixed non-functional `scrape` command (was empty placeholder)
- Fixed non-functional `test` command (was empty placeholder)
- Improved error messages with stack traces in verbose mode
- Fixed schema loading to handle both simple and structured formats

### Changed
- Enhanced CLI output with better visual feedback
- Improved error recovery with graceful degradation when AI fails
- Updated test mode to provide extraction quality feedback

## [1.0.0] - 2025-01-XX

### Added
- Initial release of WebForm CLI
- Schema-driven web scraping functionality
- Google Gemini AI integration for data processing
- Command-line interface with yargs
- Schema management commands (list, view, validate)
- Configuration management
- Support for JSON and text output formats
- Retry mechanism for network requests
- Tutorial and help system
- Three built-in schemas: article, product, default

### Security
- API key configuration via `.webformrc.json` or environment variables
- TERMS.md with liability disclaimers and usage warnings

### Documentation
- Comprehensive README with usage examples
- MIT License
- Installation instructions for global and local use

---

## Version History

### Upcoming Fixes (Planned)
- [ ] Fix ESM/CommonJS module compatibility issues
- [ ] Replace `any` types with proper TypeScript interfaces
- [ ] Implement secure API key storage (environment variables only)
- [ ] Add input validation and URL sanitization
- [ ] Implement rate limiting for requests
- [ ] Add robots.txt compliance checking
- [ ] Create comprehensive test suite
- [ ] Add ESLint and Prettier for code quality
- [ ] Implement request caching
- [ ] Add API cost tracking and warnings

---

## Notes

### Breaking Changes
None yet - this is the initial functional release.

### Deprecations
- Configuration file storage for API keys will be deprecated in favor of environment variables only (v2.0.0)

### Known Issues
- ESM/CommonJS compatibility warnings with chalk v5, boxen v8, ora v8
- Some type safety issues with `any` types in CLI handlers
- No rate limiting - could hit API limits
- API keys stored in plaintext in config file (security concern)
- No test coverage yet

---

For full details on any release, see the git commit history or GitHub releases page.
