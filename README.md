# Roll20Content

---

## Development

Node.js is required.

To use Google API functionality, a client ID/secret is required; see Step 1 [here](https://developers.google.com/sheets/api/quickstart/nodejs).
Download the `credentials.json` file it provides, and **place the file in the project root**. 

**DO NOT commit this file** or otherwise share it, as it provides various access permissions to the Google account which was used to create it. Similarly, `token.json` (which the login process generates) should be kept private.
