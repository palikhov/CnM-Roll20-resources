const fs = require("fs");
const sharp = require("sharp");
const rp = require("request-promise-native");
const login = require("./GoogleAuth");
const kg = require("./Kludge");
const rq = require("./RequestQueue");

global.args = require('minimist')(process.argv.slice(2));

if (args.h || args.help) {
	console.log(`Usage: npm run art [-- [dry] [nothumbs]]`);
	return;
}

class ArtGrab {
	static get WHITE () {return {r: 255, g: 255, b: 255, alpha: 1}}

	constructor (opt= {}) {
		this.dryRun = opt.dryRun;
		this.skipThumbnailGeneration = opt.skipThumbnailGeneration;

		this.requestQueue = new rq.RequestQueue(16);

		this.fileIndex = 0;
		this.rowIndex = 0;
		this.thumbnailCount = 0;
		this.enums = {}; // fill this with values for each field
		this.index = []; // fill this with metadata for each file
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
				map: ArtGrab.semicolonMapper,
				index: true
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
				console.log(`${ArtGrab._logPad("PROCESS")}Shredding output directory...`);
				kg.rmDir("ExternalArt/dist", true);

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

				console.log(`${ArtGrab._logPad("PROCESS")}Output ${this.fileIndex} data files.`);
			});
	}

	_doAccumulateAndOutput (row) {
		if (row.artist.toLowerCase() === this.lastArtist.toLowerCase() && row.set.toLowerCase() === this.lastSet.toLowerCase()) {
			this.accumulatedRows.push(row);
			this.rowIndex++;
		} else {
			const fileName = this._saveFile(this.lastArtist, this.lastSet, {data: this.accumulatedRows});
			this._indexFile(this.lastArtist, this.lastSet, fileName, this.accumulatedRows);
			if (this.accumulatedRows.length === 1) console.warn(`${ArtGrab._logPad("ACCUMULATOR")}Artist: "${this.lastArtist}"; set: "${this.lastSet}" had only one item!`);
			this.lastArtist = row.artist;
			this.lastSet = row.set;
			this.accumulatedRows = [row];
			this.rowIndex = 0;
		}
		if (!this.skipThumbnailGeneration) this.requestQueue.add(this._doSaveThumbnail.bind(this, row.uri));
	}

	async _doSaveThumbnail (uri) {
		const fileName = `${this.fileIndex}-thumb-${this.rowIndex}.jpg`;
		const path = `./ExternalArt/dist/${fileName}`;

		let imageData;
		try {
			imageData = await rp({
				url: uri,
				encoding: null
			});
		} catch (e) {
			return console.error(`${ArtGrab._logPad("THUMBNAIL")}Failed to retrieve image data from ${uri}: `, e.message);
		}

		let img;
		try {
			img = sharp(imageData)
				.resize(180, 180, {
					fit: "contain",
					background: ArtGrab.WHITE
				})
				.flatten(ArtGrab.WHITE)
				.jpeg();
		} catch (e) {
			return console.error(`${ArtGrab._logPad("THUMBNAIL")}Failed to create thumbnail image for ${uri}: `, e.message);
		}

		if (this.dryRun) console.log(`${ArtGrab._logPad("DRY_RUN")}Skipping image write: "${fileName}"...`);
		else {
			img.toFile(path);
			const thumbnailCount = ++this.thumbnailCount;
			if (!(thumbnailCount % 50)) console.log(`${ArtGrab._logPad("THUMBNAIL")}${thumbnailCount} thumbnails created...`);
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
		});
	}

	_getNextFilename () {
		return `${this.fileIndex++}.json`;
	}

	_indexFile (artist, set, fileName, contents) {
		fileName = fileName.replace(/\.json$/, "");
		const target = (this.index[fileName] = {});
		const indexProps = Object.values(this.schema).filter(v => v.enum || v.index);
		contents.forEach(row => {
			indexProps.forEach(v => {
				const target2 = (target[v.prop] = target[v.prop] || []);
				const cell = row[v.prop];
				if (cell instanceof Array) {
					cell.map(it => v.index ? it.toLowerCase() : it).forEach(cellPart => {
						if (!target2.includes(cellPart)) target2.push(cellPart);
					})
				} else if (cell) {
					if (!target2.includes(cell)) target2.push(cell => v.index ? cell.toLowerCase() : cell);
				}
			})
		});
		Object.keys(target).forEach(k => {
			if (!target[k].length) delete target[k];
		});
		target._artist = artist;
		target._set = set;
		target._sample = contents[0].uri;
	}

	_saveFile (artist, set, contents) {
	 	const fileName = this._getNextFilename();
		const filePath = `./ExternalArt/dist/${fileName}`;

		// add headers
		contents.artist = artist;
		contents.set = set;
		// remove excess data
		contents.data.forEach(d => {
			delete d.artist;
			delete d.set;
		});

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

const grabber = new ArtGrab({dryRun: !!args.dry, skipThumbnailGeneration: !!args.nothumbs});
grabber.run();
