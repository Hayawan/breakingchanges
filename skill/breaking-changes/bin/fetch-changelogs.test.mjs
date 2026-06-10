import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRepo,
  detectBreaking,
  findTagIndex,
  sliceBetween,
  aggregateMarkdown,
  releaseContext,
} from "./fetch-changelogs.mjs";

test("parseRepo accepts owner/repo shorthand", () => {
  assert.deepEqual(parseRepo("facebook/react"), { owner: "facebook", repo: "react" });
});

test("parseRepo accepts a github.com URL and strips .git", () => {
  assert.deepEqual(parseRepo("https://github.com/facebook/react.git"), {
    owner: "facebook",
    repo: "react",
  });
});

test("parseRepo rejects non-github hosts and junk", () => {
  assert.equal(parseRepo("https://gitlab.com/a/b"), null);
  assert.equal(parseRepo("not a repo"), null);
});

test("detectBreaking matches known breaking-change phrasings", () => {
  assert.equal(detectBreaking("This is a BREAKING CHANGE"), true);
  assert.equal(detectBreaking("dropped support for Node 16"), true);
  assert.equal(detectBreaking("just a bugfix"), false);
  assert.equal(detectBreaking(""), false);
});

test("findTagIndex tolerates a leading v mismatch", () => {
  const items = [{ tag_name: "v2.0.0" }, { tag_name: "1.5.0" }];
  assert.equal(findTagIndex(items, "2.0.0"), 0); // wanted has no v, tag has v
  assert.equal(findTagIndex(items, "v1.5.0"), 1); // wanted has v, tag has none
  assert.equal(findTagIndex(items, "9.9.9"), -1);
});

test("sliceBetween returns the inclusive range regardless of arg order", () => {
  // newest-first, as the fetch layer produces
  const items = [
    { tag_name: "v3", published_at: "2023-03-01" },
    { tag_name: "v2", published_at: "2023-02-01" },
    { tag_name: "v1", published_at: "2023-01-01" },
  ];
  const got = sliceBetween(items, "v1", "v3").map((r) => r.tag_name);
  assert.deepEqual(got, ["v3", "v2", "v1"]);
});

test("sliceBetween throws RangeError on an unknown tag", () => {
  const items = [{ tag_name: "v1", published_at: "2023-01-01" }];
  assert.throws(() => sliceBetween(items, "v1", "v9"), RangeError);
});

test("aggregateMarkdown emits oldest→newest with separators", () => {
  const items = [
    { tag_name: "v2", published_at: "2023-02-01", body: "second" },
    { tag_name: "v1", published_at: "2023-01-01", body: "first" },
  ];
  const md = aggregateMarkdown(items);
  assert.ok(md.indexOf("first") < md.indexOf("second"), "oldest first");
  assert.ok(md.includes("---"), "has separator");
});

test("releaseContext carries the breaking flag through, oldest→newest", () => {
  const items = [
    { tag_name: "v2", published_at: "2023-02-01", body: "x", breaking_change: true },
    { tag_name: "v1", published_at: "2023-01-01", body: "y", breaking_change: false },
  ];
  const ctx = releaseContext(items);
  assert.equal(ctx[0].version, "v1");
  assert.equal(ctx[1].breaking_change_detected, true);
});
