# Changelog

All notable changes to the WebForm CLI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 🎉 Core Functionality (CRITICAL - Application Now Works!)
- **Implemented missing `scrape` command handler** - The main scraping functionality now works!
  - Schema loading and selection (simple and structured formats)
  - HTML fetching with exponential backoff retry mechanism
  - Data extraction with CSS selectors
  - Optional AI processing with Gemini LLM
  - Output formatting (JSON/text) with file saving
  - Verbose mode for detailed debugging
  - Progress indicators with colored spinners
  - Comprehensive error handling

- **Implemented missing `test` command handler** - Debug tool for testing schemas
  - Raw data extraction without AI processing overhead
  - Visual extraction summary showing field success rates
  - Selector debugging capabilities
  - Helpful troubleshooting tips
  - Field-by-field success reporting

#### 🔒 Security & Validation
- **Comprehensive input validation system** (src/validation.ts)
  - URL validation with protocol checking and private IP warnings
  - CSS selector validation to prevent injection attacks
  - File path validation to prevent path traversal
  - API key validation with placeholder detection
  - Schema selector validation integrated into loading

- **Secure API key storage**
  - Prioritize environment variables over config files
  - Deprecation warnings for config file storage
  - Automatic .env file creation with secure permissions (0o600)
  - Automatic .gitignore configuration
  - 3-second warning delay when storing keys in config

#### 🚀 Setup & User Experience
- **New `webform setup` command** - Interactive configuration wizard
  - Step-by-step setup guide for first-time users
  - Secure API key configuration via .env files
  - Model selection from available Gemini models:
    - gemini-2.0-flash (Fast, recommended)
    - gemini-1.5-pro (Most capable)
    - gemini-1.5-flash (Balanced)
  - API key testing functionality
  - Detailed setup instructions on demand
  - Security best practices guidance

#### 📝 TypeScript & Code Quality
- Added proper TypeScript interfaces for all CLI commands:
  - ScrapeCommandArguments
  - TestCommandArguments
  - SchemaViewArguments
  - SchemaValidateArguments
  - ConfigSetArguments
- Improved type documentation throughout codebase
- Better runtime type checking

### Fixed
- Fixed non-functional `scrape` command (was empty placeholder - **CRITICAL FIX**)
- Fixed non-functional `test` command (was empty placeholder - **CRITICAL FIX**)
- Fixed TypeScript compilation errors and type safety issues
- Improved error messages with stack traces in verbose mode
- Fixed schema loading to handle both simple and structured formats
- Fixed ESM/CommonJS compatibility by building successfully

### Changed
- **BREAKING:** API key storage now strongly recommends environment variables
  - Config file storage is deprecated (but still works with warnings)
  - Users guided toward .env files or environment variables
- Enhanced CLI output with better visual feedback and colors
- Improved error recovery with graceful degradation when AI fails
- Updated test mode to provide extraction quality feedback
- Formatter now validates API keys before use

### Security
- API keys no longer recommended for config file storage
- Added file permission checks (0o600 for .env files)
- Automatic .gitignore management to prevent credential leaks
- Input sanitization for URLs, file paths, and CSS selectors
- Warnings for localhost/private IP scraping attempts

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
