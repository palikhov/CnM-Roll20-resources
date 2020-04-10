"use strict";

import {Const} from "./Const.js";
import {MiscUtil, SortUtil} from "./Util.js";
import {DownloadHelper} from "./DownloadHelper.js";

class ArtBrowser {
	static async pGetJson (url) {
		if (ArtBrowser._JSON_FETCHING[url]) {
			await ArtBrowser._JSON_FETCHING[url];
			return ArtBrowser._JSON_CACHE[url];
		}

		ArtBrowser._JSON_FETCHING[url] = (async () => {
			const response = await fetch(url);
			ArtBrowser._JSON_CACHE[url] = await response.json();
		})();

		await ArtBrowser._JSON_FETCHING[url];
		return ArtBrowser._JSON_CACHE[url];
	}

	static _searchFeatures (searchTerm, item, doLowercase) {
		// features are lowercase in index
		return !!(item.features || []).find(x => (doLowercase ? x.toLowerCase() : x).includes(searchTerm));
	}

	static _filterProps (filters, item) {
		if (Object.keys(filters).length) {
			const missingOrUnwanted = Object.keys(filters).find(prop => {
				if (!item[prop]) return true;
				const requiredVals = Object.keys(filters[prop]).filter(k => filters[prop][k]);
				const missingEnum = !!requiredVals.find(x => !item[prop].includes(x));
				const excludedVals = Object.keys(filters[prop]).filter(k => !filters[prop][k]);
				const unwantedEnum = !!excludedVals.find(x => item[prop].includes(x));
				return missingEnum || unwantedEnum;
			});
			if (missingOrUnwanted) return false;
		}
		return true;
	}

	static _filterFakeProps (filterStorage, item, filterProp, prop) {
		const filterState = filterStorage[filterProp];
		const key = item[prop];

		// There can only be one artist or set (the two "fake" filter properties) per item, so return true if:
		//  - the entire filter is white (i.e. the filter is inactive)
		//  - our value is blue (i.e. the filter is inactive, but our value is selected)
		if (filterState && Object.keys(filterState).length) return filterState[key];
		else return true;
	}

	constructor () {
		this._index = null;

		this._currentItem = null;
		this._currentIndexItem = null;
		this._search = "";

		this._itemMetas = null;

		this._filtersArtists = {};
		this._filtersSets = {};
		this._filters = {};

		this._itemObservers = [];

		this._$sideBody = null;
		this._$mainBody = null;
		this._$mainHeaderElements = null;
		this._$mainBodyInner = null;
		this._$itemBody = null;
		this._$itemBodyInner = null;
		this._$wrpBread = null;
	}

	_handleHashChange () {
		const key = window.location.hash.slice(1);
		if (key && this._index[key]) {
			const indexItem = this._index[key];

			ArtBrowser.pGetJson(`${Const.GH_PATH}${indexItem._key}.json`)
				.then(file => {
					this._currentItem = file;
					this._currentIndexItem = indexItem;
					this._doRenderItem(true);
				});
		} else {
			this._doRenderIndex();
		}
	}

	_updateCrumbs () {
		this._$wrpBread.empty();
		const $txtIndex = $(`<a href="#" class="artr__crumb btn btn-secondary">Index</a>`)
			.appendTo(this._$wrpBread);

		if (this._currentItem) {
			const $txtSlash = $(`<span class="artr__crumb artr__crumb--sep">/</span>`).appendTo(this._$wrpBread);
			const $txtItem = $(`<a href="#${this._currentIndexItem._key}" class="artr__crumb btn btn-secondary">${this._currentItem.set} \u2013 ${this._currentItem.artist}</a>`)
				.appendTo(this._$wrpBread);
		}
	}

	/**
	 * Convert a search string of the form `"ship" "sea" "black powder"` to `["ship", "sea", "black powder"]`
	 */
	_getSearchTerms () {
		const str = this._search.toLowerCase().trim();

		const len = str.length;
		const out = [];
		let stack = "";
		let inQuotes = false;

		for (let i = 0; i < len; ++i) {
			const c = str[i];
			switch (c) {
				case `"`: {
					if (inQuotes && stack && stack.trim()) {
						out.push(stack.trim());
						stack = "";
					}
					inQuotes = !inQuotes;
					break;
				}
				default: stack += c;
			}
		}

		// handle remaining output
		if (stack && stack.trim()) out.push(stack.trim());

		return out;
	}

