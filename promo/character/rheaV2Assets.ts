const root = '/character-references/rhea-v2';

export const rheaV2Assets = {
  faceFrontNeutral: `${root}/01-face-front-neutral.png`,
  faceThreeQuarterNeutral: `${root}/02-face-3quarter-neutral.png`,
  faceProfile: `${root}/03-face-profile.png`,
  faceConfidentSmirk: `${root}/04-face-closeup-confident-smirk.png`,
  faceAggressiveIntimidating: `${root}/05-face-closeup-aggressive-intimidating.png`,
  faceColdNeutral: `${root}/06-face-closeup-cold-neutral.png`,
  bodyFront: `${root}/07-body-front.png`,
  bodySide: `${root}/08-body-side.png`,
  bodyBack: `${root}/09-body-back.png`,
  bodyThreeQuarterFront: `${root}/10-body-3quarter-front.png`,
  upperBodyPromoFront: `${root}/11-upperbody-promo-front.png`,
  upperBodyCameraStare: `${root}/12-upperbody-camera-stare.png`,
  upperBodyInterviewerLook: `${root}/13-upperbody-interviewer-look.png`,
  hairFront: `${root}/14-hair-front.png`,
  hairBack: `${root}/15-hair-back.png`,
  matchAttire: `${root}/16-match-attire-reference.png`,
  entranceAttire: `${root}/17-entrance-attire-reference.png`,
  tattooDetails: `${root}/18-tattoos-details-closeup.png`,
  expressionMocking: `${root}/19-expression-mocking.png`,
  expressionSpeakingOpen: `${root}/20-expression-speaking-mouth-open.png`,
  manifest: `${root}/manifest.json`,
  readme: `${root}/README.txt`,
} as const;

export type RheaV2Asset = keyof typeof rheaV2Assets;
