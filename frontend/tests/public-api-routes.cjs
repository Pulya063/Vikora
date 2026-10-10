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
  const rules=await context.exports.default('test').rewrites();
  const expected=['products','products/:productId','products/:productId/options','contact-information','technologies','calculator/options','calculator/estimate','quote-requests'];
  assert.equal(rules.length,expected.length);
  for(const route of expected) assert.ok(rules.some(rule=>rule.source===`/api/v1/${route}`));
  assert.ok(rules.every(rule=>!rule.source.includes('*')&&!rule.source.includes('telegram')));
});
