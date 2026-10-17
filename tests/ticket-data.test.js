import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/scenarios.js';

test('support requests mix detailed reports with five specific follow-up investigations', () => {
  const tickets = SCENARIOS.filter(scenario => scenario.intake);
  assert.deepEqual(tickets.filter(scenario => scenario.intake.kind === 'follow-up').map(scenario => scenario.id), ['INC-101','INC-103','INC-108','NET-201','NET-205']);
  assert.equal(tickets.filter(scenario => scenario.intake.kind === 'detailed').length, 8);
  for (const scenario of tickets) {
    assert.ok(['detailed','follow-up'].includes(scenario.intake.kind), scenario.id);
    assert.ok(Array.isArray(scenario.intake.factIds), scenario.id);
    if (scenario.intake.kind === 'detailed') assert.deepEqual(scenario.intake.factIds, [], scenario.id + ': a detailed request does not force extra questions');
  }
});

test('each incomplete request has an askable contextual fact without hiding physical inspections', () => {
  for (const scenario of SCENARIOS.filter(entry => entry.intake?.kind === 'follow-up')) {
    assert.ok(scenario.intake.missing.length > 10, scenario.id + ': explain what information is missing');
    assert.ok(scenario.clues.filter(clue => !clue.requiresFact).length >= 2, scenario.id + ': physical observations remain available');
    for (const id of scenario.intake.factIds) {
      const fact = scenario.interviewFacts.find(entry => entry.id === id);
      assert.ok(fact?.answer && fact.keywords?.length, scenario.id + ': required fact is a scripted case fact');
      assert.ok(scenario.questions.some(question => fact.keywords.some(keyword => question.label.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()))), scenario.id + ': a relevant starter can ask for the fact');
      assert.ok(scenario.clues.some(clue => clue.requiresFact === id), scenario.id + ': the contextual reply becomes recorded evidence');
    }
    for (const clue of scenario.clues.filter(entry => entry.requiresFact)) assert.ok(scenario.intake.factIds.includes(clue.requiresFact), scenario.id + ': no orphaned contextual clue');
  }
});
