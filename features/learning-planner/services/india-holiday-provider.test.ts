import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-stripping test runner requires the explicit TypeScript extension.
import { normalizeIndiaPostHolidays, requestIndiaHolidays } from "./india-holiday-provider-core.ts";

const fixture='<script>{"All India":[{"name":" Republic Day ","date":"26-January-2026","day":"Monday"},{"name":"Republic Day","date":"26-January-2026","day":"Monday"}],"Karnataka Circle":[{"name":"Makara Sankranthi","date":"14-January-2026","day":"Wednesday"},{"name":"Republic Day","date":"26-January-2026","day":"Monday"}]}</script>';
test("normalizes national and selected State/UT holidays and removes duplicate date/name rows",()=>{const rows=normalizeIndiaPostHolidays(fixture,"IN-KA");assert.equal(rows.length,2);assert.equal(rows[0].scope,"state");assert.equal(rows[1].name,"REPUBLIC DAY");assert.equal(rows[1].scope,"national");});
test("rejects malformed provider payloads safely",()=>{assert.deepEqual(normalizeIndiaPostHolidays("provider unavailable","IN-KA"),[]);});
test("throws a controlled provider error for failed fetches",async()=>{const failedFetch=async()=>new Response(null,{status:503});await assert.rejects(()=>requestIndiaHolidays(2026,null,failedFetch as typeof fetch),/HOLIDAY_PROVIDER_503/);});
test("loads the official page bundle before normalizing holidays",async()=>{let calls=0;const fetcher=async()=>{calls++;return calls===1?new Response('<script src="/_next/static/chunks/app/holidays-list/page-test.js"></script>'):new Response(fixture);};const rows=await requestIndiaHolidays(2026,"IN-KA",fetcher as typeof fetch);assert.equal(calls,2);assert.equal(rows.length,2);});
