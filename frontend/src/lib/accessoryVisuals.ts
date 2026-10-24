export const accessoryVisuals: Record<string, {image: string; caption: string; credit?: string; source?: string}> = {
  handles: {image: '/images/accessories/handle.webp', caption: 'Ручка Hoppe Sekustik Toulon'},
  'mosquito-nets': {image: '/images/accessories/net-white.webp', caption: 'Рамкова москітна сітка'},
  'child-locks': {image: '/images/accessories/handle-lock.webp', caption: 'Віконна ручка з ключем'},
  'window-sills': {image: '/images/accessories/sills/sill-kraft-tile.webp', caption: 'Підвіконня Kraft у декорі під дерево', credit: 'LUVIN', source: 'https://luvin.ua/uk/catalog/pidvikonnia-kraft/'},
  hardware: {image: '/images/accessories/hardware.webp', caption: 'Віконна фурнітура'},
  decor: {image: '/images/accessories/decor.webp', caption: 'Декоративне оздоблення профілю'},
  'auto-ventilation': {image: '/images/catalog/auto-ventilation.jpg', caption: 'Приклад системи автоматичного провітрювання', credit:'LUVIN'},
  'sensors': {image: '/images/catalog/co2-sensor.jpg', caption: 'Датчик концентрації CO₂', credit:'LUVIN'},
  ebbs: {image:'/images/catalog/ebbs.webp',caption:'Зовнішній відлив для вікна',source:'https://luvin.ua/uk/catalog-category/dodatkovi-funktsii/',credit:'LUVIN'},
  'opening-limiters': {image:'/images/catalog/hidden-hardware-window.jpg',caption:'Прихована фурнітура з інтегрованим обмежувачем відкривання',credit:'LUVIN',source:'https://luvin.ua/uk/catalog/povnistiu-prykhovana-furnitura/'},
  'security-hardware': {image:'/images/accessories/hardware.webp',caption:'Вузол віконної фурнітури — ілюстрація категорії'},
  glass: {image:'/images/accessories/insulated-glass-unit.png',caption:'Будова двокамерного енергоефективного склопакета',credit:'VIKORA'},
  'replacement-parts': {image:'/images/accessories/handle.webp',caption:'Віконна ручка — приклад змінної деталі'},

};

export const accessoryHighlights = [
  {id: 'handles', name: 'Дотик, який відчувається', text: 'Зручна форма ручки та відтінок, що поєднується з профілем. Підберемо модель під вашу фурнітуру.', tag: 'РУЧКИ'},
  {id: 'mosquito-nets', name: 'Відкрийте вікно літу', text: 'Свіже повітря без комах. Рамкова або дверна сітка за розмірами вашого прорізу.', tag: 'МОСКІТНІ СІТКИ'},
  {id: 'child-locks', name: 'Більше контролю', text: 'Ручка з ключем допомагає обмежити відкривання стулки. Обговоримо сумісне рішення для вашого дому.', tag: 'РУЧКИ З КЛЮЧЕМ'},
  {id: 'window-sills', name: 'Завершений вигляд', text: 'Підвіконня під рослини, улюблену чашку та ваш інтер’єр. Узгодимо глибину, фактуру й торці.', tag: 'ПІДВІКОННЯ'},
];
