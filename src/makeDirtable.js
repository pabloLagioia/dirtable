function canBeDirtable(obj) {

  if (obj === null || obj === undefined || obj instanceof Date) {
    return false;
  }

  if (obj.isDirtable) {
    return false;
  }

  if (obj instanceof Array || typeof obj === "object") {
    return true;
  }

  return false;

}

function reset() {

  for (var i in this) {

    var currentProp = this[i];
    
    if (currentProp && currentProp.isDirtable) {
      currentProp.reset();
    }

  }

  this._deletions.length = 0;
  this._assignments.length = 0;

}

function isDirty() {

  let isCurrentDirty = this._deletions.length + this._assignments.length > 0;

  if (isCurrentDirty) {
    return true;
  }

  for (var j in this) {
    
    let it = this[j];

    if (it && it.isDirtable && it.isDirty()) {
      return true;
    }

  }

  return false;
  
}

function getObjectDeletions() {

  const objectDeletions = [];
  
  for (var j in this) {

    let it = this[j];

    if (it && it.isDirtable && it.isDirty()) {
      
      let deletions = it.getDeletions();

      if (it instanceof Array) {
        // deletions.forEach(deletion => { objectDeletions.push(j + "." + deletion); });
        deletions.forEach(deletion => { 
          if (typeof deletion === "object") {
            objectDeletions.push({[j]: deletion}); 
          } else {
            objectDeletions.push(j + "." + deletion);
          }
        });
      } else {
        for (var i = 0; i < deletions.length; i++) {
          objectDeletions.push(j + "." + deletions[i]);
        }
      }

    }

  }

  return this._deletions.concat(objectDeletions);
  
}

function getArrayAssignments() {
  return this._assignments.map(function(it) {
    return it.value;
  });
}

function getArrayDeletions() {
  return this._deletions;
}

function getObjectAssignments() {

  const objectAssignments = {};

  this._assignments.forEach(function(it) {

    objectAssignments[it.property] = it.value;

  });
  
  for (var j in this) {

    let it = this[j];

    if (it && it.isDirtable && it.isDirty()) {
      
      const assignments = it.getAssignments();

      if (it instanceof Array) {
        objectAssignments[j] = assignments;
      } else {
        for (var i in assignments) {
          objectAssignments[j + "." + i] = assignments[i];
        }
      }

    }

  }

  return objectAssignments;

}

const proxyOptions = {
  deleteProperty: function(target, property) {

    if (target.__splicing) {
      return true;
    }

    if (target instanceof Array) {
      target._deletions.push(target[property]);
    } else {
      target._deletions.push(property);
    }

    return true;

  },
  set: function(target, property, value, receiver) {

    target[property] = value;

    if (property !== "length" && !target.__splicing && property !== "__splicing") {
      target._assignments.push({
        "property": property, "value": value
      });
    }

    return true;

  }
}

function makeDirtable(obj, except = []) {

  let isArray = false;

  if (obj instanceof Array) {
    isArray = true;
  }

  if (!canBeDirtable(obj)) {
    return obj;
  }

  for (var i in obj) {
    if (!except.includes(i)) {
      obj[i] = makeDirtable(obj[i]);
    }
  }

  var getAssignments = getObjectAssignments;
  var getDeletions = getObjectDeletions;
  
  if (isArray) {
    getAssignments = getArrayAssignments;
    getDeletions = getArrayDeletions;

    obj._splice = obj.splice;
    obj.splice = function() {
      this.__splicing = true;
      const splicedElements = this._splice.apply(this, Array.prototype.slice.call(arguments));
      splicedElements.forEach(function(it) {
        obj._deletions.push(it);
      });
      this.__splicing = false;
    }

  }

  Object.defineProperties(obj, {
    "_deletions": {
      "value": [],
      "enumerable": false,
      "configurable": false,
      "writable": false
    },
    "_assignments": {
      "value": [],
      "enumerable": false,
      "configurable": false,
      "writable": false
    },
    "isDirtable": {
      "value": true,
      "enumerable": false,
      "configurable": false,
      "writable": false
    },
    "reset": {
      "value": reset,
      "enumerable": false
    },
    "isDirty": {
      "value": isDirty,
      "enumerable": false
    },
    "getAssignments": {
      "value": getAssignments,
      "enumerable": false
    },
    "getDeletions": {
      "value": getDeletions,
      "enumerable": false
    }
  });

  return new Proxy(obj, proxyOptions);

}

module.exports = makeDirtable;