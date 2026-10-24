'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Check} from 'lucide-react';
import {accessoryDetails} from '@/lib/accessoryDetails';
import DecorRender from './DecorRender';

const colours=accessoryDetails.ebbs.variants![0].colors!;
const uses=[
  {name:'Нове вікно',image:'/images/catalog/ebb-standard.webp',text:'Базову ширину визначимо після заміру прорізу й майбутнього оздоблення.'},
  {name:'Утеплений фасад',image:'/images/catalog/ebb-insulated-facade.webp',text:'Врахуємо товщину утеплення, щоб край відливу виходив за площину фасаду.'},
  {name:'Виготовлення за розміром',image:'/images/catalog/ebbs.webp',text:'Відлив виготовляють під ширину прорізу. Перевіримо жорсткість, ухил і надійне примикання.'},
];

export default function EbbConfigurator(){
  const [useIndex,setUseIndex]=useState(0);
  const [colourIndex,setColourIndex]=useState(1);
  const use=uses[useIndex];
  const colour=colours[colourIndex];
  const interest=`Зовнішній відлив. Варіант: ${use.name}. Колір: ${colour.name}. Прошу уточнити розміри та розрахувати.`;

  return <section className="ebb-configurator" id="ebb-configurator" aria-labelledby="ebb-configurator-title">
    <div className="ebb-configurator-heading"><span className="eyebrow">РЕАЛЬНІ ПРИКЛАДИ</span><h2 id="ebb-configurator-title">Подивіться відлив у деталях.</h2><p>Оберіть сценарій і колір. Фото показує відлив на будинку, а модель поруч — профіль саме у вибраному кольорі.</p></div>
    <div className="ebb-configurator-layout">
      <figure className="ebb-live-preview">
        <img key={use.image} src={use.image} alt={`${use.name}: приклад зовнішнього віконного відливу`} width={600} height={600}/>
        <figcaption><span>{use.name}</span><strong>{colour.name}</strong></figcaption>
        <div className="ebb-colour-sample" key={colour.name}>
          <DecorRender kind="ebb" swatch={colour.swatch} label={`Відлив, колір ${colour.name}`} compact/>
          <span>Ваш колір</span>
        </div>
      </figure>
      <div className="ebb-configurator-controls">
        <div className="ebb-use-picker" role="group" aria-label="Сценарій встановлення відливу">{uses.map((item,index)=><button type="button" key={item.name} aria-pressed={useIndex===index} onClick={()=>setUseIndex(index)}>{item.name}</button>)}</div>
        <div className="ebb-selected-copy"><span className="eyebrow">ВАШ ВАРІАНТ</span><h3>{use.name} · {colour.name}</h3><p>{use.text}</p></div>
        <div className="ebb-colour-picker" role="group" aria-label="Кольори відливу">{colours.map((item,index)=><button type="button" key={item.name} aria-pressed={colourIndex===index} onClick={()=>setColourIndex(index)}><span style={{background:item.swatch}}>{colourIndex===index&&<Check size={16}/>}</span><small>{item.name}</small></button>)}</div>
        <Link prefetch={false} className="button" href={`/contacts?interest=${encodeURIComponent(interest)}#quote`}>Розрахувати цей відлив <ArrowUpRight size={18}/></Link>
        <p className="caption">Фото показують вигляд виробу на фасаді. Точний колір, ширину, виступ і спосіб кріплення погоджуємо після заміру.</p>
      </div>
    </div>
  </section>;
}
