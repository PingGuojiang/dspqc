import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createDefaultMixedInput} from '../utils/workspaces';
import {calculateDSPMixedBelt} from '../engine/calculator';
import {PowerYieldCalculatorModule} from './PowerYieldCalculatorModule';
import {MetricsCard} from './MetricsCard';
import {DSP_RECIPES,DSP_FACILITIES,isFacilityCompatible} from '../data/dspData';

test('target simulator does not add a machine by rounding a fractional craft rate',()=>{
  const base=createDefaultMixedInput();
  const input={...base,recipe:{...base.recipe,craftTime:1.7},customFacilityCount:3};
  const result=calculateDSPMixedBelt(input);
  const html=renderToStaticMarkup(<PowerYieldCalculatorModule result={result} inputState={input} onChangeInput={()=>{}}/>);
  assert.doesNotMatch(html,/应用此台数/);
});

test('unsupported product bonuses are disabled in mixed metrics controls',()=>{
  const base=createDefaultMixedInput();
  const recipe=DSP_RECIPES.find(r=>r.numericId===89)!;
  const input={...base,recipe,facility:DSP_FACILITIES.find(f=>isFacilityCompatible(recipe,f))!,proliferatorTier:3 as const,proliferatorMode:'output' as const};
  const html=renderToStaticMarkup(<MetricsCard inputState={input} result={calculateDSPMixedBelt(input)} onChangeInput={()=>{}}/>);
  assert.match(html,/<button[^>]*disabled=""[^>]*>[^]*?<span>额外产出/);
  assert.doesNotMatch(html,/-20%~25%原料消耗/);
});
