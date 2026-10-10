'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Check} from 'lucide-react';

const colors = [
  {id:'bila',name:'Біла',hex:'#f2f1ec',description:'Світлий акцент для білої рами або спокійного інтер’єру.'},
  {id:'korychneva',name:'Коричнева',hex:'#49392b',description:'Темний теплий відтінок для поєднання з деревними декорами.'},
  {id:'sribna',name:'Срібна',hex:'#cbd0cf',description:'Світлий металевий відтінок, який легко порівняти з іншими деталями інтер’єру.'},
  {id:'bronza',name:'Бронза',hex:'#aa8540',description:'Теплий металевий акцент поруч із деревом і природними відтінками.'},
  {id:'staleva',name:'Сталева',hex:'#909591',description:'Стриманий сірий металевий відтінок для сучасного оформлення вікна.'},
];

const handleTypes = [
  {id:'standard',name:'Стандартна ручка',image:'/images/handles/bila.jpg',alt:'Біла віконна ручка стандартного типу',description:'Класичне розташування на вертикальній частині стулки. Ручкою обирають зачинення, поворотне відкривання або відкидання — залежно від фурнітури.',detail:'Для щоденного користування вікном зі зручним доступом до стулки.',source:'https://luvin.ua/uk/catalog/metaloplastykove-vikno-luvin-premium/',credit:'LUVIN'},
  {id:'low',name:'Ручка внизу вікна',image:'/images/catalog/low-handle.jpg',alt:'Приклад нижнього розташування ручки на вікні',description:'Нижнє розташування полегшує доступ до керування, коли звичайна ручка зависоко або перед вікном є широка стільниця. Потребує сумісної фурнітурної системи.',detail:'Можливість встановлення та режим відкривання перевіряємо для вашої конструкції.',source:'https://luvin.ua/uk/catalog/ruchka-vnyzu-vikna/',credit:'LUVIN'},
  {id:'lock',name:'Ручка з ключем',image:'/images/accessories/handle-lock.webp',alt:'Віконна ручка із замковим циліндром для ключа',description:'Вбудований замок дає змогу блокувати ручку в передбачених моделлю положеннях і контролювати відкривання стулки. Ключ зберігають поза доступом дітей.',detail:'Підбираємо за сумісністю. Блокування не замінює нагляд дорослих.',source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',credit:'LUVIN'},
];

export default function HandleOptions() {
  const [selected,setSelected]=useState(colors[0]);
  return <div className="handle-options">
    <section className="handle-configurator" aria-labelledby="handle-colors-title">
      <div className="section-heading"><div><span className="eyebrow">01 / КОЛЬОРОВІ МОЖЛИВОСТІ</span><h2 id="handle-colors-title">Приміряйте колір ручки.</h2><p>Натисніть на зразок і роздивіться ручку у вибраному кольорі.</p></div></div>
      <div className="handle-configurator-layout">
        <figure className="handle-color-preview">
          <div className="handle-preview-label"><span>ВАШ ВИБІР</span><strong>{selected.name}</strong></div>
          <img src={`/images/handles/${selected.id}.jpg`} alt={`Приклад ручки — ${selected.name.toLowerCase()}`} width={800} height={600}/>
          <figcaption>Фото ручки з каталогу LUVIN · приклад оздоблення</figcaption>
        </figure>
        <div className="handle-color-controls">
          <fieldset><legend>Оберіть колір ручки</legend><div className="handle-color-grid">{colors.map(color=><button type="button" key={color.id} aria-label={`Колір ручки: ${color.name}`} aria-pressed={selected.id===color.id} onClick={()=>setSelected(color)}>
            <img src={`/images/handles/${color.id}.jpg`} alt="" width={160} height={120}/>
            <span className="handle-color-name"><i style={{background:color.hex}} aria-hidden="true"/>{color.name}</span>
            {selected.id===color.id&&<Check className="handle-selected-check" size={16} aria-hidden="true"/>}
          </button>)}</div></fieldset>
          <div className="handle-color-description" aria-live="polite" aria-atomic="true"><h3>{selected.name}</h3><p>{selected.description}</p></div>
          <Link className="button" href={`/contacts?interest=${encodeURIComponent('Віконна ручка — колір: '+selected.name)}#quote`}>Хочу цей колір <ArrowUpRight size={18}/></Link>
          <p className="caption">Відтінки на екрані орієнтовні. Колір і наявність для конкретної моделі підтвердимо за зразком.</p>
        </div>
      </div>
      <p className="source-note">Фото кольорів: <a href="https://luvin.ua/uk/catalog/metaloplastykove-vikno-luvin-premium/" target="_blank" rel="noreferrer">каталог LUVIN ↗</a></p>
    </section>
    <section className="handle-types" aria-labelledby="handle-types-title">
      <div className="section-heading"><div><span className="eyebrow">02 / СТИЛІ ТА РОЗТАШУВАННЯ</span><h2 id="handle-types-title">Три рішення для різних потреб.</h2><p>Порівняйте вигляд, спосіб користування та особливості встановлення.</p></div></div>
      <div className="handle-type-grid">{handleTypes.map(type=><article className={`handle-type-card handle-type-${type.id}`} key={type.id}>
        <img className="handle-type-photo" src={type.image} alt={type.alt} width={600} height={450} loading="lazy"/>
        <div className="handle-type-copy"><h3>{type.name}</h3><p>{type.description}</p><p className="handle-type-detail">{type.detail}</p><Link className="text-link" href={`/contacts?interest=${encodeURIComponent(type.name)}#quote`}>Підібрати таку ручку <ArrowUpRight size={16}/></Link><p className="source-note">Приклад: <a href={type.source} target="_blank" rel="noreferrer">{type.credit} ↗</a></p></div>
      </article>)}</div>
    </section>
  </div>;
}
