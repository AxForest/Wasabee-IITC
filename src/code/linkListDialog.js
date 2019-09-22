import Sortable from "./sortable";
import UiHelper from "./uiHelper.js";
import LinkDialogButtonControl from "./linkDialogButton";

// don't use this _dialog[] any more. Use the new framework.
var _dialogs = [];
var Wasabee = window.plugin.Wasabee;

export default class LinkListDialog {
  constructor(operation, portal) {
    let that = this;
    this._operation = operation;
    this._portal = portal;
    this._table = new Sortable();
    this._dialog = null;
    this._table.fields = [
      {
        name: "Throw Order",
        value: link => link.throwOrderPos,
        sort: (a, b) => {
          return a - b;
        },
        format: (a, m) => {
          a.textContent = m;
        }
      },
      {
        name: "From",
        value: link => that._operation.getPortal(link.fromPortalId),
        sortValue: b => b.name,
        sort: (a, b) => a.localeCompare(b),
        format: (d, data) => d.appendChild(UiHelper.getPortalLink(data))
      },
      {
        name: "To",
        value: link => that._operation.getPortal(link.toPortalId),
        sortValue: b => b.name,
        sort: (a, b) => a.localeCompare(b),
        format: (d, data) => d.appendChild(UiHelper.getPortalLink(data))
      },
      {
        name: "Length",
        value: obj => that.getLinkLength(obj),
        format: (a, m) => {
          a.classList.add("length");
          a.textContent =
            m > 1e3 ? (m / 1e3).toFixed(1) + "km" : m.toFixed(1) + "m";
        }
      },
      {
        name: "Min Lvl",
        title: "Minimum level required on source portal",
        value: obj => that.getLinkLength(obj),
        format: (a, b) => {
          var s;
          if (b > 6881280) {
            s = "impossible";
          } else {
            if (b > 1966080) {
              s = "L8+some VRLA";
              a.title =
                "Depending on the number and type Link Amps used, a lower source portal level might suffice.";
              a.classList.add("help");
            } else {
              if (b > 655360) {
                s = "L8+some LA";
                a.title =
                  "Depending on the number and type Link Amps used, a lower source portal level might suffice.";
                a.classList.add("help");
              } else {
                var d = Math.max(1, Math.ceil(8 * Math.pow(b / 160, 0.25)) / 8);
                var msd = 8 * (d - Math.floor(d));
                s = "L" + d;
                if (0 != msd) {
                  if (!(1 & msd)) {
                    s = s + "\u2007";
                  }
                  if (!(1 & msd || 2 & msd)) {
                    s = s + "\u2007";
                  }
                  s =
                    s +
                    (" = L" +
                      Math.floor(d) +
                      "0\u215b\u00bc\u215c\u00bd\u215d\u00be\u215e".charAt(
                        msd
                      ));
                }
              }
            }
          }
          a.textContent = s;
        }
      },
      {
        name: "Description",
        value: link => link.description,
        sort: (a, b) => a.localeCompare(b),
        format: (row, obj) => {
          row.className = "desc";
          if (obj != null) {
            row.innerHTML = window.escapeHtmlSpecialChars(obj);
          }
        }
      },
      {
        name: "Assigned To",
        value: link => {
          if (link.assignedTo != null) {
            const agent = window.plugin.wasabee.getAgent(link.assignedTo);
            if (agent != null) {
              return agent.name;
            } else {
              return "looking up: " + link.assignedTo;
            }
          }
          return "";
        },
        sort: (a, b) => a.localeCompare(b),
        format: (a, m) => {
          a.textContent = m;
        }
      },
      {
        name: "Color",
        value: link => link.color,
        sort: null,
        format: (list, data, link) => {
          that.makeColorMenu(list, data, operation, link);
        }
      },
      {
        name: "",
        sort: null,
        value: link => link,
        format: (o, e) => that.makeMenu(o, e)
      }
    ];
    this._table.sortBy = 0;
    this._setLinks();
    _dialogs.push(this);
    if (this._table.items.length > 0) {
      let that = this;
      this._dialog = window.dialog({
        html: this._table.table,
        dialogClass: "wasabee-dialog wasabee-dialog-linklist",
        title: this._portal.name + ": Links",
        width: "auto",
        closeCallback: () => {
          _dialogs = [];
          window.removeHook("wasabeeUIUpdate", that.update);
        },
        id: window.plugin.Wasabee.static.dialogNames.linkList
      });
      window.addHook("wasabeeUIUpdate", that.update);
      var buttons = this._dialog.dialog("option", "buttons");
      this._dialog.dialog(
        "option",
        "buttons",
        $.extend(
          {},
          {
            "Add Links": () => {
              if (that._portal) {
                window.renderPortalDetails(that._portal.id);
              }
              let ld = new LinkDialogButtonControl(window.map);
              ld._operation = that._operation();
              ld._displayDialog();
            }
          },
          buttons
        )
      );
    } else {
      alert("No links found.");
    }
  }

