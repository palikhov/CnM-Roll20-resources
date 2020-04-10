class DownloadHelper {
	static queue = [];

	static async _doNextDownload () {
		const item = DownloadHelper.queue[0];

		function doDisplayDownloadBar ($content, isError, cbCancel) {
			const $bar = $(`#dl_bar`).css({display: "flex"}).removeClass("alert-danger").removeClass("alert-info").empty();
			const $wrpContent = $(`<div class="artr__dl_bar-wrp-content"></div>`).append($content).appendTo($bar);
			const $wrpBtn = $(`<div class="artr__dl_bar-wrp-control"></div>`).appendTo($bar);

			const $btnCancelClose = $(`<button class="btn artr__dl_bar-btn-close"><span class="fas fa-times"/></button>`)
				.click(() => {
					$bar.hide();
					cbCancel();
				})
				.appendTo($wrpBtn);

			if (isError) {
				$bar.addClass("alert-danger");
			} else {
				$bar.addClass("alert-info");
			}

			return $wrpContent;
		}

		function doUpdateStatus (str, isError = false, isComplete = false) {
			if (isError) $wrpContent.parent().removeClass("alert-info").addClass("alert-danger");
			$wrpContent.html(str);
			if (isComplete) {
				doUpdateQueueAndTriggerNext();
			}
		}

		function doUpdateQueueAndTriggerNext () {
			DownloadHelper.queue.shift();
			if (DownloadHelper.queue.length) DownloadHelper._doNextDownload();
		}

		function pAjaxLoad (url) {
			const oReq = new XMLHttpRequest();
			const p = new Promise((resolve, reject) => {
				// FIXME cors-anywhere has a usage limit, which is pretty easy to hit when downloading many files
				oReq.open("GET", `https://cors-anywhere.herokuapp.com/${url}`, true);
				oReq.responseType = "arraybuffer";
				let lastContentType = null;
				oReq.onreadystatechange = () => {
					const h = oReq.getResponseHeader("content-type");
					if (h) {
						lastContentType = h;
					}
				};
				oReq.onload = function () {
					const arrayBuffer = oReq.response;
					resolve({buff: arrayBuffer, contentType: lastContentType});
				};
				oReq.onerror = (e) => reject(new Error(`Error during request: ${e}`));
				oReq.send();
			});
			p.abort = () => oReq.abort();
			return p;
		}

		let isCancelled = false;
		let downloadTasks = [];

		const $wrpContent = doDisplayDownloadBar(
			`Download starting...`,
			false,
			() => {
				isCancelled = true;
				downloadTasks.forEach(p => {
					try { p.abort(); } catch (ignored) {}
				});
				DownloadHelper.queue.shift();
				if (DownloadHelper.queue.length) DownloadHelper._doNextDownload();
			});

		try {
			if (isCancelled) return;

			try {
				const toSave = [];
				let downloaded = 0;
				let errorCount = 0;

				const getWrappedPromise = dataItem => {
					const pAjax = pAjaxLoad(dataItem.uri);
					const p = new Promise(async resolve => {
						try {
							const data = await pAjax;
							toSave.push(data);
						} catch (e) {
							console.error(`Error downloading "${dataItem.uri}":`, e);
							++errorCount;
						}
						++downloaded;
						doUpdateStatus(`Downloading ${downloaded}/${item.data.length}... (${Math.floor(100 * downloaded / item.data.length)}%)${errorCount ? ` (${errorCount} error${errorCount === 1 ? "" : "s"})` : ""}`);
						resolve();
					});
					p.abort = () => pAjax.abort();
					return p;
				};

				downloadTasks = item.data.map(dataItem => getWrappedPromise(dataItem));
				await Promise.all(downloadTasks);

				if (isCancelled) return;

				doUpdateStatus(`Building ZIP...`);

				const zip = new JSZip();
				toSave.forEach((data, i) => {
					const extension = (data.contentType || "unknown").split("/").last();
					zip.file(`${`${i}`.padStart(3, "0")}.${extension}`, data.buff, {binary: true});
				});

				if (isCancelled) return;

				zip.generateAsync({type: "blob"})
					.then((content) => {
						if (isCancelled) return;

						doUpdateStatus(`Downloading ZIP...`);
						const filename = item.set && item.artist
							? `${item.set}__${item.artist}`
							: "bulk-images";
						DownloadHelper.saveAs(content, DownloadHelper.sanitizeFilename(filename));
						doUpdateStatus(`Download complete.`, false, true);
					});
			} catch (e) {
				doUpdateStatus(`Download failed! Error was: ${e.message} (check the log for more information).`, true);
				console.error(e);
				doUpdateQueueAndTriggerNext();
			}
		} catch (e) {
			doUpdateQueueAndTriggerNext();
		}
	}

	static async downloadZip (...items) {
		if (items.length === 1) DownloadHelper.queue.push(items[0]);
		else {
			const fakeItem = {data: items.map(it => it.data).flat()};
			DownloadHelper.queue.push(fakeItem);
		}

		if (DownloadHelper.queue.length === 1) await DownloadHelper._doNextDownload();
	}

	static async downloadUrls (...items) {
		const filename = items.length === 1
			? `${items[0].set}__${items[0].artist}`
			: `bulk-urls`;

		const contents = items.map(it => it.data).flat().map(it => it.uri).join("\n");
		const blob = new Blob([contents], {type: "text/plain"});
		DownloadHelper.saveAs(blob, DownloadHelper.sanitizeFilename(filename));
	}

	static async downloadJson (...items) {
		const filename = items.length === 1
			? `${items[0].set}__${items[0].artist}`
			: `bulk-jsons`;

		const asJson = items.map(it => ({
			artist: it.artist,
			set: it.set,
			uris: it.data.map(it => it.uri)
		}));

		const contents = JSON.stringify(asJson, null, "\t");
		const blob = new Blob([contents], {type: "application/json"});
		DownloadHelper.saveAs(blob, DownloadHelper.sanitizeFilename(filename));
	}

	static sanitizeFilename (str) {
		return str.trim().replace(/[^\w\-]/g, "_");
	}
}

DownloadHelper.queue = [];

// based on:
/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/src/FileSaver.js */
DownloadHelper.saveAs = function () {
	const view = window;
	let
		doc = view.document
		// only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function () {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function (node) {
			let event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios = /CriOS\/[\d]+/.test(navigator.userAgent)
		, setImmediate = view.setImmediate || view.setTimeout
		, throw_outside = function (ex) {
			setImmediate(function () {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function (file) {
			let revoker = function () {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function (filesaver, event_types, event) {
			event_types = [].concat(event_types);
			let i = event_types.length;
			while (i--) {
				let listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function (blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function (blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			let
				filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function () {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function () {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						let reader = new FileReader();
						reader.onloadend = function () {
							let url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							let popup = view.open(url, '_blank');
							if (!popup) view.location.href = url;
							url = undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						let opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				};
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setImmediate(function () {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				}, 0);
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function (blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		};
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function (blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}
	FS_proto.abort = function () {};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;
	FS_proto.error =
		FS_proto.onwritestart =
			FS_proto.onprogress =
				FS_proto.onwrite =
					FS_proto.onabort =
						FS_proto.onerror =
							FS_proto.onwriteend =
								null;

	return saveAs;
}();

export {DownloadHelper};
