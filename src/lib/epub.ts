/** Чтение .epub прямо в браузере (zip + DecompressionStream), без внешних библиотек. */
interface Entry {
  name: string;
  m: number;
  data: ArrayBuffer;
}
function unzip(buf: ArrayBuffer): Entry[] {
  const dv = new DataView(buf);
  let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out: Entry[] = [];
  const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const m = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.slice(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    const ln = dv.getUint16(lo + 26, true), le = dv.getUint16(lo + 28, true), st = lo + 30 + ln + le;
    out.push({ name, m, data: buf.slice(st, st + cs) });
  }
  return out;
}
export async function readEpub(file: File): Promise<string> {
  const files = unzip(await file.arrayBuffer());
  let txt = '';
  for (const f of files.filter((x) => /\.(x?html?)$/i.test(x.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    let b: ArrayBuffer = f.data;
    if (f.m === 8) b = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(b), 'text/html');
    doc.querySelectorAll('script,style').forEach((x) => x.remove());
    txt += [...doc.querySelectorAll('p,h1,h2,h3,li')].map((x) => (x.textContent || '').trim()).filter(Boolean).join('\n\n') + '\n\n';
  }
  return txt.trim();
}
