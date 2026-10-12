import PageIntro from '@/components/PageIntro';
import QuoteForm from '@/components/QuoteForm';
import ContactDetails from '@/components/ContactDetails';
export const metadata={title:'Контакти — VIKORA у Вінниці'};
export default function Page(){return <main id="main"><PageIntro label="Контакти" title="Поговорімо про ваші вікна." description="Працюємо у Вінницькій області. Залиште запит — підберемо зручний спосіб зв’язку."/><ContactDetails/><QuoteForm/></main>}
