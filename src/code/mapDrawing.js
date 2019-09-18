var markdown = require("markdown").markdown;
import UiCommands from "./uiCommands.js";
import { checkAllLinks } from "./crosslinks";
import WasabeeMe from "./me";
// import UiHelper from "./uiHelper";

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

const getColorHex = color => {
  var hex = null;
  Wasabee.layerTypes.forEach(type => {
    if (type.name == color) {
      hex = type.color;
    }
  });
  return hex;
};

//** This function draws things on the layers */
export const drawThings = op => {
  window.plugin.wasabee.resetAllPortals(op);
  resetAllMarkers(op);
  resetAllLinks(op);
  checkAllLinks(op);
};

//** This function adds all the markers to the layer */
const addAllMarkers = op => {
  var markerList = op.markers;
  if (markerList != null) {
    markerList.forEach(marker => addMarker(marker, op));
  }
};

//** This function resets all the markers  and calls addAllMarkers to add them */
const resetAllMarkers = op => {
  for (var guid in window.plugin.wasabee.markerLayers) {
    var m = window.plugin.wasabee.markerLayers[guid];
    window.plugin.wasabee.markerLayerGroup.removeLayer(m);
    delete window.plugin.wasabee.markerLayers[guid];
  }
  addAllMarkers(op);
};

/** This function adds a Markers to the target layer group */
const addMarker = (target, operation) => {
  var targetPortal = operation.getPortal(target.portalId);
  var latLng = new L.LatLng(targetPortal.lat, targetPortal.lng);
  var wMarker = L.marker(latLng, {
    title: targetPortal.name,
    icon: L.icon({
      iconUrl: getImageFromMarker(target),
      shadowUrl: null,
      iconSize: L.point(24, 40),
      iconAnchor: L.point(12, 40),
      popupAnchor: L.point(-1, -48)
    })
  });

  window.registerMarkerForOMS(wMarker);
  console.log("TonyRoomZ -- building marker for: " + targetPortal.name);
  wMarker.bindPopup("loading...");
  wMarker.off("click", wMarker.togglePopup, wMarker);
  wMarker.on(
    "click",
    () => {
      console.log("click for marker popup");
      // this version of leaflet does not have ... wMarker.isPopupOpen()
      wMarker.setPopupContent(getMarkerPopup(wMarker, target, operation));
      wMarker.update();
      wMarker.togglePopup();
    },
    wMarker
  );
  wMarker.on(
    "spiderfiedclick",
    () => {
      console.log("spiderfiedclick for marker popup");
      wMarker.setPopupContent(getMarkerPopup(wMarker, target, operation));
      wMarker.update();
      wMarker.togglePopup();
    },
    wMarker
  );
  window.plugin.wasabee.markerLayers[target["ID"]] = wMarker;
  wMarker.addTo(window.plugin.wasabee.markerLayerGroup);
};

const getMarkerPopup = (marker, target, operation) => {
  console.log("getMarkerPopup");
  const portal = operation.getPortal(target.portalId);
  marker.className = "wasabee-dialog wasabee-dialog-ops";
  const content = document.createElement("div");
  const title = content.appendChild(document.createElement("div"));
  title.className = "desc";
  title.innerHTML = markdown.toHTML(getPopupBodyWithType(portal, target));
  const buttonSet = content.appendChild(document.createElement("div"));
  buttonSet.className = "temp-op-dialog";
  const deleteButton = buttonSet.appendChild(document.createElement("a"));
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener(
    "click",
    () => {
      UiCommands.deleteMarker(operation, target, portal);
      marker.closePopup();
    },
    false
  );

  const subhead = content.appendChild(document.createElement("div"));
  subhead.className = "desc";
  subhead.innerHTML = "Marker Assignment";
  const assignmentMenu = subhead.appendChild(agentSelectMenu());
  const id = "wasabee-marker-assignment-" + target.ID;
  assignmentMenu.id = id;
  assignmentMenu.addEventListener(
    "change",
    () => {
      window.plugin.wasabee
        .assignMarkerPromise(operation.ID, target.ID, assignmentMenu.value)
        .then(
          function() {
            console.log("assign marker succeeded");
            // XXX some DOM magic to update the marker icon
            // are marker IDs known?
          },
          function(err) {
            console.log("assign marker failed: " + err);
          }
        );
    },
    false
  );
  return content;
};

export const getPopupBodyWithType = (portal, target) => {
  if (!Wasabee.markerTypes.has(target.type)) {
    target.type = Wasabee.Constants.DEFAULT_MARKER_TYPE;
  }
  let marker = Wasabee.markerTypes.get(target.type);
  let title = marker.label + ": " + portal.name;
  if (target.comment) title = title + "\n\n" + target.comment;
  if (target.state != "completed" && target.assignedNickname)
    title = title + "\n\nAssigned To: " + target.assignedNickname;
  if (target.state == "completed" && target.completedBy)
    title = title + "\n\nCompleted By: " + target.completedBy;
  return title;
};

