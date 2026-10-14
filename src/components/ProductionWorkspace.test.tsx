import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductionWorkspace } from './ProductionWorkspace';
import { createDefaultProductionInput } from '../engine/production';
import { JSDOM } from 'jsdom';
import type { ProductionInput } from '../engine/production';
import { calculateProduction } from '../engine/production';
import { ProductionFlowView } from './ProductionFlowView';

test('red matrix defaults display the solver oil pathway and photons remain external', () => {
  const input = createDefaultProductionInput();
  input.targets = [{ itemId: '6002', ratePerMinute: 60 }, { itemId: '1208', ratePerMinute: 60 }];
  const markup = renderToStaticMarkup(<ProductionWorkspace input={input} onChange={() => {}} view="metrics" onViewChange={() => {}} onCopyToMixed={() => {}} />);
  assert.match(markup, /aria-label="配方 1120"[^>]*>[\s\S]*?<option value="recipe_16" selected=""/);
  assert.match(markup, /data-boundary-item="1208"/);
  assert.match(markup, /原矿及尚未建模的采集\/特殊产物默认外供/);
});

test('ordinary workspace renders editors and keeps both result views mounted', () => {
  const markup = renderToStaticMarkup(<ProductionWorkspace input={createDefaultProductionInput()} onChange={() => {}} view="metrics" onViewChange={() => {}} onCopyToMixed={() => {}} />);
  assert.match(markup, /添加目标/);
  assert.match(markup, /添加外供/);
  assert.match(markup, /production-schematic/);
  assert.match(markup, /production-metrics/);
  assert.match(markup, /hidden=""/);
});

test('ordinary targets and graph reuse game item and facility icons', () => {
  const input = createDefaultProductionInput();
  const markup = renderToStaticMarkup(<ProductionWorkspace input={input} onChange={() => {}} view="schematic" onViewChange={() => {}} onCopyToMixed={() => {}} />);
  const doc = new JSDOM(markup).window.document;
  const target = doc.querySelector('[aria-label="目标物品 1"]')!.parentElement!;
  assert.ok(target.querySelector('img[src*="dsp_icons/"]'), 'selected target has the shared game icon');
  const nodes = [...doc.querySelectorAll('[data-production-node]')];
  assert.ok(nodes.length);
  for (const node of nodes) {
    assert.ok(node.querySelector('img[alt][src*="dsp_icons/"]'), 'building icon is rendered in every step');
    assert.ok(node.querySelectorAll('img').length >= 2, 'step also displays its materials');
  }
});

