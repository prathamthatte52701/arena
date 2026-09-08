export const rheaProfile = {
  portrait: '/character-references/rhea/face-front.png',
  width: 654,
  height: 1230,
  // All landmarks measured on the unchanged high-resolution front portrait.
  eyes: [{ x: 276, y: 364 }, { x: 437, y: 364 }],
  references: {
    threeQuarter: '/character-references/rhea/face-3quarter.png',
    neutral: '/character-references/rhea/expression-neutral.png',
    smirk: '/character-references/rhea/expression-confident-smirk.png',
    intimidating: '/character-references/rhea/expression-aggressive-intimidating.png',
  },
} as const;
