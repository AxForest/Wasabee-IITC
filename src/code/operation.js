import WasabeeLink from "./link";
import WasabeeMarker from "./marker";
import { generateId } from "./auxiliar";
import store from "../lib/store";

const DEFAULT_OPERATION_COLOR = "groupa";

export default class WasabeeOp {
  //ID <- randomly generated alpha-numeric ID for the operation
  //name <- name of operation
  //creator <- agent who created it
  //portals <- List of Portals
  //links <- List of Links
  constructor(creator, name) {
    this.ID = generateId();
    this.name = name;
    this.creator = creator;
    this.opportals = Array();
    this.anchors = Array();
    this.links = Array();
    this.markers = Array();
    this.pasteKey = null;
    this.pasteExpireDate = 0;
    this.color = DEFAULT_OPERATION_COLOR;
    this.comment = null;
    this.teamlist = Array();
    this.fetched = null;
    this.stored = null;
    this.localchanged = true;
  }

  store() {
    // console.log("pushing to local store: " + this.ID);
    this._ensureCollections();
    this.stored = Date.now();
    store.set(this.ID, JSON.stringify(this));
    this.localchanged = true;
  }

  getColor() {
    if (this.color == null) {
      return DEFAULT_OPERATION_COLOR;
    } else {
      return this.color;
    }
  }

  containsPortal(portal) {
    if (portal) {
      if (this.opportals.length == 0) {
        return false;
      } else {
        for (let portal_ in this.opportals) {
          if (portal_ && portal.id == portal_.id) {
            return true;
          }
        }
      }
    }
    return false;
  }

