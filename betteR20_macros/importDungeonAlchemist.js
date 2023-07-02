// b20-JS: Import Dungeon Alchemist map data
// All credits go to the original authors of the API script
// More info in the Dungeon Alchemist help https://www.dungeonalchemist.com/import-to-roll20
// Instead of step 5, after you've got your map exported from DA,
// run this macro, press Load from File or paste the map data to the text prompt and press Import

// This script allows you to import Dungeon Alchemist maps into Roll20.
// By:       Karel Crombecq, Briganti
// Contact:  info@briganti.be

var DungeonAlchemistImporter = (() => {

  // BEGIN MOD: Imitate API functions
  const sendChat = (as, input) => {
    d20.textchat.incoming(false, {
      id: d20plus.ut.generateRowId(),
      who: as,
      type: "general",
      content: input,
      playerid: window.currentPlayer.id,
      avatar: "https://yt3.googleusercontent.com/qTpLXBxCdfX6x20z7Yifc-61rhFua6ixhxyRd4-j-j_p4AmZSn_GQPRRM1p9sT_NgZOiw_V4tA=s900-c-k-c0x00ffffff-no-rj",
      inlinerolls: [],
    });
  };

  const getObj = (type, id) => {
    if (type === "player") return currentPlayer;
    else if (type === "page") return d20.Campaign.activePage();
    else if (type === "graphic") return d20plus.ut.getTokenById(id);
  };

  const findObjs = () => {
    const graphics = d20.Campaign.activePage().thegraphics;
    return graphics.filter((it) => it.get('layer') === 'map');
  };

  const createObj = (objType, obj, ...others) => {
    switch (objType) {
      case "path": {
        const page = d20.Campaign.activePage();
        obj.scaleX = obj.scaleX || 1;
        obj.scaleY = obj.scaleY || 1;
        obj.path = obj.path || obj._path;
        return page.thepaths.create(obj);
      }
      case "door": {
        const page = d20.Campaign.activePage();
        obj.path = obj.path || obj._path;
        if (DungeonAlchemistImporter.configDoors === "X") return;
        return page.doors.create(obj);
      }
      case "window": {
        const page = d20.Campaign.activePage();
        obj.path = obj.path || obj._path;
        if (DungeonAlchemistImporter.configWindows === "X") return;
        return page.windows.create(obj);
      }
      case "graphic": {
        const page = d20.Campaign.activePage();
        obj.path = obj.path || obj._path;
        if (DungeonAlchemistImporter.configLights === "X") return;
        return page.thegraphics.create(obj);
      }
      default:
        // eslint-disable-next-line no-console
        console.error("Unhandled object type: ", objType, "with args", obj, others)
        break;
    }
  };

  const playerIsGM = () => !!is_gm;

  const Campaign = () => d20.Campaign;

  // END MOD Original code below
  // eslint-disable-line no-unused-vars

  const scriptName = "DungeonAlchemistImporter";
  const version = "0.0.4";
  const lastUpdate = 20211220;
  const schemaVersion = 0.1;
  const defaultGridSize = 70;
  const clearURL = '/images/editor/torch.svg';


  const regex = {
    colors: /^(?:#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|transparent)$/,
  };

  const _h = {
    outer: (...o) =>
      `<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">${o.join(
        " "
      )}</div>`,
    title: (t, v) =>
      `<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">${t} v${v}</div>`,
    subhead: (...o) => `<b>${o.join(" ")}</b>`,
    minorhead: (...o) => `<u>${o.join(" ")}</u>`,
    optional: (...o) => `${ch("[")}${o.join(` ${ch("|")} `)}${ch("]")}`,
    required: (...o) => `${ch("<")}${o.join(` ${ch("|")} `)}${ch(">")}`,
    header: (...o) =>
      `<div style="padding-left:10px;margin-bottom:3px;">${o.join(" ")}</div>`,
    section: (s, ...o) => `${_h.subhead(s)}${_h.inset(...o)}`,
    paragraph: (...o) => `<p>${o.join(" ")}</p>`,
    group: (...o) => `${o.join(" ")}`,
    items: (o) => `<li>${o.join("</li><li>")}</li>`,
    ol: (...o) => `<ol>${_h.items(o)}</ol>`,
    ul: (...o) => `<ul>${_h.items(o)}</ul>`,
    clearBoth: () => `<div style="clear:both;"></div>`,
    grid: (...o) =>
      `<div style="padding: 12px 0;">${o.join("")}${_h.clearBoth()}</div>`,
    cell: (o) =>
      `<div style="width: 130px; padding: 0 3px; float: left;">${o}</div>`,
    inset: (...o) =>
      `<div style="padding-left: 10px;padding-right:20px">${o.join(" ")}</div>`,
    join: (...o) => o.join(" "),
    configRow: (...o) =>
      `<div ${css(defaults.css.configRow)}>${o.join(" ")}</div>`,
    makeButton: (c, l, bc, color) =>
      `<a ${css({
        ...defaults.css.button,
        ...{ color, "background-color": bc },
      })} href="${c}">${l}</a>`,
    floatRight: (...o) => `<div style="float:right;">${o.join(" ")}</div>`,
    pre: (...o) =>
      `<div style="border:1px solid #e1e1e8;border-radius:4px;padding:8.5px;margin-bottom:9px;font-size:12px;white-space:normal;word-break:normal;word-wrap:normal;background-color:#f7f7f9;font-family:monospace;overflow:auto;">${o.join(
        " "
      )}</div>`,
    preformatted: (...o) => _h.pre(o.join("<br>").replace(/\s/g, ch(" "))),
    code: (...o) => `<code>${o.join(" ")}</code>`,
    attr: {
      bare: (o) => `${ch("@")}${ch("{")}${o}${ch("}")}`,
      selected: (o) => `${ch("@")}${ch("{")}selected${ch("|")}${o}${ch("}")}`,
      target: (o) => `${ch("@")}${ch("{")}target${ch("|")}${o}${ch("}")}`,
      char: (o, c) =>
        `${ch("@")}${ch("{")}${c || "CHARACTER UniversalVTTImporter"}${ch(
          "|"
        )}${o}${ch("}")}`,
    },
    bold: (...o) => `<b>${o.join(" ")}</b>`,
    italic: (...o) => `<i>${o.join(" ")}</i>`,
    font: {
      command: (...o) =>
        `<b><span style="font-family:serif;">${o.join(" ")}</span></b>`,
    },
  };

  const helpParts = {
    helpBody: (context) =>
      _h.join(
        _h.header(
          _h.paragraph(
            `${scriptName} allows you to import Dungeon Alchemist map data (walls and lights) into Roll20.`
          )
        ),
        _h.section(
          "How to import?",
          _h.paragraph(
            `In order to import a Dungeon Alchemist map into Roll20, you need to export it with the Roll20 setting. This will give you two files: your map image with extension .jpg, and .txt file with the same file name.`
          ),
          _h.paragraph(
            `Just copy all the text in the .txt file, paste it into the box below and press Import. It should import all your walls and lights. If you go to the "Dynamic Lighting" layer, they should be there now.`
          ),
          _h.paragraph(`That's it! Enjoy your adventure.`)
        )
      ),
    helpConfig: (context) =>
      _h.outer(
        _h.title(scriptName, version),
        playerIsGM(context.playerid)
          ? _h.group(_h.subhead("Configuration"), getAllConfigOptions())
          : ""
      ),
    helpDoc: (context) =>
      _h.join(_h.title(scriptName, version), helpParts.helpBody(context)),

    helpChat: (context) =>
      _h.outer(_h.title(scriptName, version), helpParts.helpBody(context)),
  };

  const assureHelpHandout = (create = true) => {
    const helpIcon =
      "https://s3.amazonaws.com/files.d20.io/images/127392204/tAiDP73rpSKQobEYm5QZUw/thumb.png?15878425385";

    // find handout
    let props = { type: "handout", name: `Help: ${scriptName}` };
    let hh = findObjs(props)[0];
    if (!hh) {
      log(`Create handout for ${scriptName}`);
      hh = createObj("handout", Object.assign(props, { avatar: helpIcon }));
      create = true;
    }
    if (create || version !== state[scriptName].lastHelpVersion) {
      hh.set({
        notes: helpParts.helpDoc({ who: "handout", playerid: "handout" }),
      });
      state[scriptName].lastHelpVersion = version;
      log("  > Updated Help Handout to v" + version + " <");
    }
  };

  const checkInstall = () => {
    log("-=> Dungeon Alchemist importer, version " + version);
    if (!state[scriptName]) {
      state[scriptName] = {};
    }
    assureHelpHandout();
  };

  const createWall = (page, map, wall, originalGridSize, gridSize, version) => {

    let x1 = wall.wall3D.p1.top.x * gridSize / originalGridSize;
    let y1 = wall.wall3D.p1.top.y * gridSize / originalGridSize;
    let x2 = wall.wall3D.p2.top.x * gridSize / originalGridSize;
    let y2 = wall.wall3D.p2.top.y * gridSize / originalGridSize;

    const xCenter = (x1 + x2) * 0.5;
    const yCenter = (y1 + y2) * 0.5;

    const xMin = Math.min(x1, x2);
    const yMin = Math.min(y1, y2);
    const xMax = Math.max(x1, x2);
    const yMax = Math.max(y1, y2);

    const width = xMax - xMin;
    const height = yMax - yMin;

    log("Center: " + xCenter + "," + yCenter);

    // because partial walls used to be exported as windows, we can't support them for older exports
    const generateWindows = version >= 2;

    // new door/window API
    if (wall.type == 1 || (wall.type == 2 && generateWindows)) {

      const type = (wall.type == 1) ? "door" : "window";
      const color = (wall.type == 1) ? "#00ff00" : "#00ffff";

      x1 -= xCenter;
      x2 -= xCenter;
      y1 -= yCenter;
      y2 -= yCenter;

      let open = wall.open;
      if (typeof(open) === 'undefined') open = false;

      var doorObj = {
        pageid: page.get("_id"),
        color: color,
        x: xCenter,
        y: -yCenter,
        isOpen: open,
        isLocked: false,
        isSecret: false,
        path: {
          handle0: {x: x1, y: y1},
          handle1: {x: x2, y: y2},
        },
        controller_by: map.get("_id"),
      };
      createObj(type, doorObj);
      log(doorObj);
    }

    // default
    else if (wall.type == 0 || wall.type == 4 || (wall.type == 2 && !generateWindows)) {

      x1 -= xMin;
      x2 -= xMin;
      y1 -= yMin;
      y2 -= yMin;

      const path = [
        ["M", x1, y1],
        ["L", x2, y2],
      ];
  
      // different wall types have different colors - we use a color scheme compatible with WOTC modules and DoorKnocker
      let color = "#0000ff";
      let barrierType = "wall";
      if (wall.type == 4) {
        color = "#5555ff";
        barrierType = "transparent";
      }

      // backwards compatibility
      else if (wall.type == 2) {
        color = "#00ffff"; // window (light blue)
        barrierType = "transparent";
      }

      createObj("path", {
        pageid: page.get("_id"),
        stroke: color,
        fill: "transparent",
        left: xCenter,
        top: yCenter,
        width: width,
        height: height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        stroke_width: 5,
        layer: "walls",
        path: JSON.stringify(path),
        barrierType: barrierType,
        controller_by: map.get("_id"),
      });
    }
  };

  const createLight = (page, light, originalGridSize, gridSize) => {

	const x = light.position.x * gridSize / originalGridSize;
	const y = light.position.y * gridSize / originalGridSize;

	
	const range = light.range * 1.0;
	let dim_radius = range;
	let bright_radius = range / 2;
	
	// convert to the local scale value
	const scale_number = page.get("scale_number");
  //log("Go from dim_radius " + dim_radius + " which has range " + range + " to per tile " + (dim_radius/originalGridSize) + " from original grid size " + originalGridSize + " and scale_number is " + scale_number);
	dim_radius *= scale_number / originalGridSize;
	bright_radius *= scale_number / originalGridSize;


	var newObj = createObj('graphic',{
		imgsrc: clearURL,
		subtype: 'token',
		name: '', /* BEGIN MOD we don't need auras since we got original "torch" image
		aura1_radius: 0.5,
		aura1_color: "#" + light.color.substring(0, 6), */

		// UDL
		emits_bright_light: true,
		emits_low_light: true,
		bright_light_distance: bright_radius,
		low_light_distance: dim_radius,

		width:70,
		height:70,
		top: y,
		left: x,
		layer: "walls",
		pageid: page.get("_id")
	  });

    //log("New obj light distance: " + newObj.get("bright_light_distance") + " / " + newObj.get("low_light_distance"));
  };

  const getMap = (page, msg) => {

    // simplest case - get the ONLY map graphic and use that one
    var mapGraphics = findObjs({
      _pageid: page.get("_id"),
      _type: "graphic",
      layer: "map",
    });

    // filter them all so we only consider the layer=map graphics
    if (mapGraphics.length === 1) {
      return mapGraphics[0];
    }

    // no map
    if (mapGraphics.length == 0) {
      sendChat(
        "Dungeon Alchemist",
        "You need to upload your map image and put it in the Map Layer before importing the line-of-sight data. Make sure that your map is in the background layer by right clicking on it, selecting \"Layer\" and choosing \"Map Layer\"."
      );
      return null;
    }

    // otherwise, see if we selected one
    var selected = msg.selected;
    if (selected === undefined || selected.length == 0) {
      sendChat(
        "Dungeon Alchemist",
        "If you have more than one image in the map layer, you need to select the one that contains the Dungeon Alchemist map image before running the command."
      );
      return null;
    }
	else {
      return getObj("graphic", selected[0]._id);
    }
  };

  const resizeMap = (gridSize, grid, page, map) => {

    const mapWidth = grid.x * gridSize;
    const mapHeight = grid.y * gridSize;

    page.set({
      width: (grid.x * gridSize) / defaultGridSize,
      height: (grid.y * gridSize) / defaultGridSize,
    });

    map.save({ // B20 MOD swap .set to .save so that it actually works
      width: mapWidth,
      height: mapHeight,
      top: mapHeight / 2,
      left: mapWidth / 2,
      layer: "map",
    });
  };

  const handleInput = (msg) => {
    log("Handle input!");
    log(msg);
    if (
      "api" === msg.type &&
      /^!dungeonalchemist\b/i.test(msg.content) &&
      playerIsGM(msg.playerid)
    ) {
      const s = msg.content;
      const endOfHeader = s.indexOf(" ");

      try {
        // parse the data
        const json = s.substring(endOfHeader);
        const data = JSON.parse(json);

        // determine the version
        let version = data.version;
        if (typeof(version) === 'undefined') version = 1;

        // load the player
        const player = getObj("player", msg.playerid);
        //log("PLAYER:");
        //log(player);
        const lastPageId = player.get("_lastpage");
        //log(lastPageId);

        // load the page
        const pageId = Campaign().get("playerpageid");
        //log("Page id: " + pageId + " vs last page " + lastPageId);
        const page = getObj("page", lastPageId);
        //log("PAGE:");
        //log(page);

        // calculate the REAL grid size
        const gridSize = defaultGridSize * page.get("snapping_increment");

        // load the map
        const map = getMap(page, msg);
        //log("MAP:");
        //log(map);

        // we are done - no map found
        if (map === null) return;

        // resize the map properly
        resizeMap(gridSize, data.grid, page, map);


        // spawn the walls & lights
        for (const wall of data.walls) {
          createWall(page, map, wall, data.pixelsPerTile, gridSize, version);
        }

        for (const light of data.lights) {
          createLight(page, light, data.pixelsPerTile, gridSize);
        }

        sendChat(
          "Dungeon Alchemist",
          "Succesfully imported map data!"
        );
      } catch (err) {
        sendChat(
          "Dungeon Alchemist",
          "Failed to import Dungeon Alchemist map data: " + err
        );
      }
    }
  }; /* BEGIN MOD remove original handlers and then add public interfaces

  const registerEventHandlers = () => {
    on("chat:message", handleInput);
  };

  on("ready", () => {
    checkInstall();
    registerEventHandlers();
  }); */

  return {
    init: function () {
      const $editor = $(DungeonAlchemistImporter.dialog).dialog({
        autoopen: true,
        title: "Dungeon Alchemist Importer",
        width: 500,
        buttons: {
          "Cancel": () => { $editor.off(); $editor.dialog("destroy").remove() },
          "Load from file": () => {
            const fileSelect = $editor.find("input");
            fileSelect.off("change");
            fileSelect.on("change", () => {
              const file = fileSelect[0].files[0];
              const reader = new FileReader();
              reader.addEventListener('load', (event) => {
                const txt = event.target.result;
                DungeonAlchemistImporter.process($editor, txt);
              });
              reader.readAsText(file);
            });
            fileSelect.click();
          },
          "Import": () => {
            const txt = $editor.find("textarea").val();
            DungeonAlchemistImporter.process($editor, txt);
          },
        },
        close: () => { $editor.off(); $editor.dialog("destroy").remove() }
      })
    },

    process: ($editor, txt) => {
      const msg = {
        type: "api",
        playerid: currentPlayer.id,
        content: txt,
        selected: d20.engine.selected().map(it => ({_id: it._model.id})),
      };
      DungeonAlchemistImporter.configDoors = $editor.find(".doors-config").val();
      DungeonAlchemistImporter.configWindows = $editor.find(".windows-config").val();
      handleInput(msg);
      $editor.off();
      $editor.dialog("destroy").remove()
    },

    dialog: `
      <div style="width: 350px;">${helpParts.helpBody()}
      <textarea
        style="width:100%;height:100px;box-sizing:border-box;"
        placeholder="You can either\n- Paste map data here and press Import,\n- OR just press Load from file and select the txt"
        ></textarea>
      <p style="height: 28px;">How to handle doors:
      <select class="doors-config" style="width:160px;float:right">${[
          ["d", "Default"],
          ["X", "Don't import"],/*
          ["s", "As secret doors"],
          ["sl", "As opened secret doors"],
          ["LN", "As solid lines (not suppported)"]*/
        ].reduce((html, [v, o]) => {
          return `${html}<option value="${v}">${o}</option>`
        }, "") }
      </select></p>
      <p style="height: 28px;">How to handle windows:
      <select class="windows-config" style="width:160px;float:right">${[
        ["d", "Default"],
        ["X", "Don't import"],/*
        ["o", "As opened windows"],
        ["l", "As locked windows"],
        ["LN", "As solid lines (not suppported)"]*/
      ].reduce((html, [v, o]) => {
          return `${html}<option value="${v}">${o}</option>`
        }, "") }
      </select></p>
      <p style="height: 28px;">How to handle light sources:
      <select style="width:160px;float:right">${[
        ["d", "Default"],
        ["X", "Don't import"],
      ].reduce((html, [v, o]) => {
          return `${html}<option value="${v}">${o}</option>`
        }, "") }
      </select></p><input style="display:none" type="file" name="file" accept=".txt"/>
      </div>
    `,
  }
})();

DungeonAlchemistImporter.init();
