/* ══════════════════════════════════════════════════════════════════
   Commit Canvas — GIF89a encoder (pure JS, no dependencies)
   Used by the Export Studio to render Time Machine animations.
   Global palette (sampled across frames + brand colors),
   LZW compression, full-frame replacement, Netscape loop extension.
   ══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CommitCanvasGIF = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── palette: sample frequent colors ──────────────────────────── */

  function buildPalette(samples) {
    var counts = new Map();          // rgb int → hits
    samples.forEach(function (data) {
      for (var i = 0; i < data.length; i += 4) {
        var key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    var brand = [0x0b0c10, 0xe9ebf3, 0x9ba1b5, 0x687089, 0xe2ff3a,
                 0x232735, 0x2e3344, 0x12141c, 0xffffff, 0x7b9a1d, 0x151803];
    var picked = [];
    var used = new Set();
    function add(c) {
      if (picked.length < 255 && !used.has(c)) { used.add(c); picked.push(c); }
    }
    brand.forEach(add);
    var sorted = Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; });
    for (var j = 0; j < sorted.length && picked.length < 255; j++) add(sorted[j][0]);
    /* map rgb → palette index (nearest by squared distance, cached) */
    var rgbs = picked.map(function (c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; });
    var cache = new Map();
    function indexOf(r, g, b) {
      var key = (r << 16) | (g << 8) | b;
      var hit = cache.get(key);
      if (hit !== undefined) return hit;
      var best = 0, bd = Infinity;
      for (var i = 0; i < rgbs.length; i++) {
        var dr = rgbs[i][0] - r, dg = rgbs[i][1] - g, db = rgbs[i][2] - b;
        var d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; best = i; if (d === 0) break; }
      }
      cache.set(key, best);
      return best;
    }
    return { rgbs: rgbs, indexOf: indexOf };
  }

  /* ── LZW ──────────────────────────────────────────────────────── */

  function lzwEncode(minCodeSize, pixels, push) {
    var CLEAR = 1 << minCodeSize, EOI = CLEAR + 1;
    var codeSize = minCodeSize + 1, next = EOI + 1;
    var dict = new Map();
    var buf = 0, bits = 0;
    var block = [];

    function pushBlock() {
      push(block.length);
      for (var i = 0; i < block.length; i++) push(block[i]);
      block.length = 0;
    }
    function emit(code) {
      buf |= code << bits;
      bits += codeSize;
      while (bits >= 8) {
        block.push(buf & 255);
        buf >>= 8; bits -= 8;
        if (block.length === 255) pushBlock();
      }
    }
    function flush() {
      if (bits > 0) {
        block.push(buf & 255);
        if (block.length === 255) pushBlock();
      }
      if (block.length) pushBlock();
    }
    function resetDict() {
      dict.clear(); next = EOI + 1; codeSize = minCodeSize + 1;
    }

    emit(CLEAR);
    resetDict();
    var cur = pixels[0];
    for (var p = 1; p < pixels.length; p++) {
      var k = pixels[p];
      var key = (cur << 8) | k;
      var found = dict.get(key);
      if (found !== undefined) { cur = found; continue; }
      emit(cur);
      dict.set(key, next++);
      if (codeSize < 12 && next === (1 << codeSize) + 1) codeSize++;
      if (next === 4096) { emit(CLEAR); resetDict(); }
      cur = k;
    }
    emit(cur);
    emit(EOI);
    flush();
    push(0); /* block terminator */
  }

  /* ── encoder ──────────────────────────────────────────────────── */

  /**
   * encodeGIF({width, height, fps}, getFrame(i) -> RGBA {data}, frameCount, onProgress)
   * Returns a Blob of image/gif.
   */
  function encodeGIF(opts, getFrame, frameCount, onProgress) {
    var width = opts.width, height = opts.height;
    var fps = opts.fps || 12;
    var delay = Math.max(2, Math.round(100 / fps)); /* 1/100 s units */

    /* Pre-sample palette from a spread of frames for stability */
    var sample = [];
    var stride = Math.max(1, Math.floor(frameCount / 6));
    for (var s = 0; s < frameCount && sample.length < 6; s += stride) sample.push(getFrame(s).data);
    if (!sample.length) sample.push(getFrame(0).data);
    var pal = buildPalette(sample);

    var bytes = [];
    function str(t) { for (var i = 0; i < t.length; i++) bytes.push(t.charCodeAt(i) & 255); }
    function le16(n) { bytes.push(n & 255, (n >> 8) & 255); }

    str("GIF89a");
    le16(width); le16(height);
    bytes.push(0xF7, 0, 0);                       /* GCT flag, 8-bit, 256 entries */
    for (var i = 0; i < 256; i++) {               /* global color table */
      var c = pal.rgbs[i] || [0, 0, 0];
      bytes.push(c[0], c[1], c[2]);
    }
    /* Netscape loop extension */
    bytes.push(0x21, 0xFF, 0x0B);
    str("NETSCAPE2.0");
    bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

    var pixels = new Uint8Array(width * height);
    for (var f = 0; f < frameCount; f++) {
      var d = getFrame(f).data;
      for (var px = 0, o = 0; px < pixels.length; px++, o += 4) {
        pixels[px] = pal.indexOf(d[o], d[o + 1], d[o + 2]);
      }
      bytes.push(0x21, 0xF9, 0x04, 0x04);         /* GCE, disposal=1, no transparency */
      bytes.push(delay & 255, (delay >> 8) & 255, 0x00, 0x00);
      bytes.push(0x2C);                           /* image descriptor */
      le16(0); le16(0); le16(width); le16(height);
      bytes.push(0x00);                           /* no local color table */
      bytes.push(8);                              /* LZW min code size */
      lzwEncode(8, pixels, function (b) { bytes.push(b); });
      if (onProgress) onProgress(f + 1, frameCount);
    }
    bytes.push(0x3B);                             /* trailer */
    return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
  }

  return { encodeGIF: encodeGIF };
});
