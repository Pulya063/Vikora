import PageIntro from '@/components/PageIntro';
import QuoteForm from '@/components/QuoteForm';
import {business} from '@/lib/data';
export const metadata={title:'Контакти — VIKORA у Вінниці'};
export default function Page(){
 const phone=business.contacts.phone;
 const contacts=[
  {label:'ТЕЛЕФОН',value:phone,href:`tel:${phone.replace(/[^+\d]/g,'')}`,note:'Натисніть, щоб зателефонувати'},
  {label:'TELEGRAM',value:'Написати у Telegram',href:business.contacts.telegram,note:phone},
  {label:'VIBER',value:phone,href:business.contacts.viber,note:'Написати у Viber'},
  {label:'EMAIL',value:business.contacts.email,href:`mailto:${business.contacts.email}`,note:'Написати на пошту'},
 ];
 return <main id="main"><PageIntro label="Контакти" title="Поговорімо про ваші вікна." description="Працюємо у Вінницькій області. Залиште запит — підберемо зручний спосіб зв’язку."/><section className="container contact-grid">{contacts.map(item=><a key={item.label} href={item.href}><span className="eyebrow">{item.label}</span><p>{item.value}</p><small>{item.note}</small></a>)}</section><div className="container"><p className="caption">Адресу та графік роботи уточнюйте телефоном або в месенджері.</p></div><QuoteForm/></main>
}
