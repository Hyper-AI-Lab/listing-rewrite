// Listing grader: plain rules of thumb, runs entirely in the browser.
(function () {
  var STOP = ("a an and the of for with in on to by or from your our my this that is it at as be are new " +
    "handmade gift").split(" ");
  var MATERIAL = /\b(cotton|wool|linen|silk|leather|wood|wooden|oak|walnut|bamboo|ceramic|stoneware|porcelain|clay|glass|resin|metal|steel|stainless|brass|copper|silver|sterling|gold|paper|cardstock|canvas|soy|beeswax|wax|polyester|acrylic|yarn|vinyl|felt|denim|velvet|made (?:from|of|with)|materials?)\b/i;
  var SIZE = /(\d+(\.\d+)?\s*(in\b|inch|inches|cm|mm|m\b|ft|oz|ml|l\b|g\b|kg|lb|"|'')|\d+\s*x\s*\d+|\bsizes?\b|\bdimensions?\b|\bmeasures?\b)/i;
  var CARE = /\b(wash|washable|care|clean|wipe|dishwasher|microwave|dry clean|hand wash|machine wash|store)\b/i;

  function words(s) {
    return (s.toLowerCase().match(/[a-z]+/g) || []).filter(function (w) {
      return w.length >= 3 && STOP.indexOf(w) < 0;
    });
  }
  function stem(w) { return w.replace(/(es|s)$/, ""); }
  function norm(tag) { return (tag.toLowerCase().match(/[a-z0-9]+/g) || []).map(stem).sort().join(" "); }
  function firstSentence(s) { var m = s.trim().match(/^[\s\S]*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); }

  function grade(input) {
    var title = (input.title || "").trim();
    var desc = (input.description || "").trim();
    var tags = (input.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var checks = [];
    function add(name, max, got, msg, fix) {
      checks.push({ name: name, max: max, points: Math.max(0, Math.round(got)), msg: msg, fix: got < max ? fix : null });
    }

    // 1. Title length (Etsy allows up to 140 characters)
    var tl = title.length;
    if (tl === 0) add("Title length", 15, 0, "No title entered.", "Add a title that says what the item is.");
    else if (tl > 140) add("Title length", 15, 5, tl + " characters, over Etsy's 140 limit.", "Cut the title to 140 characters or fewer.");
    else if (tl < 40) add("Title length", 15, 5, tl + " characters. Short titles leave out words buyers search for.", "Lengthen the title (" + tl + " chars) with what it is, material, size or use, aiming for 40+ characters.");
    else add("Title length", 15, 15, tl + " characters (Etsy max 140).");

    // 2. Stock codes / too few real words
    var codes = title.match(/\b(?=[A-Za-z-]*\d)(?=[\d-]*[A-Za-z])[A-Za-z0-9-]{3,}\b/g) || [];
    codes = codes.filter(function (c) { return !/^\d+(in|cm|mm|oz|ml|g|kg|lb|ft|pc|pcs|x\d+|st|nd|rd|th)$/i.test(c); });
    var tw = words(title);
    if (codes.length) add("No stock codes", 10, 0, "Title contains a code buyers won't search for: " + codes.join(", ") + ".", "Replace the code \"" + codes[0] + "\" in the title with words a buyer would type.");
    else if (tw.length < 3) add("No stock codes", 10, tl ? 4 : 0, "Title has only " + tw.length + " descriptive word(s).", "Use more descriptive words in the title, not just a name.");
    else add("No stock codes", 10, 10, "Title uses plain descriptive words.");

    // 3. First ~40 characters name the product
    var lead = words(title.slice(0, 40));
    var ctx = words(tags.join(" ") + " " + desc).map(stem);
    var shared = lead.filter(function (w) { return ctx.indexOf(stem(w)) >= 0; });
    if (lead.length >= 2 && shared.length >= 1) add("Title starts with the product", 10, 10, "The opening words (\"" + title.slice(0, 40) + "\") also appear in your tags or description.");
    else add("Title starts with the product", 10, lead.length >= 2 ? 4 : 0, "The first 40 characters don't clearly name the item, or don't match your tags and description.", "Start the title with what the item is (e.g. \"Stoneware bud vase\") and use those words in tags and description too.");

    // 4. Tag count (Etsy allows 13)
    var tc = Math.min(tags.length, 13);
    add("Tag count", 20, tc / 13 * 20, tags.length + " of 13 tags used.", tags.length === 0 ? "Add tags. Etsy allows 13, and you have none." : "Use all 13 tags (you have " + tags.length + "). Each one is another search phrase.");

    // 5. Tag length (Etsy max 20 characters per tag)
    var long = tags.filter(function (t) { return t.length > 20; });
    if (!tags.length) add("Tags within 20 characters", 5, 0, "No tags to check.", null);
    else if (long.length) add("Tags within 20 characters", 5, 0, long.length + " tag(s) over Etsy's 20-character limit: " + long.join(", ") + ".", "Shorten tags over 20 characters: " + long.join(", ") + ".");
    else add("Tags within 20 characters", 5, 5, "All tags are 20 characters or fewer.");

    // 6. Duplicate / near-duplicate tags
    var seen = {}, dups = [];
    tags.forEach(function (t) { var k = norm(t) || t.toLowerCase(); if (seen[k]) dups.push(t); else seen[k] = 1; });
    if (!tags.length) add("No duplicate tags", 5, 0, "No tags to check.", null);
    else if (dups.length) add("No duplicate tags", 5, 0, "Near-duplicate tag(s): " + dups.join(", ") + ".", "Swap repeated tags (" + dups.join(", ") + ") for different search phrases.");
    else add("No duplicate tags", 5, 5, "No repeated tags.");

    // 7. Description length
    var dw = (desc.match(/\S+/g) || []).length;
    if (dw >= 60) add("Description length", 15, 15, dw + " words.");
    else if (dw >= 25) add("Description length", 15, 8, dw + " words. A bit thin.", "Expand the description (" + dw + " words) with what it is, size, materials, and who it's for.");
    else add("Description length", 15, 0, dw + " words. Too short to answer buyer questions.", "Write a real description: at " + dw + " words it can't answer what it is, size, materials and care.");

    // 8. First sentence describes the item
    var fs = firstSentence(desc);
    var boiler = /^(welcome|thank|thanks|hi\b|hello|please|this is (a|my)|i made|we made)/i.test(fs);
    var fsShared = words(fs).map(stem).filter(function (w) { return tw.map(stem).indexOf(w) >= 0; });
    if (!desc) add("Opening sentence describes the item", 10, 0, "No description entered.", null);
    else if (!boiler && fsShared.length >= 1) add("Opening sentence describes the item", 10, 10, "First sentence talks about the item.");
    else add("Opening sentence describes the item", 10, 3, "First sentence (\"" + fs.slice(0, 80) + "\") doesn't describe the item in the title's words.", "Open the description with a sentence that says what the item is, using the same words as the title.");

    // 9. Size, material, care details
    var has = { size: SIZE.test(desc), material: MATERIAL.test(desc + " " + title), care: CARE.test(desc) };
    var missing = Object.keys(has).filter(function (k) { return !has[k]; });
    add("Size, material and care details", 10, (3 - missing.length) / 3 * 10,
      missing.length ? "Missing: " + missing.join(", ") + "." : "Mentions size, material and care.",
      "Add " + missing.join(", ") + " details to the description; buyers look for these before buying.");

    // Deduction: shouting in the title
    var caps = (title.match(/\b[A-Z]{3,}\b/g) || []).filter(function (w) { return !/\d/.test(w); });
    if (caps.length >= 2 || (title.length > 10 && title === title.toUpperCase() && /[A-Z]/.test(title))) {
      checks.push({ name: "No all-caps", max: 0, points: -5, msg: "Title uses all-caps words: " + caps.join(", ") + ".", fix: "Use normal capitalisation in the title instead of ALL CAPS." });
    }

    var score = checks.reduce(function (s, c) { return s + c.points; }, 0);
    score = Math.max(0, Math.min(100, score));
    var fixes = checks.filter(function (c) { return c.fix; })
      .sort(function (a, b) { return (b.max - b.points) - (a.max - a.points); })
      .slice(0, 3).map(function (c) { return c.fix; });
    return { score: score, checks: checks, fixes: fixes };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = grade;
  else window.gradeListing = grade;
})();
