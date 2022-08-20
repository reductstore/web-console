# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [0.4.0] - 2022-08-21

### Added:

- Make bucket card clickable to open bucket details, [PR-30](https://github.com/reduct-storage/web-console/pull/30)
- Sorting buckets by latest record on dashboard, [PR-31](https://github.com/reduct-storage/web-console/pull/31)
- Button to Buckets page to create a new bucket, [PR-32](https://github.com/reduct-storage/web-console/pull/32)
- Console's version on slider, [PR-34](https://github.com/reduct-storage/web-console/pull/34)

### Changed:

- `reduct-js` version v0.6.0, [PR-30](https://github.com/reduct-storage/web-console/pull/30)
- Disable control buttons of bucket card on Dashboard, [PR-32](https://github.com/reduct-storage/web-console/pull/32)

### Removed:

- `crypto-browserify` dependency, [PR-30](https://github.com/reduct-storage/web-console/pull/30)

## [0.3.1]

### Fixed

- Timestamps for latest Bucket and En[try tables, [PR-24](https://github.com/reduct-storage/web-console/pull/24)
- parsing `window.location`, [PR-25](https://github.com/reduct-storage/web-console/pull/25)

## [0.3.0]

### Added

- `Max. Block Records` to bucket settings, [PR-20](https://github.com/reduct-storage/web-console/pull/20)
- Bucket Panel, [PR-21](https://github.com/reduct-storage/web-console/pull/21)

## [0.2.1] - 2022-06-25

### Fixed:

- API and UI paths for embedded console, [PR-16](https://github.com/reduct-storage/web-console/pull/16)
- Different size of bucket card in dashboard, [PR-17](https://github.com/reduct-storage/web-console/pull/17)

## [0.2.0] - 2022-06-17

### Added:

- Reduct's colours for UI, [PR-7](https://github.com/reduct-storage/web-console/pull/7)
- Bucket settings, [PR-9](https://github.com/reduct-storage/web-console/pull/9)
- Error message to CreateOrUpdate form if don't get
  settings, [PR-10](https://github.com/reduct-storage/web-console/pull/10)
- Login form for authentication with token, [PR0-13](https://github.com/reduct-storage/web-console/pull/13)

### Fixed:

- bigint conversions in bucket settings, [PR-11](https://github.com/reduct-storage/web-console/pull/11)
- SI sizes for bucket settings, [PR0-13](https://github.com/reduct-storage/web-console/pull/13)

### Changed:

- Update reduct-js to 0.4.0, [PR-6](https://github.com/reduct-storage/web-console/pull/6)

## [0.1.0] - 2022-05-15

- Initial Release

[Unreleased]: https://github.com/reduct-storage/web-console/compare/v0.4.0...HEAD

[0.4.0]: https://github.com/reduct-storage/web-console/compare/v0.3.1...v0.4.0

[0.3.1]: https://github.com/reduct-storage/web-console/compare/v0.3.0...v0.3.1

[0.3.0]: https://github.com/reduct-storage/web-console/compare/v0.2.1...v0.3.0

[0.2.1]: https://github.com/reduct-storage/web-console/compare/v0.2.0...v0.2.1

[0.2.0]: https://github.com/reduct-storage/web-console/compare/v0.1.0...v0.2.0

[0.1.0]: https://github.com/reduct-storage/web-console/releases/tag/v0.1.0
