import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';

const models = [
  {id:'L23',image:'/images/catalog/door-l23-hq.webp',finish:'WOODEC Дуб Тернер toffee',description:'Теплий деревний декор для входу, який поєднується з природними матеріалами фасаду.'},
  {id:'V31',image:'/images/catalog/door-v31-hq.webp',finish:'Горіх',description:'Насичений деревний відтінок для виразного оформлення вхідної групи.'},
  {id:'H11',image:'/images/catalog/door-h11-hq.webp',finish:'Чорний Ulti-Matt',description:'Темна матова поверхня та вставки зі скла для сучасного фасаду.'},
];
export default function DoorOptions() {
  return <section className="section door-options" id="door-variants" aria-labelledby="door-variants-title"><div className="container">
    <div className="section-heading"><div><span className="eyebrow">ВАРІАНТИ ТА КОМПЛЕКТАЦІЯ</span><h2 id="door-variants-title">Якими будуть ваші двері?</h2><p>Перегляньте приклади оформлення та надішліть запит на розрахунок потрібного варіанта.</p></div></div>
    <div className="door-model-grid">{models.map(item=>{
      const interest=`ПВХ вхідні двері — панель ${item.id}, декор ${item.finish}. Прошу розрахувати цей варіант.`;
      return <article className="door-model-card" key={item.id}>
      <img src={item.image} alt={`Візуалізація вхідних ПВХ-дверей, панель ${item.id}, ${item.finish}`} width={1456} height={1092} loading="lazy"/>
      <div><span className="eyebrow">ПАНЕЛЬ {item.id}</span><h3>{item.finish}</h3><p>{item.description}</p><Link prefetch={false} className="button secondary" aria-label={`Розрахувати двері з панеллю ${item.id}`} href={`/contacts?interest=${encodeURIComponent(interest)}#quote`}>Отримати розрахунок <ArrowUpRight size={17}/></Link></div>
    </article>})}</div><p className="source-note door-visual-note">Візуалізації показують характер оформлення. Точний колір, рисунок декору, скління та пропорції погоджуємо для обраної конструкції.</p>
    <p className="source-note">Фото панелей та характеристики профілів: <a href="https://luvin.ua/uk/catalog/vkhidni-metaloplastykovi-dveri-luvin/" target="_blank" rel="noreferrer">каталог LUVIN ↗</a>. Доступність декору й моделі уточнюємо перед замовленням.</p>
  </div></section>;
}
