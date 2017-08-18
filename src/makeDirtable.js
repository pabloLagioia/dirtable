function canBeDirtable(obj) {

  if (obj === null || obj === undefined || obj instanceof Date) {
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
  return this._deletions.length + this._assignments.length > 0;
}

function getDeletions() {
  
  const objectDeletions = {};
  
  this._deletions.forEach(function(it) {

    if (it.value instanceof Dirtable) {

      const deletions = it.value.getDeletions();

      for (var i in deletions) {
        objectDeletions[it.property + "." + i] = deletions[i];
      }

    } else {
      objectDeletions[it.property] = it.value;
    }

  });

  return objectDeletions;
  
}

function getArrayAssignments() {
  return this._assignments.map(function(it) {
    return it.value;
  });
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
  apply: function(target, thisArg, argumentsList) {
    return thisArg[target].apply(this, argumentList);
  },
  deleteProperty: function(target, property) {
    target._deletions.push(property);
    return true;
  },
  set: function(target, property, value, receiver) {      
    target[property] = value;
    if (property !== "length") {
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
    }
  });
  
  obj.reset = reset;
  obj.isDirty = isDirty;
  obj.getAssignments = getObjectAssignments;

  if (isArray) {
    obj.getAssignments = getArrayAssignments;
  }

  return new Proxy(obj, proxyOptions);

}

module.exports = makeDirtable;