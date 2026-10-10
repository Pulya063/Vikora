import DoorDetail from '@/components/DoorDetail';
import {doorProducts} from '@/lib/doorProducts';
import CatalogGuide from '@/components/CatalogGuide';
import {productGuides} from '@/lib/catalogGuides';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,Check} from 'lucide-react';
import {products,business,money} from '@/lib/data';

const finishes=[
 {name:'Антрацит',color:'#3d4140'},
 {name:'Чорний',color:'#171817'},
 {name:'Золотий дуб',color:'#9a683b'},
 {name:'Горіх',color:'#6d432d'},
 {name:'Світлий дуб',color:'#bb9566'},
 {name:'Білий',color:'#f2f0e8'},
];

export function generateStaticParams(){return [...products,...doorProducts].map(p=>({id:p.id}))}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const{id}=await params;return {title:[...products,...doorProducts].find(p=>p.id===id)?.name||'Виріб не знайдено',description:[...products,...doorProducts].find(p=>p.id===id)?.description}}

function WindowDrawing({panes,dimensions}:{panes:number;dimensions:string}){
 const [width='—',height='—']=dimensions.match(/\d+/g)||[];
 const drawingWidth=340;
 const gap=7;
 const paneWidth=(drawingWidth-gap*(panes-1))/panes;
 const openingIndex=Math.min(1,panes-1);
 const id=`window-${panes}`;
 return <svg className="construction-drawing" viewBox="0 0 430 300" role="img" aria-label={`Технічне креслення: ${panes} секції, ${dimensions}`}>
  <defs>
   <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".48" stopColor="#e8e9e5"/><stop offset="1" stopColor="#bfc3bf"/></linearGradient>
   <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5fbfc"/><stop offset=".52" stopColor="#dce9eb"/><stop offset="1" stopColor="#c6d7da"/></linearGradient>
   <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#26332e" floodOpacity=".18"/></filter>
   <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#69746d"/></marker>
  </defs>
  <g filter={`url(#${id}-shadow)`}>
   <rect x="44" y="29" width="342" height="211" rx="3" fill={`url(#${id}-frame)`} stroke="#8f9994" strokeWidth="2"/>
   {Array.from({length:panes},(_,i)=>{const x=45+i*(paneWidth+gap);const isOpening=i===openingIndex;return <g key={i}>
    <rect x={x+5} y="35" width={paneWidth-10} height="199" rx="1" fill={`url(#${id}-frame)`} stroke="#a7afaa" strokeWidth="1.5"/>
    <rect x={x+13} y="43" width={paneWidth-26} height="183" rx="1" fill={`url(#${id}-glass)`} stroke="#9fb3b7" strokeWidth="1.4"/>
    <path d={`M${x+18} 48 L${x+paneWidth-18} 48 L${x+18} 221 Z`} fill="#fff" opacity=".2"/>
    {isOpening&&<><path d={`M${x+16} 222 L${x+paneWidth/2} 47 L${x+paneWidth-16} 222`} fill="none" stroke="#718785" strokeWidth="1.2" strokeDasharray="5 4"/><path d={`M${x+paneWidth-17} 48 L${x+17} 134 L${x+paneWidth-17} 222`} fill="none" stroke="#829695" strokeWidth="1.25"/><rect x={x+paneWidth-20} y="127" width="3" height="19" rx="1.5" fill="#626b67"/></>}
   </g>})}
   <path d="M40 241 H390" stroke="#8f9994" strokeWidth="3"/>
  </g>
  <g className="drawing-dimensions" fill="none" stroke="#69746d" strokeWidth="1">
   <path d="M45 265 H385" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`}/><path d="M45 246 V273 M385 246 V273"/>
   <path d="M410 31 V239" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`}/><path d="M391 31 H417 M391 239 H417"/>
  </g>
  <g className="drawing-labels" fill="#4f5b54"><text x="215" y="286" textAnchor="middle">{width} мм</text><text x="414" y="135" textAnchor="middle" transform="rotate(-90 414 135)">{height} мм</text></g>
 </svg>
}

