import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {compileContent} from '../tools/compile-content.mjs';
import {readWorkspace, loadSchemas} from '../src/core/packs.mjs';
import {readFiles} from '../tools/fs.mjs';

const expected = {
  python: ['functions', 'reader'], sql: ['joins', 'windows'],
  pandas: ['groupby'], pyspark: ['shuffle'], azure: ['reliability'],
  databricks: ['medallion'], norsk: ['work'], job: ['star'], personal: ['weekly'],
};

test('reviewed public build includes every playground page in its ordered project folder', async () => {
  // Exercise the real publication gate: schema-only loading missed the stale review hash.
  const result = await compileContent(null);
  assert.deepEqual(result.validation.missing, []);
  const pack = result.packs.find(p => p.manifest.id === 'study.samples');
  const pages = pack.pages.filter(p => p.id.startsWith('page.mock.'));
  assert.deepEqual(pages.map(p => p.id).sort(), Object.entries(expected)
    .flatMap(([topic, names]) => names.map(name => `page.mock.${topic}.${name}`)).sort());
  for (const [topic, names] of Object.entries(expected)) {
    const project = pack.projects.find(p => p.id === `project.samples.${topic}`);
    assert.equal(project.nodes[0].title, 'PDFs');
    const folder = project.nodes.find(n => n.id === `node.mock.${topic}.playground`);
    assert.equal(folder.title, 'Mock playground');
    assert.deepEqual(folder.children.map(n => n.pageId), names.map(n => `page.mock.${topic}.${n}`));
    for (const node of folder.children) {
      assert.equal(pages.find(p => p.id === node.pageId)?.title, node.title);
    }
  }
  assert.equal(pages.find(p => p.id === 'page.mock.norsk.work').title, 'Norsk på jobb');
});

test('a subsequent sample edit still requires a fresh publication review', async () => {
  const files = await readFiles('content');
  const path = 'packs/study.samples/pages/page.mock.python.functions.json';
  const page = JSON.parse(new TextDecoder().decode(files.get(path)));
  page.summary += ' Changed after review.';
  files.set(path, new TextEncoder().encode(JSON.stringify(page)));
  const schemas = await loadSchemas(n => fs.readFile('src/content/schemas/' + n, 'utf8'));
  const review = JSON.parse(await fs.readFile('content/publication-review.json', 'utf8'));
  await assert.rejects(readWorkspace(files, schemas, {publicOnly: true, reviewed: review.packs}),
    /Review hash is stale: study.samples/);
});
