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
 
    dirtable.reset();

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

  it("should not be enumeral", function() {
    
    var dirtable = makeDirtable(getInspectionOrderMock());

    expect(dirtable._deletions.propertyIsEnumerable()).to.equal(false);
    expect(dirtable._assignments.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.isDirtable.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.reset.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.isDirty.propertyIsEnumerable()).to.equal(false);
    expect(dirtable.getAssignments.propertyIsEnumerable()).to.equal(false);


  });

});