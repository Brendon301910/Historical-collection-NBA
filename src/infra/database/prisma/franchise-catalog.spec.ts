import * as history from '../../../../prisma/data/history.json';
import * as franchises from '../../../../prisma/data/franchises.json';
import { loadFranchiseCatalog } from '../../../../prisma/franchise-catalog';

describe('Franchise catalog', () => {
  it('assigns all historical identities exactly once and keeps unrelated teams separate', () => {
    const catalog = loadFranchiseCatalog(history.teams);
    expect(catalog).toHaveLength(33);
    expect(catalog.flatMap((f) => f.teamCodes).sort()).toEqual(
      history.teams.map((t) => t.code).sort(),
    );
    const group = (code: string) =>
      catalog.find((f) => f.teamCodes.includes(code)).code;
    expect(group('SEA')).toBe('OKC');
    expect(group('CHA-BOB')).toBe('CHA');
    expect(group('CHH')).toBe('CHA');
    expect(group('NOK')).toBe('NOP');
    expect(group('BAL-1947')).toBe('BAL-1947');
    expect(group('BAL-1963')).toBe('WAS');
    expect(group('CHS')).toBe('CHS');
    expect(group('WSC')).toBe('WSC');
    expect(group('PHW')).toBe('GSW');
    expect(group('SYR')).toBe('PHI');
  });

  it.each(['unknown', 'duplicate', 'missing', 'canonical', 'source'])(
    'rejects %s franchise mappings before writing',
    (kind) => {
      const input = JSON.parse(JSON.stringify(franchises));
      if (kind === 'unknown') input.franchises[0].teamCodes.push('UNKNOWN');
      if (kind === 'duplicate') input.franchises[0].teamCodes.push('SEA');
      if (kind === 'missing') input.franchises.pop();
      if (kind === 'canonical') input.franchises[0].code = 'CHI';
      if (kind === 'source')
        input.franchises[0].sourceUrls = ['https://example.com'];
      expect(() => loadFranchiseCatalog(history.teams, input)).toThrow();
    },
  );
});