	_applyFilterAndSearchToIndex () {
		this._search = this._search.toLowerCase();

		// require the user to search or apply a filter before displaying any results
		if (Object.keys(this._filtersArtists).length === 0
			&& Object.keys(this._filtersSets).length === 0
			&& Object.keys(this._filters).length === 0
			&& this._search.replace(/"/g, "").length < 2) return [];

		return Object.values(this._index).filter(it => {
			if (this._search) {
				const searchTerms = this._getSearchTerms();

				const lowerSet = it._set.toLowerCase();
				if (searchTerms.every(srch => lowerSet.includes(srch))) return true;

				const lowerArtist = it._artist.toLowerCase();
				if (searchTerms.every(srch => lowerArtist.includes(srch))) return true;

				if (searchTerms.every(srch => ArtBrowser._searchFeatures(srch, it))) return true;

				return false;
			}
			if (!ArtBrowser._filterFakeProps(this._filtersArtists, it, Const.FAKE_FILTER_ARTIST, "_artist")) return false;
			if (!ArtBrowser._filterFakeProps(this._filtersSets, it, Const.FAKE_FILTER_SET, "_set")) return false;
			if (!ArtBrowser._filterProps(this._filters, it)) return false;
			return true;
		});
	}

	_doRenderIndex () {
		const indexSlice = this._applyFilterAndSearchToIndex();

		this._currentItem = false;
		this._currentIndexItem = false;
		this._$mainBody.showVe();
		(this._$mainHeaderElements || []).forEach(it => it.showVe())
		this._$itemBody.hideVe();
		this._$mainBodyInner.empty();
		this._itemMetas = null;
		this._updateCrumbs();

		if (!indexSlice.length) {
			$(`<div class="artr__no_results_wrp"><div class="artr__no_results"><div class="text-center"><span class="artr__no_results_headline">No results found</span><br>Please adjust the filters (on the left) or refine your search (above).</div></div></div>`)
				.appendTo(this._$mainBodyInner);
		} else {
			this._itemMetas = indexSlice.map(it => {
				const $cbSel = $(`<input type="checkbox" class="mr-2 artr__item__cb-select">`)
					.change(() => {
						$itemBottom.toggleClass("artr__item__bottom--selected", $cbSel.prop("checked"));
					});

				let isExpanded = false;
				const $btnToggleExpanded = $(`<button class="btn btn-sm btn-primary artr__item__btn-toggle-expand mr-2">+</button>`)
					.click(() => {
						isExpanded = !isExpanded;
						$btnToggleExpanded.toggleClass("active", isExpanded);
						$itemTop.toggleClass("artr__item__top--expanded", isExpanded);
						$btnToggleExpanded.text(isExpanded ? "\u2012" : "+");
					});

				const $dispName = $(`<div class="clickable mr-2">${it._set} <i>by</i> ${it._artist} (${it._size.toLocaleString()} images)</div>`)
					.click(() => $cbSel.prop("checked", !$cbSel.prop("checked")));

				const $itemBottom = $$`<div class="artr__item__bottom flex-v-center">
					${$cbSel}
					${$btnToggleExpanded}
					${$dispName}
					<a href="#${it._key}">View</a>
				</div>`;

				// Alternate version--avoid using this, as it just wastes bandwidth
				// ${it._sample.map(sample => `<img class="artr__item__thumbnail" src="${Const.GH_PATH}${it._key}--thumb-${sample}.jpg">`).join("")}
				const $itemTop = $(`<div class="artr__item__top"><img src="${Const.IMG_LAZY_180}"></div>`);

				const $item = $$`<div class="artr__item flex-col">
					${$itemBottom}
					${$itemTop}
				</div>`
					.appendTo(this._$mainBodyInner);

				return {
					$item,
					$cbSel,
					fnHandleChangeCbAll: value => $itemBottom.toggleClass("artr__item__bottom--selected", value),
					key: it._key,
					fnOnIntersect: this._loadItemThumbnails.bind(this, $itemTop, it._key)
				};
			});

			this._addScrollHandlers();
		}
	}

	_loadItemThumbnails ($itemTop, key) {
		const indexItem = this._index[key];

		ArtBrowser.pGetJson(`${Const.GH_PATH}${indexItem._key}.json`)
			.then(file => {
				$itemTop.empty();

				const intersectionMetas = [];

				file.data
					.sort((a, b) => SortUtil.ascSortLower(a.uri, b.uri))
					.forEach(it => {
						const $img = $(`<img class="artr__item__thumbnail" src="${Const.IMG_LAZY_180}">`);
						const urlThumb = `${Const.GH_PATH}${indexItem._key}--thumb-${it.hash}.jpg`;

						const $btnCopyUrl = $(`<div class="artr__item__menu_item btn btn-secondary" title="Copy URL"><span class="fas fa-link"/></div>`)
							.click(async (evt) => {
								evt.stopPropagation();
								evt.preventDefault();

								await MiscUtil.pCopyTextToClipboard(it.uri);
								MiscUtil.showCopiedEffect($btnCopyUrl, "Copied URL!");
							});

						const $btnSupport = it.support
							? $(`<a class="artr__item__menu_item btn btn-secondary" href="${it.support}" target="_blank" title="Support Artist"><span class="fas fa-shopping-cart"/></a>`)
							: null;

						$$`<div class="artr__item__wrp relative">
							<a href="${it.uri}" target="_blank">
								${$img}
							</a>
							<div class="artr__item__menu">${$btnCopyUrl}${$btnSupport}</div>
						</div>`
							.appendTo($itemTop);

						intersectionMetas.push({eleImg: $img[0], urlThumb});
					});

				this._addHorizontalScrollHandler(intersectionMetas);
			});
	}

	_doRenderItem (resetScroll) {
		this._$mainBody.hideVe();
		(this._$mainHeaderElements || []).forEach(it => it.hideVe())
		this._$itemBody.showVe();
		this._$itemBodyInner.empty();
		this._updateCrumbs();
		if (resetScroll) this._$itemBodyInner.scrollTop(0);

		const $eles = this._currentItem.data
			.sort((a, b) => SortUtil.ascSortLower(a.uri, b.uri))
			.map(it => {
				const urlThumb = `${Const.GH_PATH}${this._currentIndexItem._key}--thumb-${it.hash}.jpg`;

				const $btnCopyUrl = $(`<div class="artr__item__menu_item btn btn-secondary" title="Copy URL"><span class="fas fa-link"/></div>`)
					.click(async (evt) => {
						evt.stopPropagation();
						evt.preventDefault();

						await MiscUtil.pCopyTextToClipboard(it.uri);
						MiscUtil.showCopiedEffect($btnCopyUrl, "Copied URL!");
					});

				const $btnSupport = it.support
					? $(`<a class="artr__item__menu_item btn btn-secondary" href="${it.support}" target="_blank" title="Support Artist"><span class="fas fa-shopping-cart"/></a>`)
					: null;

				return $$`<div class="artr__item__wrp relative">
					<a href="${it.uri}" target="_blank">
						<img class="artr__item__thumbnail" src="${urlThumb}">
					</a>
					<div class="artr__item__menu">${$btnCopyUrl}${$btnSupport}</div>
				</div>`;
			})

		const $wrpItem = $$`<div class="artr__item__top artr__item__top--expanded artr__item__top--expanded-sub-page">
			${$eles}
		</div>`;

		const $btnDownload = $(`<button class="btn btn-sm btn-primary">Download</button>`)
			.click(() => this._pHandleDownloadClick([this._currentIndexItem], {isSingleMode: true}));

		$$`<div class="flex-col w-100 h-100">
			<div class="artr__item__bottom flex-v-center">
				<div class="mr-2">${this._currentIndexItem._set} <i>by</i> ${this._currentIndexItem._artist} (${(this._currentIndexItem._size || 0).toLocaleString()} images)</div>
				${$btnDownload}
			</div>
			${$wrpItem}
		</div>`.appendTo(this._$itemBodyInner);
	}

	_addSidebarSection (propOrHeader, values, filterStorage, fnSort, ix) {
		const isInitialShowing = !ix; // hide all but first (real) section by default

		const fullName = (() => {
			switch (propOrHeader) {
				case "imageType": return "Image Type";
				case "grid": return "Grid Type";
				case "monster": return "Monster Type";
				case "audience": return "Intended Audience";
				default: return propOrHeader.uppercaseFirst();
			}
		})();

		const $dispToggle = $(`<div>${isInitialShowing ? "[\u2013]" : "[+]" }</div>`);
		const $wrpHead = $$`<div class="artr__side__tag_header mb-1">
			<div>${fullName}</div>
			${$dispToggle}
		</div>`
			.appendTo(this._$sideBody)
			.click(() => {
				$wrpBody.toggleVe();
				$dispToggle.html($dispToggle.html() === "[+]" ? "[\u2013]" : "[+]");
			});

		const getNextState = (state, dir) => {
			const ix = Const.STATES.indexOf(state) + dir;
			if (ix > Const.STATES.length - 1) return Const.STATES[0];
			if (ix < 0) return Const.STATES.last();
			return Const.STATES[ix];
		};

		values.sort(fnSort);
		const btnMetas = values.map(enm => {
				const cycleState = dir => {
					const nxtState = getNextState($btn.attr("data-state"), dir);
					$btn.attr("data-state", nxtState);

					if (nxtState === "0") {
						delete filterStorage[propOrHeader][enm.v];
						if (!Object.keys(filterStorage[propOrHeader]).length) delete filterStorage[propOrHeader];
					} else (filterStorage[propOrHeader] = filterStorage[propOrHeader] || {})[enm.v] = nxtState === "1";

					this._handleHashChange();
				};

				const $btn = $(`<button class="btn btn-secondary artr__side__tag" data-state="0">${enm.v} (${enm.c})</button>`)
					.click(() => cycleState(1))
					.contextmenu((evt) => {
						if (!evt.ctrlKey) {
							evt.preventDefault();
							cycleState(-1);
						}
					});

				return {
					$btn,
					searchText: (enm.v || "").trim().toLowerCase()
				}
			});

		const $iptSearch = $(`<input class="form-control form-control-sm" placeholder="Filter...">`)
			.change(() => {
				const searchVal = $iptSearch.val().trim().toLowerCase();

				if (!searchVal) btnMetas.forEach(it => it.$btn.showVe());
				else btnMetas.forEach(it => it.$btn.toggleVe(it.searchText.includes(searchVal)));
			})

		const $wrpBody = $$`<div class="flex-col">
			<div class="mb-1 mx-1">${$iptSearch}</div>
			<div class="artr__side__tag_grid">${btnMetas.map(it => it.$btn)}</div>
		</div>`
			.toggleVe(isInitialShowing)
			.appendTo(this._$sideBody);
	}

	_addFakeSidebarSection (title, propToCount, filterStorage) {
		const fakeValues = Object.keys(propToCount).sort(SortUtil.ascSort).map(it => ({v: it, c: propToCount[it]})); // [v]alue and [c]ount
		this._addSidebarSection(title, fakeValues, filterStorage, (a,b) => SortUtil.ascSortLower(a.v, b.v), true); // force minimize
	}

	async pInit () {
		const $win = $(`<div class="artr__win"/>`)
			.appendTo($(`#main_content`));

		const $sidebar = $(`<div class="artr__side"/>`).appendTo($win);
		const $mainPane = $(`<div class="artr__main"/>`).appendTo($win);
		const $loadings = [
			$(`<div class="artr__side__loading" title="Caching repository data, this may take some time">Loading...</div>`).appendTo($sidebar),
			$(`<div class="artr__main__loading" title="Caching repository data, this may take some time">Loading...</div>`).appendTo($mainPane)
		];

		const [enums, index] = await Promise.all([ArtBrowser.pGetJson(`${Const.GH_PATH}_meta_enums.json`), ArtBrowser.pGetJson(`${Const.GH_PATH}_meta_index.json`)]);
		this._index = index;

		Object.keys(this._index).forEach(k => this._index[k]._key = k);

		window.addEventListener("hashchange", this._handleHashChange.bind(this));

		$loadings.forEach($l => $l.remove());

		// region sidebar
		const $sideHead = $(`<div class="artr__side__head"><div class="artr__side__head__title">Filters</div></div>`).appendTo($sidebar);

		this._$sideBody = $(`<div class="artr__side__body"/>`).appendTo($sidebar);

		// Index artists/sets, to make fake tag sections
		const artists = {};
		const sets = {};
		Object.values(this._index).forEach(it => {
			artists[it._artist] = artists[it._artist] || 0;
			artists[it._artist] += it._size;
			sets[it._set] = sets[it._set] || 0;
			sets[it._set] += it._size;
		});

		this._addFakeSidebarSection(Const.FAKE_FILTER_ARTIST, artists, this._filtersArtists);
		this._addFakeSidebarSection(Const.FAKE_FILTER_SET, sets, this._filtersSets);
		Object.keys(enums).forEach((k, i) => this._addSidebarSection(k, enums[k], this._filters, (a, b) => SortUtil.ascSort(b.c, a.c), i));
		// endregion

		// region main
		this._$wrpBread = $(`<div class="artr__bread"/>`);
		this._updateCrumbs();

		let searchTimeout;
		const doSearch = () => {
			this._search = ($iptSearch.val() || "").trim();
			this._handleHashChange();
		};
		const $iptSearch = $(`<input placeholder="Search..." class="form-control artr__search__field">`)
			.title(`Multiple search terms can be provided by using quotes, e.g.: "ship" "pirate"`)
			.on("keydown", (e) => {
				clearTimeout(searchTimeout);
				if (e.which === 13) {
					doSearch();
				} else {
					searchTimeout = setTimeout(() => { doSearch(); }, 100);
				}
			});

		const $cbAll = $(`<input type="checkbox" class="mr-2 artr__item__cb-select">`)
			.change(() => {
				if (!this._itemMetas) return;
				const toVal = $cbAll.prop("checked");
				this._itemMetas.forEach(it => {
					it.$cbSel.prop("checked", toVal);
					it.fnHandleChangeCbAll(toVal);
				});
			});

		const $btnDownloadSelected = $(`<button class="btn btn-sm btn-primary" title="Download ZIP (SHIFT to download a text file of URLs)">Download Selected</button>`)
			.click(() => {
				if (!this._itemMetas) return;
				const selected = this._itemMetas.filter(it => it.$cbSel.prop("checked"));
				if (!selected.length) return alert(`Please select some items to download!`);
				const indexItems = selected.map(it => this._index[it.key]);
				return this._pHandleDownloadClick(indexItems);
			});

		const $wrpHeaderControlsMain = $$`<div class="flex-v-center no-shrink">
			${$cbAll}
			${$btnDownloadSelected}
		</div>`;
		const $spcHeaderControlsMain = $(`<div class="artr__search__divider mx-2"></div>`);
		this._$mainHeaderElements = [$wrpHeaderControlsMain, $spcHeaderControlsMain];

		const $mainHead = $$`<div class="p-2 artr__search flex-v-center">
			${$wrpHeaderControlsMain}
			${$spcHeaderControlsMain}
			<div class="flex-col w-100">
				${this._$wrpBread}
				${$iptSearch}
			</div>
		</div>`.appendTo($mainPane);

		this._$mainBody = $(`<div class="artr__view"/>`).appendTo($mainPane);
		this._$mainBodyInner = $(`<div class="artr__view_inner"/>`).appendTo(this._$mainBody);

		this._$itemBody = $(`<div class="artr__view"/>`).hideVe().appendTo($mainPane);
		this._$itemBodyInner = $(`<div class="artr__view_inner"/>`).appendTo(this._$itemBody);

		this._handleHashChange();
		// endregion
	}

	/**
	 * @param indexItems
	 * @param [opts]
	 * @param [opts.isSingleMode]
	 */
	async _pHandleDownloadClick (indexItems, opts) {
		opts = opts || {};

		const {$modalInner} = this._$getShowModal();

		$modalInner
			.addClass("flex-vh-center")
			.append(`<div class="flex-vh-center"><i>Collecting data...</i></div>`);

		const jsons = await Promise.all(indexItems.map(indexItem => ArtBrowser.pGetJson(`${Const.GH_PATH}${indexItem._key}.json`)));

		$modalInner.empty();

		const $selMode = $(`<select>
			<option value="0" selected>Text</option>
			<option value="1">JSON</option>
			<option value="2">ZIP (Warning: rate-limited)</option>
		</select>`);

		const $cbFilePerItem = $(`<input type="checkbox" checked>`);

		const $btnDownload = $(`<button class="btn btn-primary btn-sm">Download</button>`)
			.click(async () => {
				$selMode.prop("disabled", true);
				$cbFilePerItem.prop("disabled", true);
				$btnDownload.prop("disabled", true);

				try {
					const isSingleFile = !$cbFilePerItem.prop("checked");
					const mode = Number($selMode.val());

					if (isSingleFile) {
						switch (mode) {
							case 0: await DownloadHelper.downloadUrls(...jsons); break;
							case 1:  await DownloadHelper.downloadJson(...jsons); break;
							case 2: await DownloadHelper.downloadZip(...jsons); break;
							default: throw new Error(`Unhandled mode!`);
						}
					}  else {
						for (const json of jsons) {
							switch (mode) {
								case 0: await DownloadHelper.downloadUrls(json); break;
								case 1: await DownloadHelper.downloadJson(json); break;
								case 2: await DownloadHelper.downloadZip(json); break;
								default: throw new Error(`Unhandled mode!`);
							}
							await MiscUtil.pDelay(33);
						}
					}
				} catch (e) {
					alert(`Download failed! See the console for more information.`)
					throw e;
				}

				$selMode.prop("disabled", false);
				$cbFilePerItem.prop("disabled", false);
				$btnDownload.prop("disabled", false);
			});

		$$`<div class="flex-col">
			${opts.isSingleMode ? "" : `<div class="flex-v-center mb-2"><i>${indexItems.length} item${indexItems.length === 1 ? "" : "s"} selected</i></div>`}
			<label class="p-0 m-0 mb-2 flex-v-center"><div class="mr-2">Format</div>${$selMode}</label>
			${indexItems.length > 1 ? $$`<label class="p-0 m-0 mb-2 flex-v-center" title="If the download should be a single file per selected item, as opposed to the default of one file containing all items."><div class="mr-2">One file per item</div>${$cbFilePerItem}</label>` : ""}
			<div class="flex-vh-center mt-auto w-100">${$btnDownload}</div>
		</div>`.appendTo($modalInner);
	}

	_$getShowModal () {
		const doClose = () => {
			$wrpOverlay.remove();
		};

		const $wrpModal = $(`<div class="flex-col artr__modal__wrp p-2"/>`);
		const $wrpOverlay = $$`<div class="flex-vh-center artr__modal__overlay">${$wrpModal}</div>`
			.click(evt => {
				if (evt.target === $wrpOverlay[0]) doClose();
			})
			.appendTo(document.body);

		return {$modalInner: $wrpModal, doClose};
	}

	_addScrollHandlers () {
		const config = {
			rootMargin: "0px 0px",
			threshold: 0.01
		};

		this._itemObservers.forEach(it => it.disconnect());
		this._itemObservers = [];

		this._itemMetas.forEach(meta => {
			const observer = new IntersectionObserver(
				obsEntries => {
					obsEntries.forEach(entry => {
						if (entry.intersectionRatio > 0) { // filter observed entries for those that intersect
							observer.unobserve(entry.target);

							meta.fnOnIntersect();
						}
					});
				},
				config
			);

			observer.observe(meta.$item[0]);
			this._itemObservers.push(observer);
		})
	}

	_addHorizontalScrollHandler (intersectionMetas) {
		const observer = new IntersectionObserver(
			obsEntries => {
				obsEntries.forEach(entry => {
					if (entry.intersectionRatio > 0) { // filter observed entries for those that intersect
						const eleImg = entry.target;
						observer.unobserve(eleImg);

						const meta = intersectionMetas.find(meta => meta.eleImg === eleImg);
						if (!meta) return; // should never occur
						meta.eleImg.src = meta.urlThumb;
					}
				});
			},
			{
				rootMargin: "0px 0px",
				threshold: 0.01
			}
		);

		intersectionMetas.forEach(meta => observer.observe(meta.eleImg));
	}
}
ArtBrowser._JSON_CACHE = {};
ArtBrowser._JSON_FETCHING = {};

window.addEventListener("load", () => {
	// expose for debugging
	window.ART_BROWSER = new ArtBrowser();
	window.ART_BROWSER.pInit();
});
