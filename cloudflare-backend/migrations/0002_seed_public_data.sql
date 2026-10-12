INSERT INTO prices(category,key,label,value_micros,unit) VALUES
('base','area','Базова ціна за м²',3500000000,'UAH/m2'),
('base','minimum','Мінімальна ціна',3000000000,'UAH'),
('construction','fixed','Глухе',1000000,'coefficient'),
('construction','single','Одностулкове',1050000,'coefficient'),
('construction','double','Двостулкове',1120000,'coefficient'),
('construction','triple','Тристулкове',1200000,'coefficient'),
('profile','grand-pro','Grand Pro · 72 мм',1000000,'coefficient'),
('profile','comfort','Comfort · 70 мм',1100000,'coefficient'),
('profile','comfort-pro','Comfort Pro · 76 мм',1180000,'coefficient'),
('glass','standard','Стандартний',1000000,'coefficient'),
('glass','energy_saving','Енергозберігаючий',1120000,'coefficient'),
('glass','solar_control','Сонцезахисний',1250000,'coefficient'),
('opening','fixed','Глухе',0,'UAH'),
('opening','turn','Поворотне',1000000000,'UAH'),
('opening','tilt_turn','Поворотно-відкидне',1400000000,'UAH'),
('accessory','warm_edge','Тепла рамка',450000000,'UAH'),
('accessory','child_lock','Дитячий замок',350000000,'UAH'),
('accessory','upgraded_hardware','Посилена фурнітура',1200000000,'UAH'),
('accessory','mosquito_net','Москітна сітка',850000000,'UAH'),
('accessory','window_sill','Підвіконня',600000000,'UAH'),
('accessory','exterior_sill','Відлив',400000000,'UAH');

INSERT INTO contacts(key,value,kind) VALUES
('phone','+380 67 424 33 25','phone'),
('telegram','tg://resolve?phone=%2B380674243325','url'),
('viber','viber://chat?number=%2B380674243325','url'),
('email','vikora.info@gmail.com','email'),
('address',NULL,'address');