test('acyclic production chains place material producers before consumers', () => {
  const result = calculateProduction(createDefaultProductionInput());
  const doc = new JSDOM(renderToStaticMarkup(<ProductionFlowView result={result} onCopyToMixed={() => {}} />)).window.document;
  const x = (name: string) => Number([...doc.querySelectorAll('[data-production-node]')].find(node => node.getAttribute('aria-label') === `选择步骤 ${name}`)!.getAttribute('transform')!.match(/translate\(([-\d.]+)/)![1]);
  for (const source of result.steps) for (const target of result.steps) {
    if (source !== target && source.outputs.some(output => target.inputs.some(input => input.itemId === output.itemId))) {
      assert.ok(x(source.recipe.name) < x(target.recipe.name), `${source.recipe.name} should feed ${target.recipe.name} from the left`);
    }
  }
});

test('target, external supply and recipe edits update independent input snapshots', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  const { render, fireEvent, cleanup } = await import('@testing-library/react');
  let latest = createDefaultProductionInput();
  const initial = JSON.stringify(latest);
  const original = latest;
  let copied = '';
  function Harness() {
    const [input, setInput] = React.useState<ProductionInput>(latest);
    const [view, setView] = React.useState<'metrics' | 'schematic'>('schematic');
    return <ProductionWorkspace input={input} onChange={next => { latest = next; setInput(next); }} view={view} onViewChange={setView} onCopyToMixed={step => { copied = step.recipe.id; }} />;
  }
  const screen = render(<Harness />);
  try {
    const itemSelect = screen.getByLabelText('目标物品 1') as HTMLSelectElement;
    assert.equal([...itemSelect.options].filter(option => option.textContent === '铁矿').length, 1);
    fireEvent.click(screen.getByRole('combobox', { name: '目标物品 1 图标选择' }));
    fireEvent.change(screen.getByLabelText('搜索目标物品 1'), { target: { value: '铁矿' } });
    const ironOption = screen.getByRole('option', { name: '铁矿' });
    assert.ok(ironOption.querySelector('img'));
    fireEvent.click(ironOption);
    assert.equal(latest.targets[0].itemId, '1001');
    fireEvent.click(screen.getByRole('combobox', { name: '目标物品 1 图标选择' }));
    fireEvent.change(screen.getByLabelText('搜索目标物品 1'), { target: { value: '电磁矩阵' } });
    fireEvent.keyDown(screen.getByLabelText('搜索目标物品 1'), { key: 'Enter' });
    assert.equal(latest.targets[0].itemId, '6001');
    fireEvent.click(screen.getByText('添加目标'));
    assert.equal(latest.targets.length, 2);
    fireEvent.change(screen.getByLabelText('目标物品 2'), { target: { value: '1001' } });
    fireEvent.change(screen.getByLabelText('目标产量 2'), { target: { value: '120' } });
    assert.equal(latest.targets[1].ratePerMinute, 120);
    fireEvent.click(screen.getByText('添加外供'));
    fireEvent.change(screen.getByLabelText('外供物品 1'), { target: { value: '1002' } });
    fireEvent.change(screen.getByLabelText('外供上限 1'), { target: { value: '600' } });
    assert.equal(latest.externalSupplies[0].limitPerMinute, 600);
    const recipeSelect = screen.getAllByLabelText(/^配方 /)[0] as HTMLSelectElement;
    fireEvent.change(recipeSelect, { target: { value: recipeSelect.options[1].value } });
    assert.ok(Object.values(latest.recipeSelection).includes(recipeSelect.options[1].value));
    const svg = screen.getByRole('img', { name: '完整生产链图' });
    const previousZoom = screen.getByLabelText('生产图缩放').textContent;
    fireEvent.wheel(svg, { deltaY: -100, clientX: 100, clientY: 100 });
    assert.notEqual(screen.getByLabelText('生产图缩放').textContent, previousZoom);
    fireEvent.click(screen.getByText('重置视野'));
    const node = screen.getAllByRole('button', { name: /^选择步骤 / })[0];
    fireEvent.click(node.querySelector('img')!);
    assert.equal(node.getAttribute('aria-pressed'), 'true');
    const originalPosition = node.getAttribute('transform');
    Object.defineProperty(dom.window, 'PointerEvent', { configurable: true, value: dom.window.MouseEvent });
    const linksBefore = [...svg.querySelectorAll('path[marker-end]')].map(path => path.getAttribute('d'));
    fireEvent.pointerDown(node.querySelector('img')!, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(svg, { clientX: 160, clientY: 140 });
    fireEvent.pointerUp(svg);
    assert.notEqual(node.getAttribute('transform'), originalPosition);
    assert.notDeepEqual([...svg.querySelectorAll('path[marker-end]')].map(path => path.getAttribute('d')), linksBefore);
    const movedPosition = node.getAttribute('transform');
    fireEvent.click(screen.getAllByText('复制此步骤到混带')[0]);
    assert.ok(copied);
    fireEvent.click(screen.getByLabelText('放大生产图'));
    fireEvent.click(screen.getByText('量化结果'));
    assert.equal(screen.getByTestId('production-schematic').hidden, true);
    fireEvent.click(screen.getByText('生产链 2D'));
    assert.equal(screen.getByRole('img', { name: '完整生产链图' }), svg);
    assert.equal(screen.getByLabelText('生产图缩放').textContent, '115%');
    assert.equal(node.getAttribute('aria-pressed'), 'true');
    assert.equal(node.getAttribute('transform'), movedPosition);
    const selectionKey = recipeSelect.getAttribute('aria-label')!.replace('配方 ', '');
    fireEvent.change(recipeSelect, { target: { value: '' } });
    assert.equal(Object.hasOwn(latest.recipeSelection, selectionKey), false);
    assert.notEqual(JSON.stringify(latest), initial);
    assert.equal(JSON.stringify(original), initial);
  } finally { cleanup(); dom.window.close(); }
});

test('invalid demand exposes solver error instead of a successful result', () => {
  const input = createDefaultProductionInput();
  input.targets[0].ratePerMinute = -1;
  const markup = renderToStaticMarkup(<ProductionWorkspace input={input} onChange={() => {}} view="metrics" onViewChange={() => {}} onCopyToMixed={() => {}} />);
  assert.match(markup, /role="alert"/);
  assert.match(markup, /生产链计算失败/);
});

test('simultaneous production graphs have unique arrow marker IDs', () => {
  const result = calculateProduction(createDefaultProductionInput());
  const markup = renderToStaticMarkup(<><ProductionFlowView result={result} onCopyToMixed={() => {}} /><ProductionFlowView result={result} onCopyToMixed={() => {}} /></>);
  const ids = [...markup.matchAll(/<marker id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
  const patterns = [...markup.matchAll(/<pattern id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(patterns.length, 2);
  assert.equal(new Set(patterns).size, 2);
});
