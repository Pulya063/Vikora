import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile={render:(element,options)=>{window.__turnstileOptions=options;queueMicrotask(()=>options.callback('TEST.TURNSTILE.TOKEN'));element.textContent='Mock verification';return 'test-widget'},remove:()=>{},reset:()=>{queueMicrotask(()=>window.__turnstileOptions.callback('TEST.TURNSTILE.REFRESHED'))}};`,
  }));
});

test('rapid submits send once, a failed retry keeps the idempotency key', async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const requests: {key:string|undefined; body:Record<string,unknown>}[]=[];
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve});
  await page.route('**/api/leads',async route=>{
    requests.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
    if(requests.length===1){await held;await route.fulfill({status:500,json:{detail:'Спробуйте ще раз'}})}
    else await route.fulfill({status:201,json:{public_id:'VKR-TEST',status:'NEW'}});
  });
  await page.goto('/contacts');
  await expect(page).toHaveTitle(/VIKORA/i);
  await page.locator('[name=name]').fill('Тестова заявка');
  await page.locator('[name=phone]').fill('+380671234567');
  await page.locator('[name=consent]').check();
  await page.locator('form.quote-form').evaluate(form=>{
    for(let i=0;i<10;i++) form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  await expect.poll(()=>requests.length).toBe(1);
  await expect(page.locator('form.quote-form button[type=submit], form.quote-form button.button')).toBeDisabled();
  release();
  await expect(page.locator('form.quote-form').getByRole('alert')).toContainText('Спробуйте ще раз');
  await page.locator('form.quote-form button.button').click();
  await expect(page.locator('.success[role="status"]')).toContainText('VKR-TEST');
  expect(requests).toHaveLength(2);
  expect(requests[1].key).toBe(requests[0].key);
  expect(requests[0].body.consent).toBe(true);
  expect(requests[0].body.email).toBe(null);
  expect(errors).toEqual([]);
  if(process.env.FORM_QA_SCREENSHOT) await page.screenshot({path:process.env.FORM_QA_SCREENSHOT,fullPage:false});
});

test('changing dimensions discards a pending estimate',async ({page})=>{
  let release!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve});
  let received=false;
  await page.route('**/api/prices',async route=>{
    received=true;
    await held;
    await route.fulfill({json:{currency:'UAH',is_mock:true,pricing_version:'0123456789abcdef',rules:{base:{area:3500,minimum:3000},construction:{double:1.12},profile:{'grand-pro':1},glass:{energy_saving:1.12},opening:{fixed:0,tilt_turn:1400},accessory:{}}}}).catch(()=>{});
  });
  await page.goto('/calculator');
  await page.getByRole('button',{name:'Розрахувати вартість',exact:true}).click();
  await expect.poll(()=>received).toBe(true);
  await page.getByLabel('Ширина, мм').fill('1500');
  release();
  await expect(page.locator('.result strong')).toHaveText('—');
  await expect(page.getByRole('button',{name:'Розрахувати вартість',exact:true})).toBeEnabled();
  await expect(page.locator('.quote-form')).toHaveCount(0);
});

test('429 prevents immediate resubmission',async ({page})=>{
  let count=0;
  await page.route('**/api/leads',async route=>{
    count++;
    await route.fulfill({status:429,headers:{'Retry-After':'60'},json:{detail:'Забагато запитів'}});
  });
  await page.goto('/contacts');
  await page.locator('[name=name]').fill('Тестова заявка');
  await page.locator('[name=phone]').fill('+380671234567');
  await page.locator('[name=consent]').check();
  await page.locator('form.quote-form button.button').click();
  await expect(page.locator('form.quote-form').getByRole('alert')).toContainText('Забагато запитів');
  await page.locator('form.quote-form button.button').click();
  await expect(page.locator('form.quote-form').getByRole('alert')).toContainText('Зачекайте');
  expect(count).toBe(1);
});

test('contacts page keeps its layout within a mobile viewport', async ({page})=>{
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/contacts');
  await expect(page).toHaveTitle(/VIKORA/i);
  await expect(page.getByRole('heading',{name:/поговорімо/i})).toBeVisible();
  const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
  expect(errors).toEqual([]);
  if(process.env.FORM_QA_MOBILE_SCREENSHOT) await page.screenshot({path:process.env.FORM_QA_MOBILE_SCREENSHOT,fullPage:true});
});
