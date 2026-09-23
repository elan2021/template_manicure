const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const moduleExports = {};
const source = fs.readFileSync(path.join(__dirname, "../lib/template-booking.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(compiled, { exports: moduleExports });
const { normalizeAppointmentCtas, renderBookingTemplate, isValidTemplateId } = moduleExports;
const options = { slug: "maranails", templateId: "sineide-sousa-rose", studioName: "Mara Nails" };

test("normalizes all nested CTAs and preserves their presentation", () => {
  const html = '<a class="primary" href="#"><img src="assets/icon-agendar.svg" alt=""><span><strong>AGENDAR AGORA</strong></span><img class="arr" src="assets/icon-arrow.svg" alt=""></a><button class="secondary" type="submit">Agendar <b>agora</b></button>';
  const result = normalizeAppointmentCtas(html, "maranails");
  assert.equal((result.match(/data-module="appointment"/g) || []).length, 2);
  assert.match(result, /href="\/maranails#agendamento"/);
  assert.match(result, /<button class="secondary"\s+data-module="appointment" type="button">/);
  assert.match(result, /<span><strong>AGENDAR AGORA<\/strong><\/span><img class="arr"/);
});

test("normalizes explicit module attributes independently of text and old handlers", () => {
  const result = normalizeAppointmentCtas("<A data-module='appointment' target='_blank' href='javascript:legacy()' onclick='legacy()' title='2 > 1'>Reservar</A><button data-module=appointment>Escolher horário</button>", "studio");
  assert.equal((result.match(/data-module="appointment"/g) || []).length, 2);
  assert.match(result, /href="\/studio#agendamento"/);
  assert.match(result, /title='2 > 1'/);
  assert.doesNotMatch(result, /legacy|target=|onclick=/);
  assert.match(result, /type="button"/);
});

test("upload normalization adds the contract without needing a studio slug", () => {
  const result = normalizeAppointmentCtas('<a href="/old"><span>Agendar&nbsp;agora</span></a>');
  assert.match(result, /data-module="appointment" href="#agendamento"/);
  assert.equal(normalizeAppointmentCtas(result), result);
});

test("an empty appointment region receives an accessible CTA", () => {
  assert.equal(normalizeAppointmentCtas('<section class="book" data-module="appointment"></section>'), '<section class="book" data-module="appointment"><button type="button" data-module="appointment">Agendar agora</button></section>');
});

test("does not change unrelated links or code examples in scripts/comments", () => {
  const html = '<a href="https://example.com" class="social">Instagram</a><a data-module="whatsapp" href="/chat">Conversar</a><!-- <a href="#">Agendar agora</a> --><script>const example = \'<a href="#">Agendar agora</a>\';</script>';
  assert.equal(normalizeAppointmentCtas(html, "maranails"), html);
});

test("public renderer uses the selected upload with a single early base and shared assets", () => {
  const html = '<!doctype html><html><head><link rel="stylesheet" href="preview.css"><base href="/old/"></head><body><a href="#">Agendar agora</a></body></html>';
  const result = renderBookingTemplate(html, options);
  assert.equal((result.match(/<base\b/g) || []).length, 1);
  assert.match(result, /<head><base href="\/templates\/uploaded\/sineide-sousa-rose\/">/);
  assert.ok(result.indexOf("<base") < result.indexOf('href="preview.css"'));
  assert.equal((result.match(/href="preview.css"/g) || []).length, 1);
  assert.equal((result.match(/name="viewport"/g) || []).length, 1);
  assert.match(result, /<link rel="stylesheet" href="\/booking.css\?v=3">/);
  assert.match(result, /<script defer src="\/booking.js\?v=3" data-booking-slug="maranails"><\/script>/);
  assert.doesNotMatch(result, /<script>\(function|innerHTML/);
});

test("preserves an existing absolute template stylesheet and viewport", () => {
  const result = renderBookingTemplate('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/templates/uploaded/sineide-sousa-rose/preview.css?v=9"></head><body>Theme</body></html>', options);
  assert.equal((result.match(/preview\.css/g) || []).length, 1);
  assert.equal((result.match(/name="viewport"/g) || []).length, 1);
});

test("injects assets into fragments and incomplete documents without a closing body", () => {
  for (const html of ['<a href="#">Agendar agora</a>', '<html><head><title>Theme</title><body><a href="#">Agendar agora</a>', '<html><body><a href="#">Agendar agora</a>']) {
    const result = renderBookingTemplate(html, options);
    assert.match(result, /src="\/booking.js\?v=3"/);
    assert.match(result, /href="\/maranails#agendamento"/);
    assert.ok(result.indexOf("<base") < result.indexOf("<a "));
  }
});

test("escapes interpolated studio values and rejects path traversal in template ids", () => {
  const result = renderBookingTemplate('<html><head></head><body><h1>{{studioName}}</h1></body></html>', { ...options, studioName: '<script>alert("test")</script>', slug: 'studio"x' });
  assert.match(result, /&lt;script&gt;alert\(&quot;test&quot;\)&lt;\/script&gt;/);
  assert.match(result, /data-booking-slug="studio&quot;x"/);
  for (const id of ["../other", "C:\\other", "", null, ["atelier"]]) assert.equal(isValidTemplateId(id), false);
  assert.throws(() => renderBookingTemplate("theme", { ...options, templateId: "../other" }), /Invalid template id/);
});
