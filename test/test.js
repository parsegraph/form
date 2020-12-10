var assert = require("assert");
import Form from "../dist/form";

describe("Form", function () {
  it("can be made", ()=>{
    assert.ok(new Form());
  });
  it("can be made with a name", ()=>{
    assert.ok(new Form("MyForm"));
  });
});
