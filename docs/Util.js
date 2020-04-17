"use strict";

String.prototype.uppercaseFirst = String.prototype.uppercaseFirst || function () {
	const str = this.toString();
	if (str.length === 0) return str;
	if (str.length === 1) return str.charAt(0).toUpperCase();
	return str.charAt(0).toUpperCase() + str.slice(1);
};

Array.prototype.last = Array.prototype.last || function () {
	return this[this.length - 1];
};

/**
 * Template strings which can contain jQuery objects.
 * Usage: $$`<div>Press this button: ${$btn}</div>`
 * @return jQuery
 */
window.$$ = function (parts, ...args) {
	if (parts instanceof jQuery) {
		return (...passed) => {
			const parts2 = [...passed[0]];
			const args2 = passed.slice(1);
			parts2[0] = `<div>${parts2[0]}`;
			parts2.last(`${parts2.last()}</div>`);

			const $temp = $$(parts2, ...args2);
			$temp.children().each((i, e) => $(e).appendTo(parts));
			return parts;
		};
	} else {
		const $eles = [];
		let ixArg = 0;

		const handleArg = (arg) => {
			if (arg instanceof $) {
				$eles.push(arg);
				return `<${arg.tag()} data-r="true"/>`;
			} else if (arg instanceof HTMLElement) {
				return handleArg($(arg));
			} else return arg
		};

		const raw = parts.reduce((html, p) => {
			const myIxArg = ixArg++;
			if (args[myIxArg] == null) return `${html}${p}`;
			if (args[myIxArg] instanceof Array) return `${html}${args[myIxArg].map(arg => handleArg(arg)).join("")}${p}`;
			else return `${html}${handleArg(args[myIxArg])}${p}`;
		});
		const $res = $(raw);

		if ($res.length === 1) {
			if ($res.attr("data-r") === "true") return $eles[0];
			else $res.find(`[data-r=true]`).replaceWith(i => $eles[i]);
		} else {
			// Handle case where user has passed in a bunch of elements with no outer wrapper
			const $tmp = $(`<div/>`);
			$tmp.append($res);
			$tmp.find(`[data-r=true]`).replaceWith(i => $eles[i]);
			return $tmp.children();
		}

		return $res;
	}
};

$.fn.extend({
	// avoid setting input type to "search" as it visually offsets the contents of the input
	disableSpellcheck: function () { return this.attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false"); },

	tag: function () {
		return this.prop("tagName").toLowerCase();
	},

	title: function (...args) { return this.attr("title", ...args); },

	/**
	 * Quickly set the innerHTML of the innermost element, wihtout parsing the whole thing with jQuery.
	 * Useful for populating e.g. a table row.
	 */
	fastSetHtml: function (html) {
		if (!this.length) return this;
		let tgt = this[0];
		while (tgt.children.length) {
			tgt = tgt.children[0];
		}
		tgt.innerHTML = html;
		return this;
	},

	hideVe: function () { return this.addClass("ve-hidden"); },
	showVe: function () { return this.removeClass("ve-hidden"); },
	toggleVe: function (val) {
		if (val === undefined) return this.toggleClass("ve-hidden", !this.hasClass("ve-hidden"));
		else return this.toggleClass("ve-hidden", !val);
	}
});

class SortUtil {
	static ascSort (a, b) {
		if (b === a) return 0;
		return b < a ? 1 : -1;
	}

	static ascSortLower (a, b) { return SortUtil.ascSort((a || "").toLowerCase(), (b || "").toLowerCase()) }
}

class MiscUtil {
	static copy (obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	static pCopyTextToClipboard (text) {
		const $temp = $(`<textarea id="copy-temp" style="position: fixed; top: -1000px; left: -1000px; width: 1px; height: 1px;">${text}</textarea>`)
			.appendTo(document.body).select();
		document.execCommand("Copy");
		$temp.remove();
	}

	static showCopiedEffect ($ele, text = "Copied!") {
		const $temp = $(`<div class="copied-tip"><span>${text}</span></div>`)
			.appendTo(document.body);
		const top = $(window).scrollTop();
		const pos = $ele.offset();
		$temp
			.css({
				top: pos.top - $temp.height() - top,
				left: pos.left - ($temp.width() / 2) + ($ele.width() / 2)
			})
			.animate(
				{
					top: "-=8",
					opacity: 0.5
				},
				250,
				() => {
					$temp.remove();
				}
			);
	}

	static pDelay (msecs, resolveAs) {
		return new Promise(resolve => setTimeout(() => resolve(resolveAs), msecs));
	}
}

export {SortUtil, MiscUtil};
