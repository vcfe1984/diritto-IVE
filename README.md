# Diritto Proprio IVE — edizione italiana

Italian version of the supplied IVE app, retaining its design and installable offline reader. It contains 17 Italian texts. The Spanish app's eight remaining texts are omitted because Italian sources were not provided.

## Preview locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser. Opening index.html directly from Finder will not load the document library because the app uses browser fetch requests.

## Publish with GitHub Pages

1. Put this folder's contents at the root of a GitHub repository.
2. Under Settings → Pages, select Deploy from a branch, then the branch and root folder.
3. Open the HTTPS address provided by GitHub Pages.

No build step, account system, external API, or remote font service is required. The app has not been published by this delivery. Keep `.nojekyll` in the repository.

## Install and use offline

Open the hosted app while connected and wait for “Pronto: disponibile offline”. Then install it through the browser's Install command. On iPhone/iPad, use Share → Add to Home Screen. The complete library, fonts, and table images are cached. Settings and bookmarks are stored on that device and browser.

Use search for words, quoted phrases such as `"vita fraterna"`, or references such as `Const 254`. Search ignores accents and case. Documents can be filtered by group or individually. Click a paragraph number to copy, share, or bookmark it; click a raised note number to open its footnote. Notes are also available in expandable sections.

## Library

The app contains the Costituzioni and 16 Direttori. It preserves the Italian editions’ numbering, including lettered numbers such as 2a. Exercise schedules are included as images that can be enlarged.

## Updating

The reader is in `app.js`, styles in `app.css`, library metadata in `data/library.json`, texts in `data/docs/`, and full-text index in `data/search.json`. When changing content, update the service worker's `VERSION` and `ASSETS` inventory in `sw.js` to release a new offline cache. The Italian edition uses separate local storage and cache prefixes from the Spanish edition.

## Verification

Validated 17 document files and 4,506 search units, document/search anchors, unique IDs, footnote targets, and JavaScript syntax. Confirmed rendered library and reader layout, Italian search results, note popups, saved bookmarks, offline cache installation, and reading/search after stopping the local server. Native mobile installation was not tested on a physical device.