  containsLinkFromTo(fromPortalId, toPortalId) {
    if (this.links.length == 0) {
      return false;
    } else {
      for (let link_ in this.links) {
        //THIS TESTS IF ITS THE SAME LINK
        if (
          (this.links[link_].fromPortalId == fromPortalId &&
            this.links[link_].toPortalId == toPortalId) ||
          (this.links[link_].toPortalId == fromPortalId &&
            this.links[link_].fromPortalId == toPortalId)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  containsLink(link) {
    var fromPortalId = link.fromPortalId;
    var toPortalId = link.toPortalId;
    return this.containsLinkFromTo(fromPortalId, toPortalId);
  }

  containsMarker(portal, markerType) {
    if (this.markers.length == 0) {
      return false;
    } else {
      for (let marker in this.markers) {
        if (
          this.markers[marker].portalId == portal.id &&
          this.markers[marker].type == markerType
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getLinkListFromPortal(portal) {
    var links = this.links.filter(function(listLink) {
      return (
        listLink.fromPortalId == portal.id || listLink.toPortalId == portal.id
      );
    });
    return links;
  }

  getPortal(portalID) {
    for (let portal_ in this.opportals) {
      if (portalID == this.opportals[portal_].id) {
        return this.opportals[portal_];
      }
    }
    return null;
  }

  removeAnchor(portalId) {
    this.anchors = this.anchors.filter(function(anchor) {
      return anchor !== portalId;
    });
    this.links = this.links.filter(function(listLink) {
      return (
        listLink.fromPortalId !== portalId && listLink.toPortalId !== portalId
      );
    });
    this.update();
  }

  removeMarker(marker) {
    this.markers = this.markers.filter(function(listMarker) {
      return listMarker.ID !== marker.ID;
    });
    this.update();
  }

  setMarkerComment(marker, comment) {
    this.markers.forEach(function(v) {
      if (v.ID == marker.ID) {
        v.comment = comment;
      }
    });
    this.update();
  }

  //Passed in are the start, end, and portal the link is being removed from(so the other portal can be removed if no more links exist to it)
  removeLink(startPortal, endPortal) {
    var newLinks = [];
    for (let link_ in this.links) {
      if (
        !(
          this.links[link_].fromPortalId == startPortal &&
          this.links[link_].toPortalId == endPortal
        )
      ) {
        newLinks.push(this.links[link_]);
      }
    }
    this.links = newLinks;
    this.cleanAnchorList();
    this.update();
  }

  reverseLink(startPortalID, endPortalID) {
    var newLinks = [];
    for (let link_ in this.links) {
      if (
        this.links[link_].fromPortalId == startPortalID &&
        this.links[link_].toPortalId == endPortalID
      ) {
        this.links[link_].fromPortalId = endPortalID;
        this.links[link_].toPortalId = startPortalID;
      }
      newLinks.push(this.links[link_]);
    }
    this.links = newLinks;
    this.update();
  }

  cleanAnchorList() {
    var newAnchorList = [];
    for (let anchor_ in this.anchors) {
      var foundAnchor = false;
      for (let link_ in this.links) {
        if (
          this.links[link_].fromPortalId == this.anchors[anchor_] ||
          this.links[link_].toPortalId == this.anchors[anchor_]
        ) {
          foundAnchor = true;
        }
      }

      if (foundAnchor) {
        newAnchorList.push(this.anchors[anchor_]);
      }
    }
    this.anchors = newAnchorList;
  }

  //This removes opportals with no links and removes duplicates
  cleanPortalList() {
    var newPortals = [];
    for (let portal_ in this.opportals) {
      var foundPortal = false;
      for (let link_ in this.links) {
        if (
          this.opportals[portal_]["id"] == this.links[link_].fromPortalId ||
          this.opportals[portal_]["id"] == this.links[link_].toPortalId
        ) {
          foundPortal = true;
        }
      }
      for (let marker_ in this.markers) {
        if (this.opportals[portal_]["id"] == this.markers[marker_].portalId) {
          foundPortal = true;
        }
      }
      for (let anchor_ in this.anchors) {
        if (this.opportals[portal_]["id"] == this.anchors[anchor_]) {
          foundPortal = true;
        }
      }
      if (foundPortal) {
        newPortals.push(this.opportals[portal_]);
      }
    }

    var finalPortals = [];
    for (let portal_ in newPortals) {
      if (finalPortals.length == 0) {
        finalPortals.push(newPortals[portal_]);
      } else {
        var foundFinalPortal = false;
        for (let finalPortal_ in finalPortals) {
          if (newPortals[portal_]["id"] == finalPortals[finalPortal_]["id"]) {
            foundFinalPortal = true;
          }
        }
        if (foundFinalPortal == false) {
          finalPortals.push(newPortals[portal_]);
        }
      }
    }
    this.opportals = finalPortals;
  }

  addPortal(portal) {
    if (!this.containsPortal(portal)) {
      this.opportals.push(portal);
    } else {
      console.log(
        "Portal Already Exists In Operation -> " + JSON.stringify(portal)
      );
    }
  }

  addLink(fromPortal, toPortal, description) {
    // console.log("addLink " + fromPortal + " " + toPortal);
    if (fromPortal.id === toPortal.id) {
      console.log(
        "Operation: Ignoring link where source and target are the same portal."
      );
      return;
    }

    this.addAnchor(fromPortal);
    this.addAnchor(toPortal);

    var link = new WasabeeLink(this, fromPortal.id, toPortal.id, description);
    if (!this.containsLink(link)) {
      this.links.push(link);
    } else {
      console.log(
        "Link Already Exists In Operation -> " + JSON.stringify(link)
      );
    }
  }

  containsAnchor(portalId) {
    if (this.anchors.length == 0) {
      return false;
    } else {
      for (let anchor_ in this.anchors) {
        if (this.anchors[anchor_] == portalId) {
          return true;
        }
      }
    }
    return false;
  }

  addAnchor(portal) {
    if (!this.containsAnchor(portal.id)) {
      this.anchors.push(portal.id);
    }

    this.addPortal(portal);
  }

  swapPortal(originalPortal, newPortal) {
    this.anchors = this.anchors.filter(function(listAnchor) {
      return listAnchor !== originalPortal.id;
    });
    this.addAnchor(newPortal);
    let linksToRemove = [];
    for (let link_ = 0; link_ < this.links.length; link_++) {
      if (this.links[link_].fromPortalId == originalPortal["id"]) {
        if (this.links[link_].toPortalId === newPortal["id"]) {
          console.log(
            `Operation: Removing link '${this.links[link_].ID}' while swapping because it would create a link with the same source and target.`
          );
          linksToRemove.push(this.links[link_]);
        } else if (
          !this.containsLinkFromTo(
            newPortal["id"],
            this.links[link_].toPortalId
          )
        ) {
          this.links[link_].fromPortalId = newPortal["id"];
        } else {
          console.log(
            `Operation: Removing link '${this.links[link_].ID}' while swapping because it would duplicate an existing link in the operation.`
          );
          linksToRemove.push(this.links[link_]);
        }
      } else if (this.links[link_].toPortalId == originalPortal["id"]) {
        if (this.links[link_].fromPortalId === newPortal["id"]) {
          console.log(
            `Operation: Removing link '${this.links[link_].ID}' while swapping because it would create a link with the same source and target.`
          );
          linksToRemove.push(this.links[link_]);
        } else if (
          !this.containsLinkFromTo(
            this.links[link_].fromPortalId,
            newPortal["id"]
          )
        ) {
          this.links[link_].toPortalId = newPortal["id"];
        } else {
          console.log(
            `Operation: Removing link '${this.links[link_].ID}' while swapping because it would duplicate an existing link in the operation.`
          );
          linksToRemove.push(this.links[link_]);
        }
      }
    }
    // Remove the invalid links from the array (after we are done iterating through it)
    this.links = this.links.filter(element => !linksToRemove.includes(element));

    this.cleanAnchorList();
    this.update();
  }

  addMarker(markerType, portal, comment) {
    if (portal) {
      if (!this.containsMarker(portal, markerType)) {
        if (!this.containsPortal(portal)) {
          this.addPortal(portal);
        }
        var marker = new WasabeeMarker(markerType, portal.id, comment);
        this.markers.push(marker);
        this.update();
      } else {
        alert("This portal already has a marker. Chose a different portal.");
      }
    }
  }

  // strictly speaking, this doesn't do anything since the server does it all, but this is for UI changes real-time
  assignMarker(id, gid) {
    this.markers.forEach(function(v) {
      if (v.ID == id) {
        v.assignedTo = gid;
      }
    });
    this.update();
  }

  assignLink(id, gid) {
    this.links.forEach(function(v) {
      if (v.ID == id) {
        v.assignedTo = gid;
      }
    });
    this.update();
  }

  clearAllItems() {
    this.opportals = Array();
    this.anchors = Array();
    this.links = Array();
    this.markers = Array();
    this.update();
  }

  // call update to save the op and redraw everything on the map
  update() {
    // console.log("operation.update (saving/redrawing)");
    this.cleanPortalList();
    this.cleanAnchorList();
    this.store();
    window.runHooks("wasabeeUIUpdate", this);
  }

  convertLinksToObjs(links) {
    const tempLinks = Array();
    for (let link_ in links) {
      if (links[link_] instanceof WasabeeLink) {
        tempLinks.push(links[link_]);
      } else {
        tempLinks.push(WasabeeLink.create(links[link_], this));
      }
    }
    return tempLinks;
  }

  convertMarkersToObjs(markers) {
    const tmpMarkers = Array();
    for (let marker_ in markers) {
      if (markers[marker_] instanceof WasabeeMarker) {
        tmpMarkers.push(markers[marker_]);
      } else {
        tmpMarkers.push(WasabeeMarker.create(markers[marker_]));
      }
    }
    return tmpMarkers;
  }

  _ensureCollections() {
    if (!this.markers) {
      this.markers = Array();
    }
    if (!this.opportals) {
      this.opportals = Array();
    }
    if (!this.links) {
      this.links = Array();
    }
    if (!this.anchors) {
      this.anchors = Array();
    }
    if (!this.teamlist) {
      this.teamlist = Array();
    }
  }

  // minimum bounds rectangle
  mbr() {
    const lats = [];
    const lngs = [];
    this.opportals.forEach(function(a) {
      lats.push(a.lat);
      lngs.push(a.lng);
    });
    const minlat = Math.min.apply(null, lats);
    const maxlat = Math.max.apply(null, lats);
    const minlng = Math.min.apply(null, lngs);
    const maxlng = Math.max.apply(null, lngs);
    const min = L.latLng(minlat, minlng);
    const max = L.latLng(maxlat, maxlng);
    const bounds = L.latLngBounds(min, max);
    return bounds;
  }

  IsWritableOp(me) {
    if (me == null) {
      return false;
    }

    if (me.GoogleID == this.creator) {
      return true;
    }

    if (me.Teams == undefined) {
      return false;
    }

    this.teamlist.forEach(function(t) {
      if (t.role == "write" && me.Teams.includes(t.ID)) {
        return true;
      }
    });
    return false;
  }

  IsServerOp() {
    if (this.teamlist.length != 0) {
      return true;
    }
    return false;
  }

  IsOwnedOp(me) {
    if (me == null) {
      return false;
    }
    if (me.GoogleID == this.creator) {
      return true;
    }
    return false;
  }

  static create(obj) {
    if (obj instanceof WasabeeOp) {
      console.log("do not call Operation.create() on an Operation");
      console.log(new Error().stack);
      return obj;
    }
    if (typeof obj == "string") {
      obj = JSON.parse(obj);
    }
    const operation = new WasabeeOp();
    for (var prop in obj) {
      if (operation.hasOwnProperty(prop)) {
        if (prop == "links") {
          operation[prop] = operation.convertLinksToObjs(obj[prop]);
        } else if (prop == "markers") {
          operation[prop] = operation.convertMarkersToObjs(obj[prop]);
        } else {
          operation[prop] = obj[prop];
        }
      }
    }
    operation._ensureCollections();
    return operation;
  }
}
