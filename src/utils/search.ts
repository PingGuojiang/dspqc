import { pinyin, customPinyin } from 'pinyin-pro';
// Game terminology overrides the general dictionary's reading of 重组.
customPinyin({ '重组式': 'chong zu shi' });
const cache = new Map<string, string[]>();
const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\s\u2019']/g, '');
/** Offline name matching: Chinese, Latin names, full pinyin and initials. */
export function matchesSearch(name: string, query: string, aliases: string[] = []): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  if ([name, ...aliases].some(value => normalize(value).includes(needle))) return true;
  let keys = cache.get(name);
  if (!keys) {
    const syllables = pinyin(name, { toneType: 'none', type: 'array' });
    keys = [normalize(syllables.join('')), normalize(syllables.map(part => part[0] || '').join(''))];
    if (cache.size >= 3000) cache.clear();
    cache.set(name, keys);
  }
  return keys.some(key => key.includes(needle));
}
