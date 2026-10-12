const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/quotePayload.ts'), 'utf8');
const context = {exports: {}, location: {protocol: 'http:', hostname: 'localhost'}};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, context);
const {quotePayload, quoteFingerprint, requireSecureFormTransport} = context.exports;
const form = new FormData();
for (const [key, value] of Object.entries({name:'Тестова заявка',phone:'(067) 123-45-67',city:'Вінниця',comment:"O'Brien",consent:'on',delivery:'on'})) form.set(key,value);
const configuration={product_type:'window',profile:'grand-pro',dimensions:{width_mm:1400,height_mm:1200},construction:'double',sections:2,opening:['fixed','tilt_turn'],glass_unit:'energy_saving',color:'white',extras:[],services_requested:{delivery:false,installation:false}};
const payloads = [quotePayload(form,'phone',null,{includeTurnstile:false}), quotePayload(form,'phone',{configuration,pricing_version:'test-version'},{includeTurnstile:false})];

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(payloads));
} else {
  const test = require('node:test');
  const assert = require('node:assert/strict');
  test('quote builder sends booleans, null email and a clean configuration',()=>{
    assert.equal(payloads[0].consent,true);
    assert.equal(payloads[0].needs_delivery,true);
    assert.equal(payloads[0].needs_installation,false);
    assert.equal(payloads[0].email,null);
    assert.equal('turnstile_token' in payloads[0],false);
    assert.equal(payloads[0].phone,'+380671234567');
    assert.equal(payloads[0].configuration,null);
    assert.equal(payloads[1].configuration,configuration);
    assert.equal(payloads[1].pricing_version,'test-version');
    assert.equal('estimated_product_price_uah' in payloads[1],false);
  });
  test('single-use Turnstile tokens do not change lead fingerprint',()=>{
    assert.equal(quoteFingerprint({...payloads[0],turnstile_token:'first'}),quoteFingerprint({...payloads[0],turnstile_token:'refreshed'}));
    assert.notEqual(quoteFingerprint(payloads[0]),quoteFingerprint({...payloads[0],name:'Інша заявка'}));
  });
  test('Cloudflare form requires CAPTCHA unless local bypass explicitly enabled',()=>{
    assert.throws(()=>quotePayload(form,'phone'),/Захист/);
    assert.equal(quotePayload(form,'phone',null,{allowLocalBypass:true}).turnstile_token,'local-bypass');
  });
  test('invalid contact data and absent consent fail before the request',()=>{
    const invalid=new FormData();for(const [key,value] of form)invalid.set(key,value);
    invalid.set('phone','+380671234567<script>');
    assert.throws(()=>quotePayload(invalid,'phone',null,{includeTurnstile:false}),/номер/);
    invalid.set('phone','0671234567');invalid.delete('consent');
    assert.throws(()=>quotePayload(invalid,'phone',null,{includeTurnstile:false}),/згода/);
  });
  test('file values cannot become quote JSON',()=>{
    form.set('comment',new Blob(['malicious']), 'payload.exe');
    assert.throws(()=>quotePayload(form,'phone'),/Файли/);
  });
  test('personal data requires HTTPS except local loopback',()=>{
    requireSecureFormTransport();
    context.location.hostname='192.168.1.10';
    assert.throws(requireSecureFormTransport,/HTTPS/);
    context.location.hostname='vikora.example';
    assert.throws(requireSecureFormTransport,/HTTPS/);
    context.location.protocol='https:';
    requireSecureFormTransport();
  });
}
