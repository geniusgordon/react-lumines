export const formatKey = (key: string): string => {
  return key
    .replace('Key', '')
    .replace('Arrow', '')
    .replace('Escape', 'Esc')
    .replace('Space', 'Space');
};
