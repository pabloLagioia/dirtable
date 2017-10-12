const chai = require("chai");
const should = chai.should();
const expect = chai.expect;
const makeDirtable = require("../src/makeDirtable");

const getInspectionOrderMock = () => {
  return {
    "owner": "12345", 
    "states": {
      "inspection": "pending"
    },
    "attachments": [],
    "finish": function() {
      this.states.inspection = "done";
    },
    "close": function() {
      this.closed = true;
    },
    "addAttachment": function(src, name) {
      this.attachments.push({
        "src": src,
        "name": name
      });
    }
  }
}

describe("Dirtable", function() {
  
  it("should create a dirtable object", function() {

    const inspectionOrderMock = getInspectionOrderMock();
    
    var dirtable = makeDirtable(inspectionOrderMock);

    expect(dirtable.owner).to.equal(inspectionOrderMock.owner);
    expect(dirtable.states.inspection).to.equal(inspectionOrderMock.states.inspection);
    expect(dirtable.closed).to.equal(undefined);

    dirtable.close();

    expect(dirtable.closed).to.equal(true);
    
    dirtable.finish();
    
    expect(dirtable.states.inspection).to.equal("done");

  });
  
  it("should keep track of primitive variable changes", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    dirtable.close();
    dirtable.finish();

    const assignments = dirtable.getAssignments();

    expect(assignments).to.not.equal(undefined);
    expect(assignments.closed).to.equal(true);
    expect(assignments["states.inspection"]).to.equal("done");

  });
  
  it("should keep track of values pushed to arrays", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    dirtable.addAttachment("/s3.amazon.com/apicture.jpeg", "a-picture.jpeg");
    dirtable.addAttachment("/s3.amazon.com/anotherpicture.jpeg", "another-picture.jpeg");

    const assignments = dirtable.getAssignments();

    expect(assignments.attachments).to.not.equal(undefined);
    expect(assignments.attachments.length).to.equal(2);
    expect(assignments.attachments[0].src).to.equal("/s3.amazon.com/apicture.jpeg");
    expect(assignments.attachments[0].name).to.equal("a-picture.jpeg");
    expect(assignments.attachments[1].src).to.equal("/s3.amazon.com/anotherpicture.jpeg");
    expect(assignments.attachments[1].name).to.equal("another-picture.jpeg");

  });
  
  it("should clear assignments on reset", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    dirtable.close();
    dirtable.finish();
    dirtable.addAttachment("/s3.amazon.com/apicture.jpeg", "a-picture.jpeg");
    dirtable.addAttachment("/s3.amazon.com/anotherpicture.jpeg", "another-picture.jpeg");
 
    dirtable.resetDirtable();

    const assignments = dirtable.getAssignments();

    expect(assignments).to.not.equal(undefined);
    expect(Object.keys(assignments).length).to.equal(0);

  });
  
  it("should return true if is dirty", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    expect(dirtable.isDirty()).to.equal(false);

    dirtable.close();
    dirtable.finish();
    dirtable.addAttachment("/s3.amazon.com/apicture.jpeg", "a-picture.jpeg");
    dirtable.addAttachment("/s3.amazon.com/anotherpicture.jpeg", "another-picture.jpeg");
 
    expect(dirtable.isDirty()).to.equal(true);

  });
  
  it("should make dirtable specific fields only", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock(), ["attachments", "states"]);

    dirtable.finish();
    dirtable.addAttachment("/s3.amazon.com/apicture.jpeg", "a-picture.jpeg");
    dirtable.addAttachment("/s3.amazon.com/anotherpicture.jpeg", "another-picture.jpeg");
 
    expect(dirtable.isDirty()).to.equal(false);

  });

  it("should not make dirtable another dirtable", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock(), ["attachments", "states"]);

    expect(function() {
      makeDirtable(dirtable);
    }).to.not.throw();

  });
  
  it("should return true if an inner object is dirty", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    expect(dirtable.isDirty()).to.equal(false);

    dirtable.states.report = "pending";
 
    expect(dirtable.isDirty()).to.equal(true);

  });

  it("should not have enumerable privates", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());
    
    expect(dirtable._deletions.propertyIsEnumerable()).to.equal(false);
    expect(dirtable._assignments.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.isDirtable.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.resetDirtable.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.isDirty.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.getAssignments.propertyIsEnumerable()).to.equal(false);
    
  });

  it("should keep track of splice array", function() {

    var dirtable = makeDirtable({
      "array": [1, 2, 3, 4]
    });

    dirtable.array.splice(2, 1);

    const assignments = dirtable.getAssignments();
    const deletions = dirtable.getDeletions();

    expect(dirtable.isDirty()).to.equal(true);
    // expect(deletions).to.equal(true);

  });

  it("should keep track of replacing an array", function() {

    var dirtable = makeDirtable({
      "array": [1, 2, 3, 4]
    });

    dirtable.array = dirtable.array.filter(it => it !== 3);

    const assignments = dirtable.getAssignments();

    expect(dirtable.isDirty()).to.equal(true);
    expect(assignments.array[0]).to.equal(1);
    expect(assignments.array[1]).to.equal(2);
    expect(assignments.array[2]).to.equal(4);
    expect(assignments.hasOwnProperty("array")).to.equal(true);
    expect(assignments.array.isDirtable).to.equal(undefined);

  });

  it("should keep track of deleting items", function() {

    var dirtable = makeDirtable({
      "array": [1, 2, 3, 4],
      "object": {
        "field1": "hi"
      },
      "number": 5,
      "string": "some string",
    });

    delete dirtable.number;
    delete dirtable.object.field1;
    dirtable.string = undefined;

    const assignments = dirtable.getAssignments();
    const deletions = dirtable.getDeletions();

    expect(deletions.length).to.equal(2);
    expect(deletions[0]).to.equal("number");
    expect(deletions[1]).to.equal("object.field1");
    expect(assignments.string).to.be.undefined;
    
  });

  it("should keep track of array splice", function() {

    var dirtable = makeDirtable({
      "fruits": ["Banana", "Orange", "Apple", "Mango"],
      "some": {
        "key": {
          "array": ["Coffee", "Tea", "Milk", "Coke"]
        }
      }
    });
    
    dirtable.fruits.splice(1, 1);
    dirtable.fruits.pop();

    dirtable.some.key.array.pop();

    expect(dirtable.fruits.length).to.equal(2);
    expect(dirtable.fruits[0]).to.equal("Banana");
    expect(dirtable.fruits[1]).to.equal("Apple");

    const assignments = dirtable.getAssignments();
    const deletions = dirtable.getDeletions();
    
    expect(assignments.fruits.length).to.equal(0);
    expect(deletions.length).to.equal(3);
    expect(deletions[0]).to.equal("fruits.Orange");
    expect(deletions[1]).to.equal("fruits.Mango");
    expect(deletions[2]).to.equal("some.key.array.Coke");
    
  });

  it("should keep track of array splice of objects", function() {

    var dirtable = makeDirtable({
      "results": [{
        "item": "A", 
        "score": 5 
      }, { 
        "item": "B", 
        "score": 8, 
        "comment": "Strongly agree" 
      }]
    });
    
    dirtable.results.splice(1, 1);

    expect(dirtable.results.length).to.equal(1);
    
    const assignments = dirtable.getAssignments();
    const deletions = dirtable.getDeletions();
    
    expect(deletions.length).to.equal(1);
    expect(deletions[0].results.item).to.equal("B");
    expect(deletions[0].results.score).to.equal(8);
    
  });

});