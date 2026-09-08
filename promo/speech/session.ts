export interface SpeechSessionState {
  nextId: number;
  activeId: number | null;
  lastDeliveredText: string | null;
}

export function createSpeechSessionState(): SpeechSessionState {
  return { nextId: 0, activeId: null, lastDeliveredText: null };
}

export function beginSpeechSession(state: SpeechSessionState, text: string): number {
  const id = ++state.nextId;
  state.activeId = id;
  state.lastDeliveredText = text;
  return id;
}

export function invalidateSpeechSession(state: SpeechSessionState): number {
  const id = ++state.nextId;
  state.activeId = null;
  return id;
}

export function isCurrentSpeechSession(state: SpeechSessionState, id: number): boolean {
  return state.activeId === id;
}

export function replayText(state: SpeechSessionState): string | null {
  return state.lastDeliveredText;
}
