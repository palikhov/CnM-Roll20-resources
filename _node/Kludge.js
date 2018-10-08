const fs = require("fs");

Array.prototype.last = Array.prototype.last ||
	function () {
		return this[this.length - 1];
	};

function copy (obj) {
	return JSON.parse(JSON.stringify(obj));
}

function ascSort(a, b) {
	if (b === a) return 0;
	return b < a ? 1 : -1;
}

function ascSortLower (a, b) {
	return ascSort(a.toLowerCase(), b.toLowerCase());
}

function rmDir (dirPath, initial) {
	try {
		const files = fs.readdirSync(dirPath);
		files.forEach(f => {
			const filePath = `${dirPath}/${f}`;

			if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
			else cleanDir(filePath);
		});
		if (!initial) fs.rmdirSync(dirPath);
	} catch (e) {
		console.error(e);
	}
}

module.exports = {
	copy,
	ascSortLower,
	rmDir
};
