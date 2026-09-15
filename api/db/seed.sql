-- Grand Sud (stopdesk mostly unavailable in these — adjust to your carrier)
INSERT INTO wilayas (code, name_fr, name_ar, fee_domicile, fee_stopdesk) VALUES
(11,'Tamanrasset','تمنراست',1100,NULL),
(33,'Illizi','إليزي',1200,NULL),
(37,'Tindouf','تندوف',1200,NULL),
(52,'Bordj Baji Mokhtar','برج باجي مختار',1200,NULL),
(56,'Djanet','جانت',1200,NULL),
(57,'In Salah','عين صالح',1100,NULL),
(58,'In Guezzam','عين قزام',1200,NULL),
( 1,'Adrar','أدرار',1000,NULL),
( 8,'Béchar','بشار',900,NULL),
(54,'Timimoun','تيميمون',1000,NULL),
(53,'Béni Abbès','بني عباس',900,NULL),
(50,'El Meniaa','المنيعة',900,NULL),
(49,'El M''Ghair','المغير',800,NULL),
(55,'Touggourt','تقرت',800,450)
ON CONFLICT (code) DO UPDATE
SET name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar,
    fee_domicile = EXCLUDED.fee_domicile, fee_stopdesk = EXCLUDED.fee_stopdesk;

-- Sud proche / Hauts Plateaux
INSERT INTO wilayas (code, name_fr, name_ar, fee_domicile, fee_stopdesk) VALUES
( 3,'Laghouat','الأغواط',600,350),
( 4,'Oum El Bouaghi','أم البواقي',600,350),
( 7,'Biskra','بسكرة',600,350),
(12,'Tébessa','تبسة',600,350),
(14,'Tiaret','تيارت',600,350),
(17,'Djelfa','الجلفة',600,350),
(20,'Saïda','سعيدة',600,350),
(28,'M''Sila','المسيلة',600,350),
(30,'Ouargla','ورقلة',700,450),
(32,'El Bayadh','البيض',700,400),
(39,'El Oued','الوادي',700,450),
(40,'Khenchela','خنشلة',600,350),
(41,'Souk Ahras','سوق أهراس',600,350),
(45,'Naâma','النعامة',700,400),
(47,'Ghardaïa','غرداية',700,450),
(51,'Ouled Djellal','أولاد جلال',700,450),
(38,'Tissemsilt','تيسمسيلت',600,350)
ON CONFLICT (code) DO UPDATE
SET name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar,
    fee_domicile = EXCLUDED.fee_domicile, fee_stopdesk = EXCLUDED.fee_stopdesk;

-- Grand Alger
INSERT INTO wilayas (code, name_fr, name_ar, fee_domicile, fee_stopdesk) VALUES
(16,'Alger','الجزائر',400,250),
( 9,'Blida','البليدة',450,300),
(35,'Boumerdès','بومرداس',450,300),
(42,'Tipaza','تيبازة',450,300)
ON CONFLICT (code) DO UPDATE
SET name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar,
    fee_domicile = EXCLUDED.fee_domicile, fee_stopdesk = EXCLUDED.fee_stopdesk;

-- Nord
INSERT INTO wilayas (code, name_fr, name_ar, fee_domicile, fee_stopdesk) VALUES
( 2,'Chlef','الشلف',500,300),
( 5,'Batna','باتنة',500,300),
( 6,'Béjaïa','بجاية',500,300),
(10,'Bouira','البويرة',500,300),
(13,'Tlemcen','تلمسان',500,300),
(15,'Tizi Ouzou','تيزي وزو',500,300),
(18,'Jijel','جيجل',500,300),
(19,'Sétif','سطيف',500,300),
(21,'Skikda','سكيكدة',500,300),
(22,'Sidi Bel Abbès','سيدي بلعباس',500,300),
(23,'Annaba','عنابة',500,300),
(24,'Guelma','قالمة',500,300),
(25,'Constantine','قسنطينة',500,300),
(26,'Médéa','المدية',500,300),
(27,'Mostaganem','مستغانم',500,300),
(29,'Mascara','معسكر',500,300),
(31,'Oran','وهران',500,300),
(34,'Bordj Bou Arréridj','برج بوعريريج',500,300),
(36,'El Tarf','الطارف',500,300),
(43,'Mila','ميلة',500,300),
(44,'Aïn Defla','عين الدفلى',500,300),
(46,'Aïn Témouchent','عين تموشنت',500,300),
(48,'Relizane','غليزان',500,300)
ON CONFLICT (code) DO UPDATE
SET name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar,
    fee_domicile = EXCLUDED.fee_domicile, fee_stopdesk = EXCLUDED.fee_stopdesk;

-- Product (images untouched by re-seeding — they get filled in Phase 4)
INSERT INTO products (slug, name_fr, name_ar, tagline_fr, tagline_ar, desc_fr, desc_ar, features, price)
VALUES (
  'sac-magnetique',
  'Sac Magnétique de Salle',
  'الشنتة المغناطيسية للنادي',
  'Restez focus. On garde le reste.',
  'ركّز على تمرينك — والباقي علينا',
  'Téléphone, clés, bouteille : accrochés à la machine, plus rien par terre.',
  'هاتفك، مفاتيحك، قارورتك — معلّقة على الجهاز، لا شيء على الأرض.',
  '[{"fr":"Fixation magnétique puissante — se clipse sur les machines","ar":"قاعدة مغناطيسية قوية — تتمسك بأجهزة النادي"},
    {"fr":"Poche zippée pour téléphone, clés et cartes","ar":"جيب بسحّاب للهاتف والمفاتيح والبطاقات"},
    {"fr":"Porte-bouteille intégré","ar":"حامل قارورة مدمج"},
    {"fr":"Cordon de serrage — accès en une seconde","ar":"حبل سحب — وصول في ثانية"},
    {"fr":"Tissu résistant à la sueur","ar":"قماش مقاوم للعرق"},
    {"fr":"Compact — se glisse dans n''importe quel sac","ar":"حجم مدمج — يدخل في أي حقيبة"}]'::jsonb,
  3900
)
ON CONFLICT (slug) DO UPDATE
SET name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar,
    tagline_fr = EXCLUDED.tagline_fr, tagline_ar = EXCLUDED.tagline_ar,
    desc_fr = EXCLUDED.desc_fr, desc_ar = EXCLUDED.desc_ar,
    features = EXCLUDED.features, price = EXCLUDED.price, active = true;