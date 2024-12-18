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

### Main Function: `watchlistGrabIds()`

### **Description**

`watchlistGrabIds()` opens a playwright browser, navigates to the watchlist and scrapes all of the IDs in that watchlist.

### **Return Value**

On success, the function returns an object:

```javascript
{
  idArr: string[], // Array of rating IDs
  username: string | null // IMDb username, or null if unavailable
}
```

### **Error cases**

The function throws an error explicitly in the following cases:

1. The target watchlist is privated
2. Parsing time exceeds the time set in **`timeoutInMs`**
3. Parsing completes but the returned idArr is empty

## Example

### Scraping All Rating IDs and Username by `userId`

```javascript
const scraper = new WatchlistScraper({ userId: "ur125655832" });

try {
	const scrapingResults = await scraper.watchlistGrabIds();

	// username can be null
	const username = scrapingResults.username;
	if (!!username) {
		console.log(username);
	}

	// this is never null and always has at least 1 element
	const idArr = scrapingResults.idArr;
	console.log(idArr);
} catch (error) {
	// handle error
}
```
