## Thanks to:

lunchboxx1090 - DOMT_Art_import   Deck of Many Things

---

## Usage

The files in the `dist` directory are automatically generated from the spreadsheet [here](https://docs.google.com/spreadsheets/d/14NJeO5HJhUwVkBVzN3Mg7-W7adJ9FE9C9f_oT93n4M8/edit#gid=66737284), using the `_node/ArtGrab.js` script.

To run the script, follow the setup guide in the project's README.md, and then `$ npm run art` from the project root.

#### Options
To skip thumbnail generation: `$ npm run art -- --nothumbs`

To do a "dry run" (no files will be saved): `$ npm run art -- --dry`

To force files to be re-generated: `$ npm run art -- --force`

To set the number of times each thumbnail image download should be retried (default is 3): `$ npm run art -- --retry 5`

To set the rest time between download retries (in milliseconds) (default is 100ms): `$ npm run art -- --timeout 1000`

(Any of the above can be combined to various effect, e.g. to forcibly regenerate all index files, but not thumbnails, use the following: `$ npm run art -- --nothumbs --force`)
