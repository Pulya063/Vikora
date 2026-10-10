import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {accessoryHighlights, accessoryVisuals} from '@/lib/accessoryVisuals';

export default function AccessoryShowcase(){
  return <section className="section accessory-showcase" id="accessories"><div className="container">
    <div className="section-heading"><div><span className="eyebrow">МАЛЕНЬКІ ДЕТАЛІ. ЩОДЕННИЙ КОМФОРТ.</span><h2>Ваше вікно.<br/>Продумане до ручки.</h2><p>Приємно торкатися. Легко користуватися. Красиво поєднувати з домом.</p></div><Link className="button secondary" href="/accessories">Усі комплектуючі <ArrowUpRight size={18}/></Link></div>
    <div className="accessory-showcase-grid">{accessoryHighlights.map(item => <Link className="accessory-tile" key={item.id} href={`/accessories/${item.id}`}>
      <div className="accessory-tile-photo"><img src={accessoryVisuals[item.id].image} alt={accessoryVisuals[item.id].caption} width={600} height={600} loading="lazy"/><span className="glass-arrow"><ArrowUpRight size={20}/></span></div>
      <div className="accessory-tile-copy"><span className="eyebrow">{item.tag}</span><h3>{item.name}</h3><p>{item.text}</p></div>
    </Link>)}</div>
    <p className="source-note">Конкретну модель, сумісність і наявність комплектуючих погодимо перед замовленням.</p>
  </div></section>;
}
