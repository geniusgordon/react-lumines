export interface ModifierFlags {
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
}

export function isInputFieldActive(): boolean {
  const activeElement = document.activeElement;
  return !!(
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      (activeElement as HTMLElement).isContentEditable)
  );
}

export function getModifierFlags(event: KeyboardEvent): ModifierFlags {
  return {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
  };
}

export function shouldPreventDefault(
  event: KeyboardEvent,
  isGameKey: boolean,
  modifiers: ModifierFlags = getModifierFlags(event)
): boolean {
  return isGameKey && !modifiers.shift && !modifiers.ctrl && !modifiers.meta;
}