//** This function returns the appropriate image for a marker type / state */
const getImageFromMarker = target => {
  if (!Wasabee.markerTypes.has(target.type)) {
    target.type = Wasabee.Constants.DEFAULT_MARKER_TYPE;
  }
  let marker = Wasabee.markerTypes.get(target.type);
  let img = null;
  switch (target.state) {
    case "pending":
      img = marker.markerIcon;
      break;
    case "assigned":
      img = marker.markerIconAssigned;
      break;
    case "completed":
      img = marker.markerIconDone;
      break;
    case "acknowledged":
      img = marker.markerIconAcknowledged;
      break;
  }
  if (img == null) {
    console.log("getImageFromMarker: ");
    console.log(target);
  }
  return img;
};

//** This function adds all the Links to the layer */
const addAllLinks = operation => {
  operation.links.forEach(link => addLink(link, operation.color, operation));
};

//** This function resets all the Links and calls addAllLinks to add them */
const resetAllLinks = operation => {
  for (var guid in window.plugin.wasabee.linkLayers) {
    var linkInLayer = window.plugin.wasabee.linkLayers[guid];
    window.plugin.wasabee.linkLayerGroup.removeLayer(linkInLayer);
    delete window.plugin.wasabee.linkLayers[guid];
  }
  addAllLinks(operation);
};

/** This function adds a portal to the portal layer group */
const addLink = (link, color, operation) => {
  const colorHex = getColorHex(color);
  var options = {
    dashArray: [5, 5, 1, 5],
    color: colorHex ? colorHex : "#ff6600",
    opacity: 1,
    weight: 2
  };
  var latLngs = link.getLatLngs(operation);
  if (latLngs != null) {
    var link_ = new L.GeodesicPolyline(latLngs, options);

    window.plugin.wasabee.linkLayers[link["ID"]] = link_;
    link_.addTo(window.plugin.wasabee.linkLayerGroup);
  } else {
    console.log("LATLNGS WAS NULL?!");
  }
};

/** this function fetches and displays agent location */
export const drawAgents = op => {
  if (!WasabeeMe.isLoggedIn()) {
    return;
  }

  /* each pull resets these teams  -- put rate limiting here, don't fetch if less than 60 seconds old */
  op.teamlist.forEach(function(t) {
    if (Wasabee.teams.size != 0 && Wasabee.teams.has(t.teamid)) {
      Wasabee.teams.delete(t.teamid);
    }

    /* this fetches the team into Wasabee.teams */
    window.plugin.wasabee.teamPromise(t.teamid).then(
      function(team) {
        team.agents.forEach(function(agent) {
          var agentInLayer = window.plugin.wasabee.agentLayers[agent.id];
          if (agentInLayer != null) {
            window.plugin.wasabee.agentLayerGroup.removeLayer(agentInLayer);
            delete window.plugin.wasabee.agentLayers[agent.id];
          }
          if (agent.lat != 0) {
            var latLng = new L.LatLng(agent.lat, agent.lng);
            var a_ = L.marker(latLng, {
              title: agent.name,
              icon: L.icon({
                iconUrl: agent.pic,
                shadowUrl: null,
                iconSize: L.point(41, 41),
                iconAnchor: L.point(25, 41),
                popupAnchor: L.point(-1, -48)
              })
            });
            window.registerMarkerForOMS(a_);
            a_.bindPopup(getAgentPopup(agent));
            a_.off("click", agent.togglePopup, agent);
            a_.on("spiderfiedclick", a_.togglePopup, a_);
            window.plugin.wasabee.agentLayers[agent.id] = a_;
            a_.addTo(window.plugin.wasabee.agentLayerGroup);
          }
        });
      },
      function(err) {
        console.log(err); // promise rejected
        // you may not have access to every team on the op -- ignore the problems
      }
    );
  }); // forEach team
  // redraw target popup menus
  // window.plugin.wasabee.resetAllMarkers();
  // create new window.plugin.wasabee.updateAllMarkers
};

const getAgentPopup = agent => {
  agent.className = "wasabee-dialog wasabee-dialog-ops";
  const content = document.createElement("div");
  const title = content.appendChild(document.createElement("div"));
  title.className = "desc";
  title.id = agent.id;
  title.innerHTML = markdown.toHTML(agent.name);
  const date = content.appendChild(document.createElement("span"));
  date.innerHTML = markdown.toHTML("Last update: " + agent.date);
  return content;
};

const getAllKnownAgents = () => {
  const agents = new Map();
  Wasabee.teams.forEach(function(team) {
    // XXX this will get messy if display name is used -- last-in wins
    team.agents.forEach(function(agent) {
      agents.set(agent.id, agent.name);
    });
  });
  return agents;
};

const agentSelectMenu = () => {
  const menu = document.createElement("select");
  const agents = getAllKnownAgents();
  const unset = menu.appendChild(document.createElement("option"));
  unset.value = "";
  unset.text = "Not Assigned";

  agents.forEach(function(v, k) {
    const option = menu.appendChild(document.createElement("option"));
    option.value = k;
    option.text = v;
  });
  return menu;
};
