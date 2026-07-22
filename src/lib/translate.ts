export async function translateText(text: string, targetLang: 'ru' | 'uz' | 'en'): Promise<string> {
  if (!text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Translation request failed');
  const data = await res.json();
  const chunks = data?.[0] as [string, string][] | undefined;
  if (!chunks) throw new Error('Unexpected translation response');
  return chunks.map(chunk => chunk[0]).join('');
}
