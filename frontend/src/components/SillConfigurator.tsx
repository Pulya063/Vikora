'use client';

import {type CSSProperties, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Check} from 'lucide-react';
import {accessoryDetails} from '@/lib/accessoryDetails';

const series=accessoryDetails['window-sills'].variants!;

export default function SillConfigurator(){
  const [seriesIndex,setSeriesIndex]=useState(0);
  const [colourIndex,setColourIndex]=useState(0);
  const current=series[seriesIndex];
  const colours=current.colors!;
  const colour=colours[colourIndex]||colours[0];
  const previewImage=colour.image||current.image||'/images/accessories/sill.webp';
  const interest=`Підвіконня ${current.name}. Декор: ${colour.name}. Прошу підібрати розмір і розрахувати цей варіант.`;

  function selectSeries(index:number){setSeriesIndex(index);setColourIndex(0)}

  return <section className="sill-configurator" id="sill-configurator" aria-labelledby="sill-configurator-title">
    <div className="sill-configurator-heading"><span className="eyebrow">ФОТО ОБРАНОГО ВАРІАНТА</span><h2 id="sill-configurator-title">Порівняйте підвіконня наживо.</h2><p>Перемикайте серію та декор — покажемо фотографію відповідного підвіконня або приклад його поверхні.</p></div>
    <div className="sill-configurator-layout">
      <figure className={`sill-live-preview${colour.image?' has-decor-photo':''}`} style={{'--sill-decor':colour.swatch} as CSSProperties}>
        <img src={previewImage} alt={`Підвіконня ${current.name}, декор ${colour.name}`} width={1000} height={1000}/>
        {!colour.image&&<span className="sill-preview-tint" aria-hidden="true"/>}
        <figcaption><span>{current.name}</span><strong>{colour.name}</strong></figcaption>
      </figure>
      <div className="sill-configurator-controls">
        <div className="sill-series" role="group" aria-label="Серія підвіконня">{series.map((item,index)=><button type="button" key={item.name} aria-pressed={seriesIndex===index} onClick={()=>selectSeries(index)}>{item.name}</button>)}</div>
        <div className="sill-selected-copy"><span className="eyebrow">ОБРАНИЙ ДЕКОР</span><h3>{current.name} · {colour.name}</h3><p>{current.description}</p></div>
        <div className="sill-colour-picker" role="list" aria-label={`Декори ${current.name}`}>{colours.map((item,index)=><button type="button" role="listitem" key={item.name} aria-pressed={colourIndex===index} onClick={()=>setColourIndex(index)}><span style={{background:item.swatch}}>{colourIndex===index&&<Check size={16}/>}</span><small>{item.name}</small></button>)}</div>
        <Link className="button" href={`/contacts?interest=${encodeURIComponent(interest)}#quote`}>Розрахувати цей варіант <ArrowUpRight size={18}/></Link>
        <p className="caption">Фото показує тип і характер поверхні. Точний відтінок, блиск і фактуру підтверджуємо за фізичним зразком.</p>
      </div>
    </div>
  </section>;
}
