import type { Viseme } from '../face/mouth.ts';

const DIGRAPH_TO_VISEME: Record<string, Viseme> = {
  TH: 'WQ',
  SH: 'WQ',
  CH: 'WQ',
  PH: 'FV',
  OO: 'O',
  EE: 'AE',
  OU: 'O',
};

export function visemeForGroup(group: string): Viseme {
  const value = group.toUpperCase();
  if (DIGRAPH_TO_VISEME[value]) return DIGRAPH_TO_VISEME[value];
  if ('MBP'.includes(value)) return 'MBP';
  if ('FV'.includes(value)) return 'FV';
  if ('AEIY'.includes(value)) return 'AE';
  if ('OU'.includes(value)) return 'O';
  if (value === 'L') return 'L';
  if ('WQ'.includes(value)) return 'WQ';
  return 'REST';
}

export function phoneticGroups(word: string): string[] {
  const groups: string[] = [];
  const value = word.toUpperCase();
  for (let index = 0; index < value.length;) {
    const digraph = value.slice(index, index + 2);
    if (DIGRAPH_TO_VISEME[digraph]) {
      groups.push(digraph);
      index += 2;
    } else {
      groups.push(value[index]);
      index += 1;
    }
  }
  return groups;
}
