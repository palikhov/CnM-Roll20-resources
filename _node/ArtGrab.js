const fs = require('fs');
const login = require("./GoogleAuth");
const kg = require("./Kludge");

global.args = require('minimist')(process.argv.slice(2));

if (args.h || args.help) {
	console.log(`Usage: npm run art [-- [--dry]]`);
	return;
}

class ArtGrab {
	constructor (opt= {}) {
		this.dryRun = opt.dryRun;

		this.fileIndex = 0;
		this.enums = {}; // fill this with values for each field
		this.index = {}; // fill this with metadata for each file
		this.schema = {
			Artist: {
				prop: "artist",
				default: "Unknown"
			},
			Set: {
				prop: "set",
				default: "Miscellaneous"
			},
			URI: {
				prop: "uri",
				clean: cell => cell.split("---").last(),
				require: true
			},
			"Feature(s)": {
				prop: "features",
				map: ArtGrab.semicolonMapper
			},
			"Size/Resolution": {
				ignore: true,
				prop: "size"
			},
			ImageType: {
				prop: "imageType",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Setting: {
				prop: "setting",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Style: {
				prop: "style",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Quality: {
				prop: "quality",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			View: {
				prop: "view",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Grid: {
				prop: "grid",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Terrain: {
				prop: "terrain",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Audience: {
				prop: "audience",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			"Sex/Gender": {
				prop: "gender",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			"Monster Type": {
				prop: "monster",
				map: ArtGrab.semicolonMapper,
				enum: true
			},
			Class: {
				prop: "class"
			},
			Support: {
				prop: "support"
			},
			Ready: {
				ignore: true,
				prop: "ready"
			}
		};
		this.schemaByIndexCache = null;

		this.lastArtist = null;
		this.lastSet = null;
		this.accumulatedRows = null;
	}

	run () {
		console.log(`${ArtGrab._logPad("SHEETS")}Authenticating...`);
		let sheets;
		login
			.getSheets()
			.then(_sheets => new Promise((resolve, reject) => {
				sheets = _sheets;
				// get headers
				_sheets.spreadsheets.values.get({
					spreadsheetId: '14NJeO5HJhUwVkBVzN3Mg7-W7adJ9FE9C9f_oT93n4M8',
					range: 'Images Vault!A1:T1',
				}, (err, res) => {
					if (err) reject(err);
					console.log(`${ArtGrab._logPad("SHEETS")}Retrieved headers...`);
					resolve(res);
				})
			}))
			.then(res => {
				const rows = res.data.values;
				if (rows.length) {
					rows[0].map(it => (it || "").trim()).forEach((h, i) => {
						const target = Object.entries(this.schema).find(([k, v]) => k === h);
						if (target) target[1].rowIndex = i;
					});

					const notFound = Object.entries(this.schema).filter(([k, v]) => v.rowIndex == null);
					if (notFound.length) throw new Error(`Schema mismatch; the following headers were not found in the spreadsheet: ${notFound.map(nf => `"${nf[0]}"`).join("; ")}\nNote that headers are CaSe-SeNsItIvE!`);

					this._generateSchemaByIndexCache();
				} else throw new Error(`No data found!`);
			})
			.then(() => new Promise((resolve, reject) => {
				// get values
				sheets.spreadsheets.values.get({
					spreadsheetId: '14NJeO5HJhUwVkBVzN3Mg7-W7adJ9FE9C9f_oT93n4M8',
					range: 'Images Vault!A2:T',
				}, (err, res) => {
					if (err) reject(err);
					console.log(`${ArtGrab._logPad("SHEETS")}Retrieved rows...`);
					resolve(res);
				})
			}))
			.then(res => {
				const rows = res.data.values;
				rows.map(r => this._parseRow(r)).filter(it => it).sort(ArtGrab._sortRows).forEach(r => {
					if (this.lastArtist == null && this.lastSet == null) {
						this.accumulatedRows = [r];
						this.lastArtist = r.artist;
						this.lastSet = r.set;
					} else {
						this._doAccumulateAndOutput(r);
					}
				});
				this._doAccumulateAndOutput({artist: "", set: ""}); // pass an empty row to trigger output

				// output enum metadata
				Object.values(this.enums).forEach(enumList => enumList.sort((a, b) => kg.ascSortLower(a.v, b.v)));
				this._saveMetaFile("enums", this.enums);

				// output index metadata
				Object.values(this.index).forEach(fileIndex => Object.keys(fileIndex).filter(k => !k.startsWith("_")).forEach(k => fileIndex[k].sort(kg.ascSortLower)));
				this._saveMetaFile(`index`, this.index);

				console.log(`${ArtGrab._logPad("PROCESS")}Run complete. Output ${this.fileIndex} data files.`)
			});
	}

	_doAccumulateAndOutput (row) {
		if (row.artist.toLowerCase() === this.lastArtist.toLowerCase() && row.set.toLowerCase() === this.lastSet.toLowerCase()) {
			this.accumulatedRows.push(row);
		} else {
			const fileName = this._saveFile(this.lastArtist, this.lastSet, {data: this.accumulatedRows});
			this._indexFile(this.lastArtist, this.lastSet, fileName, this.accumulatedRows);
			if (this.accumulatedRows.length === 1) console.warn(`${ArtGrab._logPad("ACCUMULATOR")}Artist: "${this.lastArtist}"; set: "${this.lastSet}" had only one item!`);
			this.lastArtist = row.artist;
			this.lastSet = row.set;
			this.accumulatedRows = [row];
		}
	}

	_parseRow (row) {
		const addToEnum = (prop, val) => {
			this.enums[prop] = this.enums[prop] || [];
			const existing = this.enums[prop].find(it => it.v === val);
			if (existing) {
				existing.c++;
			} else {
				this.enums[prop].push({
					v: val,
					c: 1
				})
			}
		};

		let hasAny = false;
		const out = {};

		for (let i = 0; i < row.length; ++i) {
			let cell = row[i];
			if (cell) cell = cell.trim();

			const schema = this.schemaByIndexCache[i];
			if (schema) {
				if (!cell && schema.default) cell = kg.copy(schema.default);

				if (schema.clean) cell = schema.clean(cell);
				if (schema.require && !cell) return null;
				if (!cell) continue;

				if (schema.map) cell = schema.map(cell);

				if (schema.enum) {
					if (cell instanceof Array) cell.forEach(c => addToEnum(schema.prop, c));
					else addToEnum(schema.prop, cell)
				}

				hasAny = true;
				out[schema.prop] = cell;
			}
		}

		if (!hasAny) return null;
		return out;
	}

	_generateSchemaByIndexCache () {
		this.schemaByIndexCache = {};
		Object.values(this.schema).filter(v => !v.ignore).forEach(v => {
			this.schemaByIndexCache[v.rowIndex] = v;
		})
	}

	_getNextFilename () {
		return `${this.fileIndex++}.json`;
	}

	_indexFile (artist, set, fileName, content) {
		fileName = fileName.replace(/\.json$/, "");
		const target = (this.index[fileName] = {});
		const enumProps = Object.values(this.schema).filter(v => v.enum).map(v => v.prop);
		content.forEach(row => {
			enumProps.forEach(prop => {
				const target2 = (target[prop] = target[prop] || []);
				const cell = row[prop];
				if (cell instanceof Array) {
					cell.forEach(cellPart => {
						if (!target2.includes(cellPart)) target2.push(cellPart);
					})
				} else if (cell) {
					if (!target2.includes(cell)) target2.push(cell);
				}
			})
		});
		Object.keys(target).forEach(k => {
			if (!target[k].length) delete target[k];
		});
		target._artist = artist;
		target._set = set;
	}

	_saveFile (artist, set, contents) {
	 	const fileName = this._getNextFilename();
		const filePath = `./ExternalArt/dist/${fileName}`;
		if (this.dryRun) console.log(`${ArtGrab._logPad("DRY_RUN")}Skipping data write: "${filePath}" (${contents.data.length} entries)...`);
		else fs.writeFileSync(filePath, JSON.stringify(contents), "utf-8");
		return fileName;
	}

	_saveMetaFile (metaName, data) {
		const fileName = `./ExternalArt/dist/_meta_${metaName}.json`;
		if (this.dryRun) console.log(`${ArtGrab._logPad("DRY_RUN")}Skipping meta write: "${fileName}"...`);
		else fs.writeFileSync(fileName, JSON.stringify(data), "utf-8");
	}

	static _sortRows (a, b) {
		return kg.ascSortLower(a.artist, b.artist) || kg.ascSortLower(a.set, b.set);
	}

	static _logPad (pre) {
		return `[${pre}] `.padEnd(18);
	}

	static semicolonMapper (cell) {
		return cell.split(/;/g).map(it => (it || "").trim()).filter(Boolean);
	}
}

const grabber = new ArtGrab({dryRun: !!args.dry});
grabber.run();
