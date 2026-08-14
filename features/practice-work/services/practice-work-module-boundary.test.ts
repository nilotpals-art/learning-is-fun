import assert from "node:assert/strict";
import test from "node:test";

test("Practice Work service modules load without DOMMatrix or eager PDF evaluation",async()=>{
  assert.equal("DOMMatrix" in globalThis,false);
  const [imports,generation]=await Promise.all([
    import("./question-import-service"),
    import("./gemini-question-generation-provider"),
  ]);
  assert.equal(typeof imports.authorizeQuestionImportUpload,"function");
  assert.equal(typeof generation.GeminiQuestionGenerationProvider,"function");
});
