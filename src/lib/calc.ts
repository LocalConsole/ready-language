/**
 * Безопасный калькулятор для SAT Math: рекурсивный парсер вместо eval/Function.
 * Поддержка: + - * / ^ ( ) % числа, x, pi, e, неявное умножение (2x, 3(x+1)), sin cos tan sqrt abs log ln floor ceil.
 */
type Tok = { k: 'num'; v: number } | { k: 'id'; v: string } | { k: 'op'; v: string };

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log, floor: Math.floor, ceil: Math.ceil,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.toLowerCase().replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = parseFloat(s.slice(i, j));
      if (isNaN(v)) throw new Error('num');
      out.push({ k: 'num', v });
      i = j;
    } else if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/.test(s[j])) j++;
      const id = s.slice(i, j);
      if (id === 'x' || id in FUNCS || id in CONSTS) out.push({ k: 'id', v: id });
      else if (/^[xe]+$/.test(id) || id === 'xpi' || id === 'pix') {
        // слитные "xe", "2pix" не поддерживаем — просим явный знак
        throw new Error('id');
      } else throw new Error('id');
      i = j;
    } else if ('+-*/^()%'.includes(c)) {
      out.push({ k: 'op', v: c });
      i++;
    } else throw new Error('char');
  }
  return out;
}

export function evaluate(src: string, x = 0): number {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.k === 'op' && (peek() as { v: string }).v === v;

  const startsAtom = () => {
    const t = peek();
    return !!t && (t.k === 'num' || t.k === 'id' || (t.k === 'op' && t.v === '('));
  };

  function expr(): number {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: string }).v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[p++] as { v: string }).v;
        const r = unary();
        v = op === '*' ? v * r : v / r;
      } else if (startsAtom()) v *= unary(); // неявное умножение
      else break;
    }
    return v;
  }
  function unary(): number {
    if (isOp('-')) {
      p++;
      return -unary();
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    return power();
  }
  function power(): number {
    const b = postfix();
    if (isOp('^')) {
      p++;
      return Math.pow(b, unary());
    }
    return b;
  }
  function postfix(): number {
    let v = atom();
    while (isOp('%')) {
      p++;
      v /= 100;
    }
    return v;
  }
  function atom(): number {
    const t = toks[p++];
    if (!t) throw new Error('end');
    if (t.k === 'num') return t.v;
    if (t.k === 'op' && t.v === '(') {
      const v = expr();
      if (!isOp(')')) throw new Error('paren');
      p++;
      return v;
    }
    if (t.k === 'id') {
      if (t.v === 'x') return x;
      if (t.v in CONSTS) return CONSTS[t.v];
      if (isOp('(')) {
        p++;
        const a = expr();
        if (!isOp(')')) throw new Error('paren');
        p++;
        return FUNCS[t.v](a);
      }
      return FUNCS[t.v](atom());
    }
    throw new Error('syntax');
  }

  const r = expr();
  if (p < toks.length) throw new Error('trailing');
  return r;
}
