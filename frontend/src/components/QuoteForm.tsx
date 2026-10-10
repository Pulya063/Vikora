'use client';
import {useState,useEffect,useRef} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CheckCircle2} from 'lucide-react';
import type {Estimate} from '@/lib/types';
import {quotePayload,requireSecureFormTransport} from '@/lib/quotePayload';
import {business,money} from '@/lib/data';
export default function QuoteForm({estimate}:{estimate?:Estimate|null}){
 const [preferred,setPreferred]=useState('phone');const [result,setResult]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [stored,setStored]=useState<Estimate|null>(null);const submitting=useRef(false);const retryAt=useRef(0);const key=useRef('');const payloadHash=useRef('');const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{try{const v=sessionStorage.getItem('vikora-estimate');if(v)setStored(JSON.parse(v))}catch{} const interest=new URLSearchParams(location.search).get('interest');if(interest){const el=form.current?.elements.namedItem('comment') as HTMLTextAreaElement;if(el)el.value=interest}},[]);
 const attached=estimate===undefined?stored:estimate;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(submitting.current)return;
  if(Date.now()<retryAt.current){setError('Зачекайте трохи перед наступною спробою.');return}
  submitting.current=true;setBusy(true);setError('');
  try{
   requireSecureFormTransport();
   const serialized=JSON.stringify(quotePayload(new FormData(event.currentTarget),preferred,attached));
   if(payloadHash.current!==serialized){key.current=crypto.randomUUID();payloadHash.current=serialized}
   const response=await fetch('/api/v1/quote-requests',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key.current},body:serialized,signal:AbortSignal.timeout(20000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok){
    if(response.status===429||response.status===503){const seconds=Number(response.headers.get('Retry-After')||3);retryAt.current=Date.now()+Math.min(60,Math.max(1,Number.isFinite(seconds)?seconds:3))*1000}
    if(response.status===409&&data?.estimate){setStored(data.estimate);try{sessionStorage.setItem('vikora-estimate',JSON.stringify(data.estimate))}catch{}throw new Error('Ціни оновлено. Поверніться до калькулятора й отримайте новий розрахунок.')}
    throw new Error(data?.errors?.map((e:{message:string})=>e.message.replace('Value error, ','')).join(' ')||data?.detail||'Не вдалося зберегти заявку.')
   }
   if(!data?.public_id)throw new Error('Не вдалося підтвердити збереження заявки. Повторіть спробу.');
   setResult(data.public_id);try{sessionStorage.removeItem('vikora-estimate')}catch{}
  }catch(e){setError(e instanceof Error?e.message:'Не вдалося надіслати. Перевірте з’єднання й спробуйте ще раз.')}finally{submitting.current=false;setBusy(false)}
 }

 return <section className="section quote-section" id="quote"><div className="container split"><div><span className="eyebrow">ПЕРШИЙ КРОК ДО ЗАТИШКУ</span><h2>Отримайте<br/>точний розрахунок.</h2><p>Залиште контакти. Обговоримо ваші побажання, допоможемо з комплектацією й погодимо наступний крок.</p><p className="service-note">{business.serviceNotice}</p>{attached&&<div className="attached">Конфігурацію додано<br/><strong>≈ {money(attached.estimated_product_price_uah)} грн</strong><small>Тестова ціна виробу</small></div>}</div>{result?<div className="success" role="status"><CheckCircle2 size={38}/><h3>Дякуємо. Заявку збережено.</h3><p>Ваш номер: <strong>{result}</strong></p><p>Зараз це локальний тестовий режим. Реальні повідомлення менеджеру потребують налаштованих контактів.</p></div>:<form ref={form} onSubmit={submit} className="quote-form"><div className="form-row"><label>Ім’я *<input name="name" autoComplete="given-name" required minLength={2} maxLength={100} placeholder="Як до вас звертатися"/></label><label>Телефон *<input name="phone" type="tel" maxLength={40} autoComplete="tel" required placeholder="+380 __ ___ __ __"/></label></div><div className="form-row"><label>Населений пункт<input name="city" autoComplete="address-level2" maxLength={120} placeholder="Вінниця"/></label><label>Email{preferred==='email'?' *':''}<input name="email" type="email" maxLength={254} autoComplete="email" required={preferred==='email'} placeholder="your@email.com"/></label></div><label>Як зручніше зв’язатися?<select value={preferred} onChange={e=>setPreferred(e.target.value)}>{[['phone','Телефон'],['Telegram','Telegram'],['Viber','Viber'],['email','Email']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>{preferred==='Telegram'&&<label>Ім’я користувача Telegram *<input name="contact_handle" required placeholder="@username" maxLength={100}/></label>}<label>Коментар<textarea name="comment" maxLength={2000} rows={3} placeholder="Розкажіть трохи про ваше замовлення"/></label><div className="checks"><label><input name="delivery" type="checkbox" defaultChecked={attached?.configuration.services_requested.delivery}/>Потрібна доставка</label><label><input name="installation" type="checkbox" defaultChecked={attached?.configuration.services_requested.installation}/>Потрібен монтаж</label></div><label className="honeypot" aria-hidden="true">Ваш сайт<input name="website" tabIndex={-1} autoComplete="off"/></label><label className="consent"><input name="consent" type="checkbox" required/><span>Погоджуюся на обробку даних для відповіді на заявку. <Link href="/privacy">Умови конфіденційності</Link></span></label>{error&&<p role="alert" className="error">{error}</p>}<button className="button" disabled={busy}>{busy?'Зберігаємо…':'Отримати точний розрахунок'}<ArrowUpRight size={18}/></button><small className="muted">Локальний тестовий режим. Використовуйте тестові контактні дані.</small></form>}</div></section>
}
