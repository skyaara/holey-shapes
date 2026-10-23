import { createHoleySvg, mountHoleyShape } from "../../packages/js/index.js";
const results = [];
const fixtures = document.querySelector("#fixtures");
function assert(condition, message) {
  if (!condition) throw new Error(message);
  results.push(`PASS ${message}`);
}
try {
  const a = document.createElement("div"),
    b = document.createElement("div");
  const sibling = document.createElement("span");
  sibling.textContent = "Keep me";
  a.append(sibling);
  fixtures.append(a, b);
  const first = mountHoleyShape(a, { shape: "disc", seed: 1000000 });
  const second = mountHoleyShape(b, { shape: "cross", holes: 2 });
  assert(a.contains(sibling), "Mount preserves existing container content");
  const ids = [...fixtures.querySelectorAll("[id]")].map((node) => node.id);
  assert(
    new Set(ids).size === ids.length,
    "Mounted SVG definitions have unique IDs",
  );
  const originalMask = a.querySelector("mask").innerHTML;
  first.shuffle();
  assert(
    a.querySelector("mask").innerHTML !== originalMask,
    "Shuffle wraps at the maximum seed",
  );
  first.update({ doodle: true, color: "#FF0000" });
  assert(
    a.querySelector(".doodle-face path").getAttribute("fill") === "#FF0000",
    "Doodle update uses requested color",
  );
  assert(
    a.contains(sibling) && a.querySelectorAll("svg").length === 1,
    "Update replaces only its own SVG",
  );
  assert(
    b.querySelector("svg").getAttribute("aria-label").includes("2 holes"),
    "Updating one mount leaves the other unchanged",
  );
  first.destroy();
  first.update({ holes: 8 });
  first.shuffle();
  first.destroy();
  assert(
    a.children.length === 1 && a.firstChild === sibling,
    "Destroy preserves siblings and prevents resurrection",
  );
  second.destroy();
  const otherDocument =
    document.implementation.createHTMLDocument("Other document");
  const otherHost = otherDocument.createElement("div");
  const other = mountHoleyShape(otherHost, { doodle: true });
  assert(
    otherHost.firstElementChild.ownerDocument === otherDocument,
    "Mount uses its target document",
  );
  other.destroy();
  const third = document.createElement("div");
  fixtures.append(third);
  third.innerHTML =
    createHoleySvg({ shape: "disc", idPrefix: "one" }) +
    createHoleySvg({ shape: "hex", idPrefix: "two", doodle: true });
  for (const svg of third.querySelectorAll("svg")) {
    for (const masked of svg.querySelectorAll("[mask]")) {
      const id = masked.getAttribute("mask").slice(5, -1);
      assert(
        svg.contains(document.getElementById(id)),
        "Every mask resolves inside its own SVG",
      );
    }
  }
  document.querySelector("#results").textContent =
    `${results.join("\n")}\n\n${results.length} checks passed`;
} catch (error) {
  document.querySelector("#results").textContent =
    `${results.join("\n")}\nFAIL ${error.message}`;
  throw error;
}
