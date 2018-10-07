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

module.exports = {
	copy,
	ascSortLower
};
