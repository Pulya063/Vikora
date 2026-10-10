// Product examples are informational; availability is confirmed for each request.
// Availability and compatibility at VIKORA are always confirmed by a manager.
export const accessoryDetails: Record<string, {
  name: string;
  lead: string;
  source: string;
  points: string[];
  variants?: {name:string; description:string; specifications:string[]; source:string; image?:string; colors?: {name:string; image?:string; swatch:string}[]; calculatorOption?:string}[];
}> = {
  'window-sills': {
    name: 'Підвіконня',
    lead: 'Доповнюють вікно й допомагають оформити проріз під ваш інтер’єр. Підбираємо глибину, довжину, фактуру та колір після заміру.',
    source: 'https://luvin.ua/uk/catalog-category/pidvikonnia/',
    points: ['Потрібну глибину визначаємо за прорізом і розташуванням радіатора.', 'Колір і покриття узгоджуємо з вікном та інтер’єром.', 'Торцеві заглушки й монтаж обговорюємо окремо.'],
    variants: [
      {name:'Kraft',image:'/images/accessories/sill-kraft.jpg',description:'Практичний варіант із матовою поверхнею та вибором декорів під дерево. Декор добираємо за зразком під ваш інтер’єр.',specifications:['Глибина 100–600 мм, крок 50 мм','Довжина до 6 000 мм','Білий, антрацит і декори під дерево'],colors:[
        {name:'Білий',swatch:'linear-gradient(135deg,#fff,#deded8)'},
        {name:'Антрацит',swatch:'linear-gradient(135deg,#555a57,#292e2b)'},
        {name:'Золотий дуб',swatch:'repeating-linear-gradient(12deg,#c39154 0 4px,#8c5c2f 5px 8px)'},
        {name:'Горіх',swatch:'repeating-linear-gradient(12deg,#76503a 0 4px,#3f291f 5px 8px)'}
      ],source:'https://luvin.ua/uk/catalog/pidvikonnia-kraft/'},
      {name:'Plastolit',image:'/images/accessories/sill-plastolit.jpg',description:'Елегантні підвіконня із заокругленим капіносом. Покриття та рекомендації з догляду уточнюємо для обраного декору.',specifications:['Глибина 100–600 мм, крок 50 мм','Довжина до 6 000 мм','Варіанти під дерево й мармур'],colors: [
        {name:'Білий',image:'/images/accessories/plastolit/belyy-445x350.png',swatch:'linear-gradient(135deg,#fff,#e2e2dc)'},
        {name:'Золотий дуб',image:'/images/accessories/plastolit/zolotoy-dub-445x350.png',swatch:'repeating-linear-gradient(12deg,#c78c43 0 4px,#8a5527 5px 8px)'},
        {name:'Венге',image:'/images/accessories/plastolit/venge-445x350.png',swatch:'repeating-linear-gradient(12deg,#5c3827 0 4px,#241711 5px 8px)'},
        {name:'Мармур',image:'/images/accessories/plastolit/mramor-445x350.png',swatch:'linear-gradient(145deg,#d8d0c8,#f3eee7 42%,#aaa39e 44%,#ece7e0 47%)'},
        {name:'Бежевий мармур',image:'/images/accessories/plastolit/bezhevyy-mramor-445x350.png',swatch:'linear-gradient(145deg,#d8bf98,#f2dfbd 42%,#a98d65 44%,#ead3ac 47%)'},
        {name:'Мармур могул',image:'/images/accessories/plastolit/mogul-mramor-445x350.jpg',swatch:'linear-gradient(145deg,#d8d7cf,#f6f3ea 42%,#aaa9a2 44%,#eceae2 47%)'},
        {name:'Мармур аліканте',image:'/images/accessories/plastolit/alikante-mramor-445x350.jpg',swatch:'linear-gradient(145deg,#232725,#555955 42%,#b4b4aa 44%,#313532 47%)'},
        {name:'Мармур марцена',image:'/images/accessories/plastolit/marzena-mramor-445x350.jpg',swatch:'linear-gradient(145deg,#4e3d32,#9a7a62 42%,#d2ba9f 44%,#674f40 47%)'},
        {name:'Рустикальний дуб',image:'/images/accessories/plastolit/rustikalnyy-dub-445x350.png',swatch:'repeating-linear-gradient(12deg,#8b5b31 0 4px,#4d2d18 5px 8px)'},
        {name:'Білий дуб',image:'/images/accessories/plastolit/belyy-dub-445x350.jpg',swatch:'repeating-linear-gradient(12deg,#d4c8b5 0 4px,#9e907c 5px 8px)'}
      ],source:'https://luvin.ua/uk/catalog/pidvikonnia-plastolit/'},
      {name:'Crystalit',image:'/images/accessories/sill-crystalit.jpg',description:'Преміальне глянцеве підвіконня із двошаровим акриловим покриттям Elesgo. Варіант для інтер’єрів, де важливий блиск поверхні.',specifications:['Глибина 100–700 мм, крок 50 мм','Довжина до 6 000 мм','Ідеально рівна поверхня'],colors:[
        {name:'Білий глянець',swatch:'linear-gradient(135deg,#fff 0 42%,#dfe6e5 48%,#fff 58%)'},
        {name:'Перламутр',swatch:'linear-gradient(135deg,#eee9df,#fff 38%,#d9e1de 53%,#f6eee8)'},
        {name:'Світлий камінь',swatch:'linear-gradient(145deg,#d5d1c7,#f1eee5 43%,#a9a69f 45%,#e7e3da 48%)'},
        {name:'Темний камінь',swatch:'linear-gradient(145deg,#303431,#62655f 43%,#a7a69d 45%,#3b3f3b 48%)'}
      ],source:'https://luvin.ua/uk/catalog/pidvikonnia-crystalit/'}
    ]
  },
  'mosquito-nets': {name:'Москітні сітки',lead:'Захищають кімнату від комах під час провітрювання.',source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',points:['Розмір і кріплення визначаємо за вашим вікном.','Перед замовленням перевіряємо сумісність і доступний тип сітки.']},
  'handles': {
    name: 'Ручки',
    lead: 'Ручка впливає на щоденну зручність користування вікном. У каталозі LUVIN є різні стилі та рішення.',
    source: 'https://luvin.ua/uk/catalog/ruchka-vnyzu-vikna/',
    points: ['Положення ручки залежить від конструкції вікна.','Колір і модель уточнюємо для обраної системи.'],
    variants: [
      {
        name: 'Кольорові можливості',
        description: 'Оберіть колір ручки, що ідеально пасуватиме до вашого профілю чи інтер’єру.',
        specifications: [
          'Біла',
          'Коричнева',
          'Срібна',
          'Бронза',
          'Сталева'
        ],
        source: 'https://luvin.ua/uk/catalog/metaloplastykove-vikno-luvin-premium/'
      },
      {
        name: 'Стилі та розташування',
        description: 'Варіанти ручок для різних потреб та умов експлуатації.',
        image: '/images/catalog/low-handle.jpg',
        specifications: [
          'Стандартна ручка — класичне розташування посередині стулки.',
          'Ручка внизу вікна (activPilot Comfort Ergo) — ідеально для високих вікон, людей з інвалідністю або при широкій стільниці.',
          'Ручка з ключем — додаткова опція для дитячої безпеки та захисту від небажаного відкривання.'
        ],
        source: 'https://luvin.ua/uk/catalog/ruchka-vnyzu-vikna/'
      }
    ]
  },
  'child-locks': {
    name: 'Дитячі замки',
    lead: 'Допомагають обмежити самостійне відкривання вікна дитиною. Замок не замінює нагляд дорослих.',
    source: 'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',
    points: ['Рішення підбираємо під тип стулки й спосіб користування.','Замок не замінює нагляд дорослих.'],
    variants: [
      {
        name: 'Baby Safe Lock / Winkhaus FSV',
        image: '/images/catalog/winkhaus-fsv-child-lock.jpg',
        description: 'Компактний замок встановлюють у нижній частині стулки. Після замикання ключем він блокує повне поворотне відкривання, але залишає можливість відкинути вікно для провітрювання.',
        specifications: [
          'Ключ переводить замок у режим блокування повного відкривання',
          'Відкидне положення для провітрювання залишається доступним',
          'Замок працює як окремий елемент разом із сумісною відповідною планкою',
          'Сумісність, місце встановлення й комплект ключів перевіряємо перед замовленням'
        ],
        source: 'https://sklep.winkhaus.pl/pl/fsv-zamek-okienny-br-bez-kluczyka.html'
      }
    ]
  },
  'ebbs': {
    name: 'Відливи',
    lead: 'Надійний захист стіни та вікна ззовні. Відливи захищають фасад від вологи та перепадів температури.',
    source: 'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',
    points: [
      'Ефективне відведення дощової води та снігу.',
      'Матеріал і захисне покриття підбираємо під умови фасаду.',
      'Гармонійний вигляд разом із вікном та фасадом будівлі.'
    ],
    variants: [
      {
        name: 'Варіанти під замовлення',
        description: 'Широкий вибір кольорів дає простір для дизайнерських рішень, творчості та індивідуального стилю оселі.',
        specifications: [
          'Класичні білі відливи',
          'Коричневі відливи різної насиченості',
          'Відливи під структуру дерева',
          'Можливість потрібного кольору уточнюємо під час підбору'
        ],
        colors: [
          {name:'Білий',swatch:'linear-gradient(135deg,#fff,#d9dbd7)'},
          {name:'Антрацит',swatch:'linear-gradient(135deg,#555b58,#252a27)'},
          {name:'Коричневий',swatch:'linear-gradient(135deg,#7b5644,#412b23)'},
          {name:'Золотий дуб',swatch:'repeating-linear-gradient(12deg,#c38d4e 0 4px,#86552d 5px 8px)'},
          {name:'Срібний',swatch:'linear-gradient(135deg,#f1f3f2,#9da3a1 48%,#dde0df)'},
          {name:'Колір RAL',swatch:'conic-gradient(#8c453f,#c1a24e,#677d63,#4b667a,#8c453f)'}
        ],
        source: 'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/'
      }
    ]
  },
  'glass': {
    name: 'Склопакети',
    lead: 'Основа тепло- та звукоізоляції. Склопакет займає близько 80% площі вікна, тому від його вибору залежить ваш комфорт.',
    source: 'https://luvin.ua/uk/catalog-category/metaloplastykovi-vikna/',
    points: [
      'Підбираємо кількість камер відповідно до ваших потреб енергозбереження.',
      'Можливість використання мультифункціонального або безпечного скла.'
    ],
    variants: [
      {
        name: 'Різновиди скла',
        description: 'Асортимент видів скла дозволяє задовольнити будь-які вимоги до енергоефективності, безпеки та дизайну.',
        specifications: [
          'Енергозберігаюче скло (Low-E) – зберігає тепло взимку',
          'Мультифункціональне скло (Solar) – захищає від спеки влітку та зберігає тепло взимку',
          'Сонцезахисне скло (тоноване, рефлекторне) – знижує яскравість світла',
          'Триплекс або загартоване скло — залежно від вимог до безпечного скління',
          'Шумоізоляційне скло (різна товщина скла та дистанційної рамки)'
        ],
        source: 'https://luvin.ua/uk/catalog-category/metaloplastykovi-vikna/'
      },
      {
        name: 'Декоративні шпроси',
        description: 'Це плетіння всередині склопакета. Утворюючи в ньому певний візерунок, шпроси надають конструкції унікальності.',
        specifications: [
          'Золоті шпроси',
          'Білі шпроси',
          'Коричневі шпроси',
          'Шпроси під колір дерева',
          'Різні варіанти товщини та малюнка'
        ],
        source: 'https://luvin.ua/uk/catalog/vikna-zi-shprosamy/'
      }
    ]
  },
  'opening-limiters': {
    name: 'Обмежувачі відкривання',
    lead: 'Допомагають контролювати рух стулки, захищати відкоси й організувати зручне провітрювання. Розглянемо окремий обмежувач або систему з прихованими петлями.',
    source: 'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/',
    points: [
      'Кут і спосіб фіксації погоджуємо з урахуванням укосів, меблів та сценарію користування.',
      'Сумісність перевіряємо за профілем, розмірами, вагою стулки та типом фурнітури.',
      'Звичайний обмежувач відкривання не замінює спеціальний дитячий замок.'
    ],
    variants: [
      {
        name: 'Обмежувач кута відкривання',
        image: '/images/catalog/hidden-hardware-window.jpg',
        description: 'Механізм зупиняє стулку на погодженому куті, щоб вона не вдарялася об укіс, стіну або меблі. Конкретний тип підбираємо під наявну фурнітуру та геометрію вікна.',
        specifications: [
          'Допомагає захистити укоси й сусідні поверхні',
          'Кут відкривання залежить від моделі та конструкції вікна',
          'Положення для миття й повного доступу погоджуємо під час підбору',
          'Для готового вікна потрібні фото фурнітури та замір стулки'
        ],
        source: 'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/'
      },
      {
        name: 'Прихована фурнітура activPilot Select',
        image: '/images/catalog/hidden-hardware-detail.jpg',
        calculatorOption: 'hidden_hardware',
        description: 'Петлі та механізми розташовані у фурнітурному пазі й не помітні на зачиненому вікні. Інтегрований обмежувач дозволяє відкрити стулку до 95° та захищає відкоси.',
        specifications: [
          'Поворотне, відкидне та мікропровітрювальне положення ручки',
          'Допустима вага стулки — від 100 до 150 кг залежно від комплектації',
          'Рекомендована площа стулки — до 3 м² за даними LUVIN',
          'Замкнутий контур ущільнення підтримує герметичність конструкції',
          'Сумісність підтверджуємо для конкретного профілю та розміру'
        ],
        source: 'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/'
      }
    ]
  },
  'hardware': {
    name: 'Фурнітура',
    lead: 'Від фурнітури залежать відкривання, притиск і плавність роботи вікна. Розглянемо класичні або приховані системи за сумісністю.',
    source: 'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/',
    points: ['Комплектацію підбираємо разом із профілем і стулкою.','Приховані петлі доступні лише для сумісних конструкцій.'],
    variants: [
      {
        name: 'Стандартна фурнітура (Winkhaus)',
        description: 'Надійна фурнітура з видимими накладними петлями. Забезпечує базовий рівень комфорту та безпеки.',
        specifications: [
          'Класичні накладні петлі (можливі декоративні накладки)',
          'Простота в обслуговуванні',
          'Сумісність перевіряємо за профілем і вагою стулки'
        ],
        source: 'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/'
      },
      {
        name: 'Повністю прихована фурнітура (activPilot Select)',
        image: '/images/catalog/hidden-hardware.jpg',
        calculatorOption: 'hidden_hardware',
        description: 'Елегантне рішення, в якому всі елементи фурнітури заховані у фурнітурному пазі. Стулка виглядає акуратно з будь-якого боку.',
        specifications: [
          'Естетика та дизайн — відсутність видимих петель на вікні.',
          'Висока міцність — витримує стулки вагою від 100 до 150 кг і площею до 3 м.кв.',
          'Захист відкосів — інтегрований обмежувач відкривання стулки до 95 градусів.',
          'Краща герметичність — замкнутий контур гумового ущільнення покращує тепло- та шумоізоляцію.',
          'Зручність у догляді — з прихованими петлями вікно легше і швидше мити.'
        ],
        source: 'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/'
      }
    ]
  },
  'security-hardware': {name:'Протизламна фурнітура',lead:'Додаткові елементи фурнітури можуть підвищити опір вікна спробі зламу.',source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',points:['Рівень захисту залежить від усієї конструкції, не лише від фурнітури.','Доступність і сумісність уточнюємо для конкретного вікна.']},
  'auto-ventilation': {
    name: 'Автоматичне провітрювання',
    lead: 'Сучасні електроприводи та фурнітурні системи, що забезпечують дистанційне відчинення та зачинення стулки.',
    source: 'https://luvin.ua/uk/catalog/avtomatychne-provitriuvannia/',
    points: [
      'Можливість налаштування таймера для автоматичного провітрювання.',
      'Інтеграція з автоматизацією — за сумісністю обладнання.',
      'Зручне керування вікнами у важкодоступних місцях.'
    ],
    variants: [
      {
        name: 'Системи автоматичного провітрювання',
        image: '/images/catalog/auto-ventilation.jpg',
        description: 'Електроприводи, що дозволяють відкривати та закривати вікна автоматично.',
        specifications: [
          'Спосіб керування залежить від приводу та контролера',
          'Провітрювання за погодженим сценарієм',
          'Підключення датчиків перевіряємо для конкретної системи'
        ],
        source: 'https://luvin.ua/uk/catalog/avtomatychne-provitriuvannia/'
      }
    ]
  },
  'decor': {name:'Декоративні елементи',lead:'Колір профілю, фактури та шпроси для узгодженого вигляду вікон і фасаду.',source:'https://luvin.ua/uk/catalog/vikna-zi-shprosamy/',points:['Колір обираємо за зразком.','Малюнок шпросів погоджуємо до виготовлення склопакета.'],variants:[{name:'Ламінація профілю',description:'Однотонні й деревоподібні декори для внутрішнього та зовнішнього боку.',specifications:['Вибір сторони оздоблення','Узгодження кольору ручок'],source:'https://luvin.ua/uk/catalog/metaloplastykove-vikno-luvin-comfort/'},{name:'Декоративні шпроси',image:'/images/catalog/decor-window.jpg',description:'Додатковий малюнок у склінні для класичної або індивідуальної архітектури.',specifications:['Ескіз поділу скла','Колір і ширина планок'],source:'https://luvin.ua/uk/catalog/vikna-zi-shprosamy/'}]},
  'replacement-parts': {name:'Запасні частини',lead:'Сумісні деталі для ремонту й обслуговування ваших вікон. Почнемо з фото та маркування.',source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',points:['Підбір за виробником, серією та розмірами.','Наявність старих серій уточнюємо перед замовленням.'],variants:[{name:'Ручки та декоративні накладки',description:'Допоможемо визначити потрібне кріплення й колір.',specifications:['Фото деталі','Розміри та кількість'],source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/'},{name:'Ущільнення та механізми',description:'Підбираємо за формою посадки й маркуванням системи.',specifications:['Зразок або переріз ущільнювача','Маркування фурнітури'],source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/'}]},
  'sensors': {
    name: 'Розумні датчики',
    lead: 'Датчики концентрації CO₂ та стану стулки для різних завдань. Тип сенсора й можливості інтеграції підбираємо окремо.',
    source: 'https://luvin.ua/uk/catalog/datchyk-kontroliu/',
    points: [
      'Вимірювання CO₂ допомагає визначити потребу в провітрюванні.',
      'Передавання стану вікна до сумісного контролера.',
      'Сценарії взаємодії з опаленням погоджуємо за можливостями системи.'
    ],
    variants: [
      {
        name: 'Датчик контролю вуглекислого газу (CO2)',
        image: '/images/catalog/co2-sensor.jpg',
        description: 'Моніторить рівень CO2 в приміщенні та може давати команду системі провітрювання.',
        specifications: [
          'Своєчасне інформування про необхідність провітрювання',
          'Керування сумісним приводом через відповідний контролер',
          'Вибір місця встановлення відповідно до інструкції'
        ],
        source: 'https://luvin.ua/uk/catalog/datchyk-kontroliu-vuhlekysloho-hazu-v-prymishchenni/'
      },
      {
        name: 'Магнітоконтактні датчики контролю',
        image: '/images/catalog/window-sensor.jpg',
        description: 'Сенсори, які монтуються в раму та стулку для фіксації стану вікна.',
        specifications: [
          'Спосіб встановлення залежить від моделі сенсора',
          'Передавання даних у сумісну систему керування',
          'Сценарій вимкнення кондиціонера — за підтримки контролера'
        ],
        source: 'https://luvin.ua/uk/catalog/datchyk-kontroliu/'
      }
    ]
  }
};
