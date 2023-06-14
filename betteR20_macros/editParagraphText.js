// b20-JS: Edit text paragraphs
// Select text and run the macro. It show edit dialog.
// Alter text Width to get desired paragraphs size

let length = 20;
const sel = d20.engine.selected();
const txObj = sel[0];
const txMod = txObj?.model;
if (sel.length !== 1 || txMod?.attributes?.type !== "text")
	return d20plus.ut.sendHackerChat("Please select one text object", true);

const text = txMod.attributes.text
	.split("\n\n")
	.map(s => {
		return s.split("\n").map(l => {
			if (l.length > length) length = l.length;
			return l.trim();
		}).join(" ");
	}).join("\n");

const $editor = $(`
	<div style="width: 330px;">
		<textarea style="width:100%;height:150px;box-sizing:border-box;">${text}</textarea>
		<p>
			Change width in symbols: <input value="${length}" type="number" style="width:50px;float:right"><br>
			<span style="font-size:12px">Must be integer greater than 20</span>
		</p><p>
			Change font size: <input value="${txMod.attributes.font_size}" type="number" style="width:50px;float:right"><br>
			<span style="font-size:12px">Must be integer between 8 and 72</span>
		</p>
	</div>
`).dialog({
	autoopen: true,
	title: "Edit text",
	buttons: {
		"Cancel": () => { $editor.off(); $editor.dialog("destroy").remove() },
		"Save": () => {
			const $inputs = $editor.find("input:first-child");
			const maxLength = Math.max($inputs.first().val(), 20);
			const font_size = Number($inputs.last().val());
			const paragraph = new RegExp(`(.{1,${maxLength}}(?:$| ))`, "gm");
			const text = $editor.find("textarea").val()
				.split("\n")
				.map(s => s.trim().replace(paragraph, "$1\n"))
				.join("\n");
			txMod.save({
				text,
				font_size: !isNaN(font_size) && font_size > 7 && font_size < 72 ? font_size : txMod.attributes.font_size,
			});
		},
	},
	close: () => { $editor.off(); $editor.dialog("destroy").remove() }
});