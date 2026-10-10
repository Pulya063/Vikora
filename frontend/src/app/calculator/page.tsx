import PageIntro from '@/components/PageIntro';
import Calculator from '@/components/Calculator';
export const metadata={title:'Калькулятор вартості вікон у Вінниці'};
export default function Page(){return <main id="main"><PageIntro label="Калькулятор" title="Скільки коштуватиме ваше вікно?" description="Кілька простих параметрів — і ви знаєте орієнтовний бюджет. Розраховуємо лише виріб; додаткові послуги погоджуємо окремо."/><Calculator/></main>}
