# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added:

- RS-587: File upload dialog in EntryDetail view allowing users to upload files with metadata, [PR-82](https://github.com/reductstore/web-console/pull/82)
- RS-XXX: Add upload button to bucket panel allowing users to create new entries by uploading files, [PR-86](https://github.com/reductstore/web-console/pull/86)

### [1.9.0] - 2025-02-25

### Fixed

- RS-582: fix remove modal to display error messages, [PR-75](https://github.com/reductstore/web-console/pull/75)
- RS-600: fix CI workflow and corrected a prop name in EntryCard component, [PR-77](https://github.com/reductstore/web-console/pull/77)
- RS-603: fix table loading state to display empty table when no data is available, [PR-78](https://github.com/reductstore/web-console/pull/78)

### Added:

- RS-580: browse records in the console, [PR-76](https://github.com/reductstore/web-console/pull/76)
- RS-588: add useful links in the side menu, [PR-79](https://github.com/reductstore/web-console/pull/79)
- RS-594: filter data with when conditions in object explorer, [PR-80](https://github.com/reductstore/web-console/pull/80)

### [1.8.1] - 2024-12-16

### Fixed

- RS-554: add forgotten HARD quota type to bucket settings, [PR-72](https://github.com/reductstore/web-console/pull/72)

## [1.8.0] - 2024-11-06

### Added

- RS-509: add option to rename a bucket in the console, [PR-70](https://github.com/reductstore/web-console/pull/70)
- RS-510: add option to rename an entry in the console, [PR-71](https://github.com/reductstore/web-console/pull/71)

## [1.7.0] - 2024-08-19

### Added:

- RS-319: add downsampling options to Create/Update Replication form, [PR-69](https://github.com/reductstore/web-console/pull/69)

### Changed:

- Update `antd` up to 5.18.3, [PR-68](https://github.com/reductstore/web-console/pull/68)

## [1.6.1] - 2024-06-09

### Fixed:

- RS-314: fix infinite requests for token list, [PR-67](https://github.com/reductstore/web-console/pull/67)

## [1.6.0] - 2024-05-31

### Added:

- RS-180: Show license information in the web console, [PR-64](https://github.com/reductstore/web-console/pull/64)

### Changed:

- RS-234: Add prettier to CI and reformat code, [PR-65](https://github.com/reductstore/web-console/pull/65)

## [1.5.0] - 2024-03-01

### Added:

- RS-47: New view in the console to manage replications, [PR-62](https://github.com/reductstore/web-console/pull/62)

### Fixed:

- Fix token creation, [PR-63](https://github.com/reductstore/web-console/pull/63)

## [1.4.1] - 2024-20-01

### Fixed:

- RS-41: Remount entry confirmation component, [PR-61](https://github.com/reductstore/web-console/pull/61)

## [1.4.0] - 2023-10-11

### Added:

- RS-11: Mark provisioned resources and disable its control
  components, [PR-59](https://github.com/reductstore/web-console/pull/59)

## [1.3.0] - 2023-08-17

### Added:

- Add a button to remove entry, [PR-58](https://github.com/reductstore/web-console/pull/58)

## [1.2.2] - 2023-06-03

### Fixed:

- Updating quota type, [PR-56](https://github.com/reductstore/web-console/pull/56)

## [1.2.1] - 2023-06-03

### Changed:

- Distribute console as a `zip` archive, [PR-53](https://github.com/reductstore/web-console/pull/53)
- Update `reduct-js` to 1.4.0, [PR-54](https://github.com/reductstore/web-console/pull/54)

## [1.2.0] - 2023-01-25

### Added:

- Hiding admin control elements for token without full
  access, [PR-49](https://github.com/reductstore/web-console/pull/49)
- Update data each 5 seconds automatically, [PR-50](https://github.com/reductstore/web-console/pull/50)

## [1.1.1] - 2022-12-18

### Changed:

- Rebranding: update logo and project name, [PR-46](https://github.com/reductstore/web-console/pull/46)

## [1.1.0] - 2022-11-27

### Added

- UI for token management, [PR-44](https://github.com/reduct-storage/web-console/pull/44)

## [1.0.0] - 2022-10-03

### Changed:

- Update `reduct-js` to 1.0.0, [PR-43](https://github.com/reduct-storage/web-console/pull/43)

## [0.5.0] - 2022-09-14

### Added:

- Validation for bucket name, [PR-39](https://github.com/reduct-storage/web-console/pull/39)
- Input field to confirm bucket name before removing, [PR-40](https://github.com/reduct-storage/web-console/pull/40)
- Build and publish on release page from CI, [PR-41](https://github.com/reduct-storage/web-console/pull/41)

### Changed:

- Update `reduct-js` to 0.7.0, [PR-42](https://github.com/reduct-storage/web-console/pull/42)

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

[Unreleased]: https://github.com/reduct-storage/web-console/compare/v1.8.1...HEAD
[1.9.0]: https://github.com/reduct-storage/web-console/compare/v1.9.0...v1.8.1
[1.8.1]: https://github.com/reduct-storage/web-console/compare/v1.8.1...v1.8.0
[1.8.0]: https://github.com/reduct-storage/web-console/compare/v1.8.0...v1.7.0
[1.7.0]: https://github.com/reduct-storage/web-console/compare/v1.7.0...v1.6.1
[1.6.1]: https://github.com/reduct-storage/web-console/compare/v1.6.1...v1.6.0
[1.6.0]: https://github.com/reduct-storage/web-console/compare/v1.6.0...v1.5.0
[1.5.0]: https://github.com/reduct-storage/web-console/compare/v1.5.0...v1.4.1
[1.4.1]: https://github.com/reduct-storage/web-console/compare/v1.4.1...v1.4.0
[1.4.0]: https://github.com/reduct-storage/web-console/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/reduct-storage/web-console/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/reduct-storage/web-console/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/reduct-storage/web-console/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/reduct-storage/web-console/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/reduct-storage/web-console/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/reduct-storage/web-console/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/reduct-storage/web-console/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/reduct-storage/web-console/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/reduct-storage/web-console/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/reduct-storage/web-console/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/reduct-storage/web-console/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/reduct-storage/web-console/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/reduct-storage/web-console/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/reduct-storage/web-console/releases/tag/v0.1.0
