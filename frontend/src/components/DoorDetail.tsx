import Link from 'next/link';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import CatalogGuide from './CatalogGuide';
import DoorOptions from './DoorOptions';
import {doorProducts} from '@/lib/doorProducts';

export default function DoorDetail({door}:{door:typeof doorProducts[number]}) {
  return <main id="main" className="product-page">
    <section className="product-hero container">
      <div className="product-hero-copy"><Link className="back-link" href="/assortment#doors"><ArrowLeft size={15}/> Усі двері</Link><span className="eyebrow">ВХІДНІ РІШЕННЯ</span><h1>{door.name}</h1><p className="product-lead">{door.description}</p><Link className="button" href={`/contacts?interest=${encodeURIComponent(door.name)}#quote`}>Отримати розрахунок дверей <ArrowUpRight size={17}/></Link><p className="caption">Комплектацію та вартість погоджуємо індивідуально.</p></div>
      <div className="product-system-photo product-hero-photo"><img src={door.heroImage||door.image} alt={door.heroImageNote||`${door.name} — приклад оформлення`} width={1448} height={1086}/></div>
    </section>
    <section className="section"><div className="container split"><div><span className="eyebrow">КОМПЛЕКТАЦІЯ</span><h2>Від дизайну<br/>до деталей.</h2><p>Параметри конструкції залежать від розмірів прорізу та обраної системи. Перед виготовленням погоджуємо відкривання, заповнення й усі опції.</p><p className="source-note">Фото та приклади систем: <a href={door.source} target="_blank" rel="noreferrer">каталог LUVIN ↗</a></p></div><dl className="compact-specs">{door.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div></section>
    {door.id==='pvc-doors'&&<DoorOptions/>}
    <CatalogGuide guide={door.guide} interest={door.name}/>
  </main>;
}
