const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const test=require('node:test');
const assert=require('node:assert/strict');
const context={exports:{},require,process};
const source=fs.readFileSync(path.join(__dirname,'../next.config.ts'),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const apiDir=path.join(__dirname,'../src/app/api');

test('cloudflare mode exposes only public endpoints via route handlers, never Telegram or catch-all API',async()=>{
  const original=process.env.NEXT_PUBLIC_BACKEND_MODE;
  process.env.NEXT_PUBLIC_BACKEND_MODE='cloudflare';
  const rules=await context.exports.default('test').rewrites();
  assert.equal(rules.length,0,'cloudflare mode must not proxy through rewrites (BACKEND service binding is used)');
  const routes=fs.readdirSync(apiDir,{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
  assert.deepEqual(routes,['contacts','leads','prices']);
  const methods={prices:['GET'],contacts:['GET'],leads:['POST']};
  for(const route of routes){
    const handler=fs.readFileSync(path.join(apiDir,route,'route.ts'),'utf8');
    const exported=[...handler.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map(match=>match[1]);
    assert.deepEqual(exported,methods[route],`unexpected methods for /api/${route}`);
    assert.ok(handler.includes(`proxyToBackend(request, '${route}')`),`/api/${route} must proxy to the same backend path`);
  }
  assert.ok(routes.every(route=>!route.includes('telegram')&&!route.startsWith('[')));
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
