# IMDb Watchlist Scraper

## Overview

This library provides a `WatchlistScraper` class for scraping IMDb watchlist data, including rating IDs and usernames, using the IMDb user ID.

---

## Class Initialization

### Parameters

- **`userId`** _(string, required)_:  
  IMDb user ID string, formatted like `'ur125655832'`.

- **`headless`** _(boolean, optional)_:  
  Default: `true`.  
  Determines whether the browser runs in headless mode. Set to `false` for testing purposes.

- **`timeoutInMs`** _(number, optional)_:  
  Default: 3 minutes (180000 ms).  
  The script timeout duration. If a timeout occurs, the `watchlistGrabIds()` function will console.error() and return `null`.

- **`userAgent`** _(string, optional)_:  
  Default:  
  `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"`.  
  Refer to [Playwright documentation](https://playwright.dev/docs/api/class-browser#browser-new-context) for user agent formatting details.
  This is used in Playwright's browser.newContext()

---

## Usage

### Scraping All Rating IDs and Username by `userId`

```javascript
const scraper = new WatchlistScraper({ userId: "ur125655832" });

// watchlistGrabIds() is async, you may want to use await or .then() depending on your use case
const idAndUsernameObj = scraper.watchlistGrabIds();

// Result
// Returns null if scraping fails.
// On success, returns an object:
// {
//   idArr: string[], // Array of rating IDs
//   username: string | null // IMDb username, or null if unavailable
// }
```
