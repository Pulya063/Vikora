import {doorProducts} from '@/lib/doorProducts';
import AccessoryShowcase from './AccessoryShowcase';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Plus} from 'lucide-react';
import {products,categories,accessories,technologies,process,faq,business,money} from '@/lib/data';
export function SectionHeading({label,title,description,href}:{label:string;title:string;description?:string;href?:string}){return <div className="section-heading"><div><span className="eyebrow">{label}</span><h2>{title}</h2>{description&&<p>{description}</p>}</div>{href&&<Link prefetch={false} className="text-link" href={href}>Переглянути всі <ArrowUpRight size={18}/></Link>}</div>}
export function Categories(){return <section className="section category-section" id="choose"><div className="container"><SectionHeading label="ДЛЯ ВАШОГО ДОМУ" title="Оберіть, що вам потрібно" description="Сучасні вікна, надійні двері та комплектуючі для комфортного, енергоефективного та безпечного дому."/><div className="category-grid">{categories.map((c,i)=><Link prefetch={false} href={c.href} className="category-card" key={c.name}><div className="photo"><img src={c.image} alt={c.name} loading="lazy"/><span className="round-arrow"><ArrowUpRight size={22}/></span></div><span className="card-number">0{i+1}</span><h3>{c.name}</h3><p>{c.detail}</p></Link>)}</div></div></section>}
export function Products() {
  return <section className="section" id="windows"><div className="container">
    <SectionHeading label="ПРОДУКЦІЯ LUVIN" title="Вікна для вашого простору" description="Порівняйте глибину профілю, склопакет і орієнтовну вартість типових конструкцій." href="/assortment"/>
    <div className="product-grid catalogue-grid">{products.map(p => {
      return <article className="product-card product-preview" key={p.id}>
        <Link prefetch={false} className="product-preview__image" href={'/assortment/'+p.id} aria-label={'Детальніше про '+p.name}>
          <img src={p.cardImage} alt={p.cardImageNote} width={1254} height={1254} loading="lazy"/>
          <span className="product-preview__depth">{p.profileDepth} мм</span>
        </Link>
        <div className="product-preview__body">
          <span className="eyebrow">ПРОФІЛЬНА СИСТЕМА</span><h3>{p.name}</h3>
          <dl className="product-preview__characteristics">
            <div><dt>Монтажна глибина</dt><dd>{p.profileDepth} мм</dd></div>
            <div><dt>Кількість камер</dt><dd>{p.chambers}</dd></div>
            <div><dt>Склопакет</dt><dd>до {p.glazingMax} мм</dd></div>
            <div><dt>Профільна система</dt><dd>{p.profileSystem}</dd></div>
          </dl>
          <p className="product-preview__note">{p.description}</p>
          <div className="product-preview__actions">
            <Link prefetch={false} className="button secondary" href={'/assortment/'+p.id}>Детальніше</Link>
            <Link prefetch={false} className="button" href={'/calculator?profile='+p.id}>Розрахувати <ArrowUpRight size={16}/></Link>
          </div>
        </div>
      </article>;
    })}</div>
    <p className="source-note">Візуалізації показують будову профілю. Характеристики: <a href="https://luvin.ua/uk/catalog/" target="_blank" rel="noreferrer">каталог LUVIN ↗</a>. Точну конфігурацію погоджуємо індивідуально.</p>
  </div></section>;
}
export function CalculatorTeaser(){return <section className="section calculator-teaser"><div className="container split"><div><span className="eyebrow">ПРОСТО ПРО БЮДЖЕТ</span><h2>Ваше вікно.<br/>Ваші параметри.<br/>Зрозумілий розрахунок.</h2></div><div><p className="lead-text">Оберіть конструкцію, розміри й комплектацію. Дізнайтеся орієнтовну вартість виробу та передайте розрахунок менеджеру.</p><p className="service-note">{business.serviceNotice}</p><Link prefetch={false} href="/calculator" className="button">Розрахувати вартість <ArrowRight size={18}/></Link><p className="caption">Без реєстрації. Наразі використовуються тестові ціни.</p></div></div></section>}
export function Technologies({full=false}:{full?:boolean}){return <section className="section technologies" id="technologies"><div className="container"><SectionHeading label="БІЛЬШЕ, НІЖ ПРОСТО ВІКНО" title="Можливості, про які часто не знають" description="Маленькі деталі можуть змінити щоденний комфорт. Пояснюємо без складних термінів." href={full?undefined:'/technologies'}/><div className="tech-grid">{(full?technologies:technologies.slice(0,4)).map((t,i)=><article className="tech-card" key={t.id}><span className="tech-num">0{i+1}</span><h3>{t.name}</h3><p className="tech-benefit">{t.benefit}</p><p>{t.description}</p>{t.product?<Link prefetch={false} className="text-link" href={`/calculator?profile=${t.product}&${t.option?'extra='+t.option:'glass='+t.glass}`}>Додати до розрахунку <Plus size={16}/></Link>:<Link prefetch={false} className="text-link" href={`/contacts?interest=${encodeURIComponent(t.name)}#quote`}>Уточнити комплектацію <ArrowUpRight size={16}/></Link>}</article>)}</div>{full&&<p className="caption">Автоматичне та CO₂-кероване провітрювання не пропонуємо як доступну опцію, доки не підтверджено відповідні системи й сумісність.</p>}</div></section>}
export function Doors(){
  const pvcDoors=doorProducts.filter(door=>door.id==='pvc-doors');
  return <section className="section" id="doors"><div className="container"><SectionHeading label="ПЕРШЕ ВРАЖЕННЯ ПРО ДІМ" title="Двері, що зустрічають удома" description="ПВХ-конструкції, декоративні панелі й скління. Оберіть оформлення — деталі підберемо під ваш проріз."/><div className="door-catalog-grid door-catalog-grid--single">{pvcDoors.map(door=><article className="door-catalog-card" key={door.id}><Link prefetch={false} href={'/assortment/'+door.id}><img src={door.image} alt={door.name+' — приклад LUVIN'} width={500} height={400} loading="lazy"/><h3>{door.name}</h3></Link><p>{door.description}</p><Link prefetch={false} className="text-link" href={'/assortment/'+door.id+'#door-variants'}>Варіанти та комплектація <ArrowUpRight size={17}/></Link></article>)}</div><p className="source-note">Фото: каталог LUVIN. Модель, колір і комплектацію погоджуємо індивідуально.</p></div></section>;
}
export function TrustStats(){
  const maxDepth=Math.max(...products.map(p=>Number(p.profileDepth)||0));
  const stats:[string,string][]=[['20','профільні системи LUVIN'],[`до ${maxDepth}`,'мм монтажна глибина'],['до 52','мм товщина склопакета'],['Вінниччина','замір і монтаж по області']];
  return <section className="trust-stats" aria-label="Коротко про VIKORA"><div className="container stat-row">{stats.map(([v,l])=><div className="stat" key={l}><strong>{v}</strong><span>{l}</span></div>)}</div></section>;
}
export function Accessories(){return <AccessoryShowcase/>;}
export function Process(){return <section className="section" id="installation"><div className="container"><SectionHeading label="УСЕ ПОСЛІДОВНО" title="Від заміру до готового вікна" description="Супроводжуємо кожен етап. Умови й терміни погоджуємо для вашого замовлення."/><div className="process-grid">{process.map(([name,desc],i)=><article key={name}><span>{String(i+1).padStart(2,'0')}</span><h3>{name}</h3><p>{desc}</p></article>)}</div></div></section>}
export function FAQ(){return <section className="section" id="faq"><div className="container split"><div><span className="eyebrow">ВІДПОВІДАЄМО ЧЕСНО</span><h2>Можливо,<br/>ви хотіли запитати.</h2><Link prefetch={false} href="/contacts#quote" className="text-link">Поставити своє запитання <ArrowUpRight size={18}/></Link></div><div className="faq-list">{faq.map(([q,a])=><details key={q}><summary>{q}<Plus size={20}/></summary><p>{a}</p></details>)}</div></div></section>}