  _setLinks() {
    this._table.items = this._operation.getLinkListFromPortal(this._portal);
  }

  getLinkLength(link) {
    var latlngs = link.getLatLngs(this._operation);
    return L.latLng(latlngs[0]).distanceTo(latlngs[1]);
  }

  deleteLink(link) {
    if (
      confirm(
        "Do you really want to delete the link: " +
          this._operation.getPortal(link.fromPortalId).name +
          " -> " +
          this._operation.getPortal(link.toPortalId).name
      )
    ) {
      this._operation.removeLink(link.fromPortalId, link.toPortalId);
      this._setLinks();
    }
  }

  reverseLink(link) {
    this._operation.reverseLink(link.fromPortalId, link.toPortalId);
    this._setLinks();
  }

  setDescription(link) {
    var promptAction = prompt("Link Description", link.description);
    if (promptAction !== null) {
      link.description = promptAction;
      this._operation.update();
    }
    this._setLinks();
  }

  makeMenu(list, data) {
    var $Wasabee = this;
    var state = new Wasabee.OverflowMenu();
    state.items = [
      {
        label: "Reverse",
        onclick: () => $Wasabee.reverseLink(data)
      },
      {
        label: "Delete",
        onclick: () => $Wasabee.deleteLink(data)
      },
      {
        label: "Set Description",
        onclick: () => $Wasabee.setDescription(data)
      }
    ];
    list.className = "menu";
    list.appendChild(state.button);
  }

  makeColorMenu(list, data, operation, link) {
    const colorSection = list.appendChild(document.createElement("div"));
    const linkColor = colorSection.appendChild(
      document.createElement("select")
    );
    linkColor.id = link.ID;

    window.plugin.Wasabee.layerTypes.forEach(function(a) {
      const option = document.createElement("option");
      option.setAttribute("value", a.name);
      if (a.name == "main") {
        a.displayName = "Op Color";
      }
      if (a.name == data) {
        option.setAttribute("selected", true);
      }
      option.innerHTML = a.displayName;
      linkColor.append(option);
    });

    linkColor.addEventListener(
      "change",
      () => {
        link.color = linkColor.value;
        operation.update();
      },
      false
    );
  }

  update(operation) {
    // this is super hacky
    _dialogs[0]._setLinks(operation, _dialogs[0]._portal);
  }

  // this needs a lot of love
  static showDialog(operation, portal, show) {
    var p = 0;
    var parameters = _dialogs;
    for (; p < parameters.length; p++) {
      var page = parameters[p];
      if (page._operation.ID == operation.ID) {
        page._operation = operation;
      } else {
        return page._dialog.dialog("close");
      }
      if (!page._operation.containsPortal(page._portal)) {
        return page._dialog.dialog("close");
      }
      page._setLinks();
      if (portal != null) {
        page._portal = portal;
        page._setLinks();
        page._dialog.dialog("option", "title", portal.name + ": Links");
        return page._dialog.focus(), page._dialog;
      }
    }
    if (show) {
      return new LinkListDialog(operation, portal);
    } else {
      return;
    }
  }
}
