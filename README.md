# Reduct Web Console

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/reduct-storage/web-console)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/reductstore/web-console/ci.yml?branch=main)](https://github.com/reductstore/web-console/actions)

Web console for [ReductStore](https://www.reduct.store) based on React.js and Ant Design

![WebConsole Data Browsing](readme/dashboard.png)

## Features

- Embedded to ReductStore
- Bucket Management
- Data Browsing
- Token authentication
- Data Browsing

## Demo

You can explore it by using a demo server at [play.reduct.store](https://play.reduct.store).
The API token is `reductstore`.

## Documentation

The documentation is available as a set of guides on [www.reduct.store](https://www.reduct.store/docs/guides).

## Running Locally

To run the project locally, you need to specify the URL of the ReductStore instance in the `.env` file:

```bash
REACT_APP_STORAGE_URL=https://play.reduct.store
```

Then you can run the project with:

```bash
npm install
npm start
```

If you want to run the project with a local ReductStore instance, you need to disable CORS in the browser or on the server.
To do this on the server, you can use the `RS_CORS_ALLOW_ORIGIN` environment variable:

```bash
RS_CORS_ALLOW_ORIGIN='*' reductstore
```
