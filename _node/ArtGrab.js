const fs = require('fs');
const login = require("./GoogleAuth");

class ArtGrab {
	static test () {
		login.getSheets().then(sheets => {
			sheets.spreadsheets.values.get({
				spreadsheetId: '14NJeO5HJhUwVkBVzN3Mg7-W7adJ9FE9C9f_oT93n4M8',
				range: 'Images Vault!A2:T',
			}, (err, res) => {
				if (err) return console.error(`The API returned an error: ${err.message}`, err);

				const rows = res.data.values;
				if (rows.length) {
					rows.map((row) => {
						console.log(row.join(" !! "));
					});
				} else {
					console.log('No data found.');
				}
			});
		});
	}
}

ArtGrab.test();
