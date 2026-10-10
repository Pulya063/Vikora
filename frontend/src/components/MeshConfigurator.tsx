'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Check, Wind, Ruler, Droplets} from 'lucide-react';

const colours = [
  {id:'white', name:'Білий', hex:'#f2f0e9'},
  {id:'anthracite', name:'Антрацит', hex:'#414643'},
  {id:'brown', name:'Коричневий', hex:'#624437'},
  {id:'oak', name:'Золотий дуб', hex:'#b58a52'},
];
const types = [
  {id:'standard', name:'Рамкова', title:'Повітря — так. Комахам — ні.', text:'Легка алюмінієва рамка з полотном зі скловолокна. Практичне доповнення до вікна, яке часто відкриваєте.', detail:'Знімна конструкція · виготовлення за розміром'},
  {id:'elite', name:'Посилена', title:'Лаконічна форма. Міцніша рамка.', text:'Профіль «Еліт» шириною 40 мм із прихованими кутовими з’єднаннями та металевими ручками.', detail:'Профіль 40 мм · акуратні кути 45°'},
  {id:'door', name:'Дверна', title:'На терасу — одним рухом.', text:'Сітка на петлях відкривається назовні. Ручка й фіксатор роблять вихід на балкон або терасу зручнішим.', detail:'Поворотне відкривання · ручка та фіксатор'},
];
export default function MeshConfigurator(){
  const [type,setType]=useState(types[0]);
  const [mesh,setMesh]=useState(colours[0]);
  const previewImage=type.id==='door'?`/images/accessories/net-door-${mesh.id}.png`:`/images/accessories/net-${mesh.id}.webp`;
  const interest=`Москітна сітка: ${type.name}. Колір рамки: ${mesh.name}.`;
  return <section className="section mesh-section" id="mesh-colours"><div className="container">
    <div className="section-heading"><div><span className="eyebrow">СВІЖЕ ПОВІТРЯ. ВАШ СТИЛЬ.</span><h2>Сітка, яка пасує<br/>вашому вікну.</h2><p>Порівняйте відтінки й збережіть побажання для консультації.</p></div><a className="text-link" href="#mesh-options">До вибору кольору ↓</a></div>
    <div className="mesh-layout">
      <div className="mesh-preview">
        <div className="mesh-preview-label"><span>ВАША СІТКА</span><span>{type.name} · {mesh.name}</span></div>
        <div className="mesh-frame"><img className={`mesh-image mesh-image--${type.id} mesh-image--${mesh.id}`} src={previewImage} alt={`${type.name} москітна сітка, рамка ${mesh.name.toLowerCase()}`} width={900} height={1050}/></div>
        <p>Показуємо саму москітну сітку обраного типу. Точний відтінок рамки підтвердимо за фізичним зразком.</p>
      </div>
      <div className="mesh-options" id="mesh-options">
        <div className="segmented-control" role="group" aria-label="Тип москітної сітки">{types.map(option=><button type="button" key={option.id} aria-pressed={type.id===option.id} onClick={()=>setType(option)}>{option.name}</button>)}</div>
        <div className="mesh-description" aria-live="polite"><h3>{type.title}</h3><p>{type.text}</p><span>{type.detail}</span></div>
        <fieldset className="colour-picker"><legend>01 <span>Колір рамки сітки</span><strong>{mesh.name}</strong></legend><div>{colours.map(c=><button type="button" key={c.id} aria-label={`Рамка сітки: ${c.name}`} aria-pressed={mesh.id===c.id} onClick={()=>setMesh(c)}><span style={{backgroundColor:c.hex}}>{mesh.id===c.id&&<Check size={18} color={c.id==='white'?'#34392e':'white'}/>}</span><small>{c.name}</small></button>)}</div></fieldset>
        <Link className="button" href={`/contacts?interest=${encodeURIComponent(interest)}#quote`}>Підібрати цю сітку <ArrowUpRight size={18}/></Link>
        <p className="caption">Відтінки на екрані орієнтовні. Доступність кольору для обраного типу та сумісність підтвердимо за зразками.</p>
      </div>
    </div>
    <div className="mesh-benefits">{[[Wind,'Провітрюйте спокійно','Полотно пропускає повітря й допомагає захистити кімнату від комах.'],[Ruler,'За вашим розміром','Підберемо кріплення після уточнення розмірів прорізу.'],[Droplets,'Простий догляд','Знімну сітку можна обережно промити теплою водою.']].map(([Icon,title,text])=>{const I=Icon as typeof Wind;return <article key={String(title)}><I size={24} strokeWidth={1.4}/><h3>{String(title)}</h3><p>{String(text)}</p></article>})}</div>
    <p className="source-note">Тип і доступність сітки підтверджуємо перед замовленням. Москітна сітка не захищає від випадіння.</p>
  </div></section>;
}