export default async function Page({params}:{params:Promise<{id:string}>}){
 const{id}=await params;const door=doorProducts.find(item=>item.id===id);if(door)return <DoorDetail door={door}/>;const p=products.find(item=>item.id===id);if(!p)notFound();
 return <main id="main" className="product-page">
  <section className="product-hero container">
   <div className="product-hero-copy">
    <Link className="back-link" href="/assortment"><ArrowLeft size={15}/> Усі вікна</Link>
    <span className="eyebrow">ПРОФІЛЬНА СИСТЕМА {p.supplier}</span>
    <h1>{p.name}</h1>
    <p className="product-lead">{p.description}</p>
    <ul className="benefit-checks">{p.benefits.map(item=><li key={item}><Check size={17}/>{item}</li>)}</ul>
    <div className="product-hero-actions"><Link className="button" href={'/calculator?profile='+p.id}>Розрахувати своє вікно <ArrowUpRight size={17}/></Link><a className="text-link" href="#prices">Орієнтовні ціни</a></div>
   </div>
   <div className="product-system-photo product-model-photo product-hero-photo"><img src={p.heroImage||p.image} alt={p.heroImageNote||p.imageNote}/><span>{p.profileDepth} мм</span></div>
  </section>

  <section className="product-facts"><div className="container fact-row">
   <article><strong>{p.guaranteeYears}</strong><span>років гарантії<br/>на конструкцію</span></article>
   <article><strong>{p.profileDepth}</strong><span>мм монтажна<br/>глибина профілю</span></article>
   <article><strong>{p.glazingMax}</strong><span>мм максимальна<br/>товщина склопакета</span></article>
   <article><strong>{p.chambers}</strong><span>камер у<br/>профілі</span></article>
  </div></section>

  <section className="section profile-cutaway"><div className="container split">
   <div className="profile-image product-profile-cutaway"><img src={p.cardImage} alt={p.cardImageNote} loading="lazy"/></div>
   <div><span className="eyebrow">ОПИС МОДЕЛІ</span><h2>Профіль, скло<br/>та ущільнення.</h2><p>{p.name} — {p.description.toLocaleLowerCase('uk-UA')} Підберемо склопакет, фурнітуру та спосіб відкривання під ваші розміри й умови в домі.</p><dl className="compact-specs">{Object.entries(p.specifications).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="source-note">Зображення моделі: <a href={p.source} target="_blank" rel="noreferrer">офіційна сторінка {p.name} на LUVIN ↗</a></p></div>
  </div></section>

  <section className="section full-specs"><div className="container"><div className="section-heading"><div><span className="eyebrow">ПОВНІ ДАНІ СИСТЕМИ</span><h2>Характеристики та опції</h2><p>Сумісність кожної опції підтверджуємо для конкретного розміру та схеми відкривання.</p></div></div><div className="detail-groups">{p.detailSections.map(group=><article key={group.title}><h3>{group.title}</h3><dl>{group.items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></article>)}</div></div></section>

  <section className="section construction-prices" id="prices"><div className="container">
   <div className="section-heading"><div><span className="eyebrow">ВАРТІСТЬ КОНСТРУКЦІЙ</span><h2>Приклади у стандартній комплектації</h2><p>Ціни дають орієнтир для типових розмірів. Точна вартість залежить від відкривання, склопакета, кольору, фурнітури й актуального прайсу.</p></div></div>
   <div className="construction-grid">{p.constructionPrices.map((item,index)=><article key={item.dimensions}><WindowDrawing panes={index+1} dimensions={item.dimensions}/><span className="construction-type">{item.type}</span><h3>{item.dimensions}</h3><p>ціна від <strong>{money(item.price)} грн</strong></p><Link href={`/calculator?profile=${p.id}`}>Замовити розрахунок <ArrowUpRight size={15}/></Link></article>)}</div>
   <p className="price-disclaimer">Орієнтовні ціни взято з офіційної сторінки виробника. Монтаж і транспортування розраховуються окремо. {business.serviceNotice}</p>
  </div></section>

  <section className="section lamination-section"><div className="container lamination-layout">
   <div><span className="eyebrow">ДЕКОРАТИВНЕ ПОКРИТТЯ</span><h2>Ламінація<br/>під ваш інтер’єр.</h2><p>Декоративну плівку наносять на ПВХ-профіль під тиском і температурою. Вона змінює колір та фактуру вікна й додатково захищає поверхню. Можна оздобити зовнішню, внутрішню або обидві сторони профілю.</p><p>Покриття не потребує фарбування чи лакування. Доступність конкретного декору для обраної системи підтвердить менеджер.</p></div>
   <div className="finish-grid">{finishes.map(f=><article key={f.name}><span style={{background:f.color}}/><p>{f.name}</p></article>)}</div>
  </div></section>

  <CatalogGuide guide={productGuides[id]} interest={p.name}/>
 </main>
}
