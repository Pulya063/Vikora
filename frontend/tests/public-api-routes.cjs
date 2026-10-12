const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const test=require('node:test');
const assert=require('node:assert/strict');
const context={exports:{},require,process};
const source=fs.readFileSync(path.join(__dirname,'../next.config.ts'),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);

test('frontend proxies only public endpoints, never Telegram or catch-all API',async()=>{
  const original=process.env.NEXT_PUBLIC_BACKEND_MODE;
  process.env.NEXT_PUBLIC_BACKEND_MODE='cloudflare';
  const rules=await context.exports.default('test').rewrites();
  const expected=['prices','contacts','leads'];
  assert.equal(rules.length,expected.length);
  for(const route of expected) assert.ok(rules.some(rule=>rule.source===`/api/${route}`));
  assert.ok(rules.every(rule=>!rule.source.includes('*')&&!rule.source.includes('telegram')));
  if(original===undefined)delete process.env.NEXT_PUBLIC_BACKEND_MODE;else process.env.NEXT_PUBLIC_BACKEND_MODE=original;
});

test('legacy mode keeps the FastAPI public contract',async()=>{
  const original=process.env.NEXT_PUBLIC_BACKEND_MODE;
  process.env.NEXT_PUBLIC_BACKEND_MODE='legacy';
  const rules=await context.exports.default('test').rewrites();
  assert.equal(rules.length,3);
  for(const route of ['v1/contact-information','v1/calculator/estimate','v1/quote-requests'])assert.ok(rules.some(rule=>rule.source===`/api/${route}`));
  assert.ok(rules.every(rule=>!rule.source.includes('telegram')));
  if(original===undefined)delete process.env.NEXT_PUBLIC_BACKEND_MODE;else process.env.NEXT_PUBLIC_BACKEND_MODE=original;
});
