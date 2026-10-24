'use client';
import {usePublicContacts} from './ContactsProvider';
export default function ContactDetails(){
  const {contacts,stale}=usePublicContacts();
  const items=[
    contacts.phone&&{label:'ТЕЛЕФОН',value:contacts.phone,href:`tel:${contacts.phone.replace(/[^+\d]/g,'')}`,note:'Натисніть, щоб зателефонувати'},
    contacts.telegram&&{label:'TELEGRAM',value:'Написати у Telegram',href:contacts.telegram,note:contacts.phone||''},
    contacts.viber&&{label:'VIBER',value:contacts.phone||'Написати у Viber',href:contacts.viber,note:'Написати у Viber'},
    contacts.email&&{label:'EMAIL',value:contacts.email,href:`mailto:${contacts.email}`,note:'Написати на пошту'},
  ].filter(Boolean) as {label:string;value:string;href:string;note:string}[];
  return <section className="contact-details" aria-label="Контакти"><div className="container contact-grid">{items.map(item=><a key={item.label} href={item.href}><span className="eyebrow">{item.label}</span><p>{item.value}</p><small>{item.note}</small></a>)}</div><div className="container contact-details__note"><p className="caption">{contacts.address||'Адресу та графік роботи уточнюйте телефоном або в месенджері.'}</p>{stale&&<p className="caption" role="status">Контакти тимчасово не вдалося оновити. Ви можете залишити заявку нижче.</p>}</div></section>;
}
