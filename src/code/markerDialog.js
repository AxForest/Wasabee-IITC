import UiHelper from "./uiHelper";
const Mustache = require("mustache");

var Wasabee = window.plugin.Wasabee;

export const getColorMarker = color => {
  var marker = null;
  Wasabee.layerTypes.forEach(type => {
    if (type.name == color) {
      marker = type.portal.iconUrl;
    }
  });
  return marker;
};

export const getColorHex = color => {
  var hex = null;
  Wasabee.layerTypes.forEach(type => {
    if (type.name == color) {
      hex = type.color;
    }
  });
  return hex;
};

var _dialogs = [];
export class MarkerDialog {
  constructor(operation) {
    _dialogs.push(this);
    var self = this;
    this._target = null;
    this._operation = operation;
    this._container = $(
      Mustache.render(require("./html/markerDialog.mustache"), {
        alertTypes: Wasabee.alertTypes
      })
    );
    this._targetMenu = new Wasabee.OverflowMenu();
    this._targetMenu.button.firstElementChild.textContent = "\u25bc";
    this._container.find("overflow-menu").append(this._targetMenu.button);
    this._type = this._container.find("#markerType");
    this._comment = this._container.find("#comment");
    /*  Uncomment this when adding specific targetting to agents
        this._agent = $('<select class="wasabee-agentselect"></select>').css({
          width : "100%",
          boxSizing : "border-box"
        });
        */

    this._type.change(() => {
      //console.log("Changed to type -> " + self._type.val())
      /*
            self._preferences.save();
            if ("CreateLinkAlert" == self._type.val()) {
              $element.css("display", "");
            } else {
              $element.hide();
            }
            */
    });
    this._dialog = window.dialog({
      title: this._operation.name + " Markers",
      dialogClass: "wasabee-dialog-alerts",
      html: this._container,
      width: "300",
      height: "auto",
      position: {
        my: "center top",
        at: "center center+30"
      },
      closeCallback: () => (_dialogs = [])
    });
    this._dialog.dialog("option", "buttons", {
      "add marker": () =>
        self.sendAlert(self._type.val(), self._operation, self._comment.val()),
      close: () => {
        _dialogs = Array();
        self._dialog.dialog("close");
      }
    });
  }

  focus() {
    this._dialog.dialog("open");
  }

  sendAlert(selectedType, operation, comment) {
    operation.addMarker(selectedType, UiHelper.getSelectedPortal(), comment);
  }

  static update(operation, close = false, show = true) {
    var parameters = _dialogs;
    if (parameters.length != 0) {
      show = false;
      for (var index in parameters) {
        var page = parameters[index];
        if (operation.ID != page._operation.ID || close) {
          return page._dialog.dialog("close");
        } else {
          page._operation = operation;
          return page.focus(), page;
        }
      }
    }
    if (show) {
      return new MarkerDialog(operation);
    } else {
      return;
    }
  }

  static closeDialogs() {
    var parameters = _dialogs;
    for (let p = 0; p < parameters.length; p++) {
      var page = parameters[p];
      page._dialog.dialog("close");
    }
  }
}
