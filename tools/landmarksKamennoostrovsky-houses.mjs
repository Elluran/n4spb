// tools/landmarksKamennoostrovsky-houses.mjs - writes docs/research/kamennoostrovsky-houses.json: one record per OSM building that fronts Kamennoostrovsky pr. or Bolshoy pr. P. S. inside the
// play rectangles P1 (north of Kronverksky pr.) / P3 / P4.  Measured fields come from the baked data (src/world/data/city.js: footprint, area, levels, centroid, the length of the walls that face the
// avenue) and from the raw tags (data/osm-raw/buildings.json: start_date, architect, name, building:colour, height, building:architecture ...); the researched fields come from the CURATED table
// below (ru.wikipedia "Каменноостровский проспект" / "Большой проспект Петроградской стороны" house lists, read 2026-10-06, and the Commons photos opened for docs/research/kamennoostrovsky.md).
//   node tools/landmarksKamennoostrovsky-houses.mjs            -> docs/research/kamennoostrovsky-houses.json + a summary
// conf: H = photo opened + source, M = source text only (year / architect / style from the house lists; colour not seen), L = nothing but OSM.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const C = await imp('src/world/data/city.js');
const L = await imp('src/world/layout.js');
const { ringEdges } = await imp('src/world/landmarksKamennoostrovsky/kit.js');
const rawFile = path.join(root, 'data/osm-raw/buildings.json');
const rawBy = new Map();
if (fs.existsSync(rawFile)) for (const e of JSON.parse(fs.readFileSync(rawFile, 'utf8')).elements) rawBy.set((e.type === 'way' ? 'w' : e.type === 'relation' ? 'r' : 'n') + e.id, e.tags || {});

const KAM = 'Каменноостровский проспект', BOL = 'Большой проспект П.С.';
// style -> what the generic grammar should fall back on when the colour was not seen
const STYLE = {
  nordic: { hint: 'Northern Modern: grey / grey-beige roughcast, rough granite or talc-stone socle, small-pane windows of many shapes, bay windows, steep gables and tents', wallGuess: '#b3a792', socle: 'rough granite' },
  nouveau: { hint: 'Art Nouveau: cream / ochre / olive stucco with glazed-tile inserts and floral relief, bay windows, shaped gables, iron grilles', wallGuess: '#d6c8a4', socle: 'granite slabs' },
  neoclassic: { hint: 'neoclassical revival 1908-16: grey stone-coloured terrazzo or yellow with a white giant order, rusticated base, balustrades', wallGuess: '#bcb9ad', socle: 'granite' },
  eclectic: { hint: 'late eclectic tenement 1880-1905: ochre / peach / pink stucco, white hoods and string courses, iron balconies', wallGuess: '#d9b38a', socle: 'limestone / plaster' },
  classic: { hint: 'late classicism: yellow with white trim, low', wallGuess: '#e3cf8f', socle: 'limestone' },
  constructivism: { hint: 'constructivism 1929-34: plain grey plaster, ribbon windows, rounded corners', wallGuess: '#b9b6ab', socle: 'plaster' },
  stalin: { hint: 'Soviet neoclassicism 1949-56: sand / peach, rusticated two-storey base, arched shop windows, heavy cornice', wallGuess: '#d8b594', socle: 'granite' },
  modern: { hint: 'post-1960 infill: stone slab or glass', wallGuess: '#a8a192', socle: 'granite slabs' },
};
// CURATED: key = '<street initial K|B> <house number as mapped in addr:housenumber or the OSM id>'
const T = (year, architect, style, name, o = {}) => ({ year, architect, style, name, ...o });
const CUR = {
  // ---------------------------------------------------------------- Kamennoostrovsky pr., even side
  'K 2': T('1949-1951', 'О. И. Гурьев, В. М. Фромзель', 'stalin', 'Жилой дом (за памятником Горькому)', { notes: 'plavno izognutyy fasad; the Gorky monument stands in front (sight-troitskaya)', features: 'curved front' }),
  'K 4': T('1899', 'О. Л. Игнатович', 'eclectic', null),
  'K 6': T('1904', 'В. А. Липский', 'eclectic', 'Дом А. П. Жигунова', { notes: 'rebuilt inside 1946-47, facade kept' }),
  'K 8': T('1903', 'В. П. Цейдлер', 'nouveau', 'Дом А. И. Эстер (Цеховой)'),
  'K 10': T('1905-1906', 'Д. А. Крыжановский, П. М. Мульханов', 'nouveau', 'Доходный дом Г. А. Александрова · «Ленфильм»', { wall: '#d9cdb0', conf: 'H', photos: ['61_lenfilm_1012.jpg', '60_lenfilm_main.jpg'], features: 'three-sided bay windows over two floors, stepped attics, brick-ochre ornament bands; the Lenfilm studio stands behind the garden: ochre #e0b34c building with a white four-column Corinthian portico and the word ЛЕНФИЛЬМ over the door', notes: 'first film show in Russia 4 May 1896 in the Aquarium garden theatre; NOT modelled by landmarksKamennoostrovsky: a candidate for a later pass' }),
  'K 12': T('1905-1906', 'Д. А. Крыжановский, П. М. Мульханов', 'nouveau', 'Доходный дом Г. А. Александрова', { wall: '#d9cdb0', conf: 'H', photos: ['61_lenfilm_1012.jpg'], features: 'bay windows, stepped attics, ochre brick bands' }),
  'K 14': T('1934', 'Д. Г. Фомичёв', 'constructivism', 'Дом работников искусств (РЖСКТ)', { notes: 'memorial plaques: Petrov-Vodkin, Pakhomov; Shostakovich lived here 1935-37' }),
  'K 20': T('1909-1910', 'Н. Ф. Селихов', 'neoclassic', 'Доходный дом (правая часть № 20)', { notes: 'not the Gorbov house (that is ul. Mira 10, modelled)' }),
  'K 22': T('1932', null, 'constructivism', null, { notes: 'ground floor cladding of 1979' }),
  'B w52104044': T('1910-1912', 'А. С. Хренов', 'neoclassic', 'Дом генерала А. Д. Мартынова (Каменноостровский, 22 / Б. Монетная, 11)'),
  'B w59965741': T('1896-1897, 1907-1912', 'Л. Н. Бенуа; В. М. Андросов', 'eclectic', 'Дом Е. Ц. Кавоса (Каменноостровский, 24 / Б. Монетная, 10)', { features: 'majolica panels, brick-and-plaster facade' }),
  'K 24': T('1901, 1910-1911', 'В. А. Владычанский; И. А. Претро', 'nouveau', 'Дом М. Э. Клейнмихель (№ 24а)', { notes: 'Mandelstam lived here 1916-17' }),
  'B r1651997': T('1898-1900', 'В. П. Цейдлер', 'eclectic', 'Дом Э. Г. Шведерского (Каменноостровский, 32 / Б. Пушкарская, 47)', { notes: 'faces the Andrey Petrov garden; gramophone museum' }),
  'K 40': T('2000s', null, 'modern', 'Бизнес-центр «Каменноостровский»'),
  'K 40А': T('2000s', null, 'modern', null),
  'K 42': T('1931-1938', 'Е. А. Левинсон, В. О. Мунц', 'constructivism', 'Дворец культуры имени Ленсовета', { wall: '#b5b2a8', conf: 'M', features: 'a long grey front with a tall glazed stair tower, ribbon windows; hall block behind', notes: 'NOT modelled by landmarksKamennoostrovsky (budget): a candidate for a later pass' }),
  'K 42Б': T('1952', 'В. Ф. Белов, А. А. Лейман', 'stalin', null, { notes: 'main front on ploshchad Shevchenko' }),
  // ---------------------------------------------------------------- Kamennoostrovsky pr., odd side
  'K 5 литБ': T('1898', 'Э. Ф. Виррих', 'eclectic', 'Особняк С. Ю. Витте (детская музыкальная школа им. Андрея Петрова)', { features: 'two-storey mansion' }),
  'K 9/2': T('1911-1912', 'М. С. Лялевич (скульптор Я. А. Троупянский)', 'neoclassic', 'Дом Д. В. Быховского', { features: 'alternating avant-corps and arcades, Tuscan pilasters on the base' }),
  'K 11': T('1886, 1896', 'А. А. Ашемур', 'eclectic', 'Контора механического завода', { features: 'three storeys' }),
  'K 17': T('1956', 'О. И. Гурьев, В. М. Фромзель', 'stalin', null, { notes: 'pylons flattened during the campaign against "excesses"; A. Raikin lived here 1956-87 (plaque)' }),
  'K 21': T('1831-1834', 'Л. И. Шарлемань', 'classic', 'Александровский лицей', { features: 'set back behind a garden with an iron fence' }),
  'K 25/2': T('1952', 'О. И. Гурьев, В. М. Фромзель, К. А. Гербер', 'stalin', 'Дом преподавателей вузов'),
  'K 27': T('1910-1912', 'Н. Алексеев', 'neoclassic', 'Дом Е. Ф. Лазаревой (№ 27а)'),
  'K 29': T('1912-1914', 'И. И. Долгинов', 'neoclassic', 'Дом А. П. Жигунова', { notes: 'blockade bakery plaque' }),
  'K 39': T('1914-1916 (завершён 1951)', 'А. П. Вайтенс', 'neoclassic', 'Доходный дом Ф. Ф. Нидермейера'),
  'K 41': T('1970', 'Е. А. Левинсон, Т. В. Болдырева, В. А. Матвеев', 'modern', null),
  // ---------------------------------------------------------------- Bolshoy pr. P. S., odd side
  'B 29/2 лит А': T('1844-1845 (надстроен в 1950-х)', 'А. П. Гемилиан', 'classic', 'Дом И. А. Аверина'),
  'B 31': T('1908-1910', 'П. Н. Батуев', 'nouveau', null),
  'B 33': T('1882-1883', 'П. О. Осипов', 'eclectic', null),
  'B 33А': T('1900-1901', 'П. М. Мульханов', 'eclectic', null),
  'B 35': T('1913 (реконструкция 2000-х)', 'Н. А. Бреев', 'eclectic', 'Кинотеатр «Молния» / «Мираж Синема»'),
  'B 37': T('1837, 1883-1884, воссоздан в 2007', 'Е. И. Мартынов; А. И. Аккерман; Е. Герасимов', 'eclectic', 'Введенская гимназия (отель «Введенский»)', { notes: 'A. Blok studied here 1891-98; a nine-storey block behind the recreated front' }),
  'B 39': T('1912-1913', 'Ф. И. Лидваль, Д. Д. Смирнов', 'neoclassic', 'Дом С. М. Липавского'),
  'B 43': T('1901-1902', 'Д. А. Крыжановский', 'nouveau', null, { features: 'bay windows that end in balconies with small Doric columns, pyramid tops' }),
  'B 45': T('1900-1901', 'Н. Н. Никонов', 'eclectic', 'Собственный дом Н. Н. Никонова', { features: 'Russian-style motifs, glazed ceramics' }),
  'B 49/18': T('1902-1903', 'П. Ю. Сюзор', 'eclectic', 'Дом П. Т. Бадаева', { features: 'rounded corner, towers in the middle of both fronts (the corner tower is lost)' }),
  'B 51/9': T('1898-1899', 'П. И. Гилёв', 'eclectic', 'Дом А. И. Седовой'),
  'B 55/6': T('1912', 'Э. А. Густавсон', 'nouveau', 'Торговый дом товарищества «Скороход»', { features: 'three storeys, large shop windows' }),
  'B 57/1': T('1910-1913', 'И. И. Долгинов', 'neoclassic', 'Дом Б. О. Урвича'),
  'B 59': T('1899, 1902 (мансарда 2007)', 'И. И. Бургазлиев', 'eclectic', null),
  'B 61/3': T('1899-1901', 'М. Д. Розензон', 'eclectic', null),
  'B 63': T('1904', 'П. М. Мульханов', 'eclectic', null),
  'B 65': T('1912-1913', 'А. Ф. Барановский, Н. Ф. Прокопович', 'neoclassic', 'Дом А. В. Виноградова'),
  'B 69': T('1910-1911', 'Д. Д. Устругов', 'nouveau', 'Дом И. Ф. Алюшинского', { features: 'corner tower bay toward Ordinarnaya ul., Gothic motifs', photos: ['64_aly69.jpg'] }),
  'B 79': T('1910-1911', 'С. С. Корвин-Круковский', 'neoclassic', 'Дом К. М. Соколовского'),
  'B r2139267': T('1910-1911', 'К. И. Розенштейн, А. Я. Родионов', 'neoclassic', 'Дом Д. М. Гончарова (Большой, 81 / Петропавловская, 6)'),
  'B r269389': T('1911', 'В. К. Вейс', 'nouveau', 'Дом А. Д. Барановской (Большой, 83 / Петропавловская, 8)', { features: 'round corner towers' }),
  // ---------------------------------------------------------------- Bolshoy pr. P. S., even side
  'B 38-40': T('надстроен в 1912', 'Д. А. Крыжановский', 'nouveau', null, { features: 'tile cladding, abstract triangle ornament, cut corner with fluted Corinthian pilasters, floral relief' }),
  'B 42': T('1878-1879', 'В. Шаламов', 'eclectic', 'Особняк А. М. Васильева (детская школа искусств)', { features: 'two storeys, relief front' }),
  'B 46': T('1901, 1905', 'П. М. Мульханов', 'eclectic', null),
  'B 48': T('2000-е', null, 'modern', 'Бизнес-центр «Орбита»'),
  'B w54830303': T('1839-1840', 'А. М. Куци', 'classic', 'Дом А. Лукина (Большой, 50 / Шамшева, 5)', { features: 'three storeys' }),
  'B w54830304': T('1875-1876, 1893-1909', 'П. О. Осипов; В. Р. Курзанов; Г. Г. фон Голи', 'eclectic', 'Большой, 52—54 / Гатчинская, 2'),
  'B r1262960': T('1899, 1904, 1911', 'О. Л. Игнатович; И. Б. Калиберда; И. И. Долгинов', 'eclectic', 'Дом А. Пуни (Большой, 56 / Гатчинская, 1)', { notes: 'the flat of Ivan Puni and Ksenia Boguslavskaya on the sixth floor (1913-15)' }),
  'B 58': T('2003-2005', 'А. В. Титов', 'modern', 'Торговый центр'),
  'B r2012177': T('1898, 1914', 'А. Н. Веретенников; Г. Г. фон Голи', 'neoclassic', 'Дом Д. Л. Парфёнова (Большой, 64—66)'),
  'B 70-72': T('1912-1913', 'Д. А. Крыжановский, А. А. Стаборовский', 'neoclassic', 'Дом Ф. Ф. Утемана'),
  'B 74': T('1912-1913', 'В. В. Шауб', 'neoclassic', 'Дом А. А. Антоновой (кинотеатр «Свет»)', { features: 'seven storeys, the seventh a mansard; two courtyards', photos: ['74_antonova74.jpg'] }),
  'B 76-78': T('1903-1905', 'Г. Д. Гримм', 'nouveau', 'Дом Ведомства учреждений императрицы Марии'),
  'B 80': T('1904', 'С. А. Баранкеев', 'eclectic', null),
  'B 82': T('1910', 'А. Ф. Барановский', 'nouveau', null),
  'B 84': T('2009', null, 'modern', null),
  'B 86': T('1880-е, 1902, 1910', 'И. И. Радике; И. И. Соколов; М. А. Сонгайло', 'eclectic', 'Дом Г. А. Тиктина'),
  'B 88': T('1912 (восстановлен после 1943)', 'С. Г. Бродский', 'nouveau', 'Дом Г. Ф. Киселёва'),
  'B 90': T('1899', 'П. М. Мульханов', 'eclectic', null),
  'B 94': T('1952', null, 'stalin', null),
  'B 100': T('1911-1912', 'А. Ф. Нидермейер', 'neoclassic', 'Дом и лечебница М. Кальмейера', { features: 'pilasters and reliefs' }),
  'B 102': T('1912-1914', 'Е. И. Гонцкевич, С. Ю. Красовский, А. Е. Белогруд', 'neoclassic', 'Дом Е. И. Гонцкевича'),
  'B 104': T('1912-1914', 'А. Ф. Бубырь, Н. В. Васильев', 'nordic', 'Дом Р. А. Дидерихса'),
  'B 106': T('1910-1912', 'А. Д. Дальберг, К. К. Кохендерфер', 'nouveau', 'Дом Дальберга и Кохендерфера'),
};
// the houses that landmarksKamennoostrovsky draws itself (facts repeated here so that the table is complete; details in docs/research/kamennoostrovsky.md)
const BUILT = {
  r2139268: T('1913-1915', 'К. И. Розенштейн, А. Е. Белогруд', 'neoclassic', 'Дом с башнями (дом Розенштейна)', { wall: '#ece3cd', trim: '#7f7e7c', features: 'two hexagonal towers, lancet arcade, two bay windows on brackets, roof balustrade, mansard' }),
  w42422601: T('1902-1903', 'В. В. Шауб', 'nouveau', 'Дом К. Х. Кельдаля', { wall: '#ece8dc', trim: '#b9685c', features: 'brick-red rough panels, majolica band, horseshoe gables, clock tower with a green dome' }),
  r1267606: T('1905-1906', 'В. В. Шауб', 'nouveau', 'Дом Э. К. Липгарта', { wall: '#b7b8ad', trim: '#d8d6c8', features: 'round corner tower with a lantern and a green onion spire, studio window' }),
  r1267607: T('1899-1901', 'А. И. Ковшаров', 'eclectic', 'Дом Г. Ф. Лепенберга', { wall: '#d6a877', trim: '#efe3cb', features: 'green scale mansard' }),
  w52104048: T('1901-1902', 'В. В. Шауб', 'nouveau', 'Дом М. М. Горбова', { wall: '#cbbd9a', trim: '#e6dfca', features: 'neo-baroque gable, corner turret with a silver cupola, tall tower with a bell spire' }),
  w27046419: T('1952', 'О. И. Гурьев, А. П. Щербёнок', 'stalin', 'Каменноостровский, 15', { wall: '#dba98b', trim: '#eedfc6', features: 'arched ground floor, attic with a cartouche' }),
  r1249813: T('1910-1911', 'В. И. Ван-дер-Гюхт', 'nouveau', 'Дом В. Г. и О. М. Чубаковых', { wall: '#d8b3a6', trim: '#ddd5c6', features: 'round corner, arcaded belvedere with a dark dome' }),
  w163290692: T('1903-1904', 'П. М. Мульханов', 'eclectic', 'Дом В. М. Корзинина', { wall: '#c98877', trim: '#ecdcc6', features: 'concave square front, two corner bay turrets' }),
  r1257106: T('1910-1911', 'Д. А. Крыжановский', 'neoclassic', 'Дом Б. С. Майзель', { wall: '#e2bfa4', trim: '#f0e2cd', features: 'semicircular gable toward the square' }),
  r1256096: T('1963-1968', 'А. К. Андреев, Е. А. Левинсон, Я. Е. Москаленко, В. И. Акатов', 'modern', 'Дом мод · вестибюль станции метро «Петроградская»', { wall: '#a8a192', trim: '#d9d6cc' }),
  r1256097: T('1963-1968', null, 'modern', 'Дом мод (корпус Д)', { wall: '#a8a192' }),
  w40260868: T('1830-е, 1893-1896', 'Л. Я. Тиблен; В. В. Шауб', 'eclectic', 'Женский благотворительный институт принцессы Терезии Ольденбургской (дворец детского творчества)', { wall: '#dea88f', trim: '#eedcc8', features: 'low wings, tall arched windows' }),
  r4080836: T('1912-1914', 'К. И. Розенштейн, А. Е. Белогруд', 'neoclassic', 'Дом Розенштейна (Большой, 77)', { wall: '#55524f', trim: '#d7b46c', features: 'six giant rusticated columns, ochre attic with niches, six statues' }),
  r3570513: T('1906-1907', 'И. А. Претро', 'nordic', 'Дом Т. Н. Путиловой («Дом с совами»)', { wall: '#b5a792', trim: '#8d8b88', features: 'granite socle with pointed arches, owl portal, round corner bay with the eagle, twin gables, zinc tents' }),
  r1263723: T('1911-1914', 'Л. Н. Бенуа, Ю. Ю. Бенуа, А. Н. Бенуа, А. И. Гунст', 'neoclassic', 'Дом Бенуа (дом Первого Российского страхового общества)', { wall: '#b8b5a9', trim: '#c8c5ba', features: 'giant order on the two lower floors, balustrades, court of honour' }),
  r1263830: T('1911-1912', 'С. И. Минаш', 'neoclassic', 'Дом М. В. Воейковой', { wall: '#e2cd8e', trim: '#efe9da', features: 'rounded corner with giant half-columns, grey rusticated two-storey base' }),
  // second round (region P8 and further fronts)
  r406242: T('1913-1914', 'С. С. Кричинский', 'neoclassic', 'Дом эмира Бухарского', { wall: '#e2ddce', trim: '#ece8dc', features: 'marble front, rough ground floor with banded piers and stone balls, three gate arches, two-storey loggia on columns, giant engaged order on the wings' }),
  w1303547572: T('1931-1938', 'Е. А. Левинсон, В. О. Мунц', 'constructivism', 'Дворец культуры имени Ленсовета (лицевой корпус)', { wall: '#aaa593', trim: '#c6c2b3', features: 'glazed portal, 9 x 3 glazed grid over the shops, square stone tower 31 m at the north end' }),
  w1303547573: T('1931-1938', 'Е. А. Левинсон, В. О. Мунц', 'constructivism', 'Дворец культуры имени Ленсовета (зал)', { wall: '#aaa593' }),
  w1303547574: T('1931-1938', 'Е. А. Левинсон, В. О. Мунц', 'constructivism', 'Дворец культуры имени Ленсовета (кафе, второй ярус)', { wall: '#aaa593', features: 'relief frieze' }),
  w1303547575: T('1931-1938', 'Е. А. Левинсон, В. О. Мунц', 'constructivism', 'Дворец культуры имени Ленсовета (кафе)', { wall: '#aaa593' }),
  r1268688: T('1905-1906; студия 1920-х', 'Д. А. Крыжановский, П. М. Мульханов', 'nouveau', 'Доходный дом Г. А. Александрова (№ 10) · киностудия «Ленфильм»', { wall: '#e6dcc0', trim: '#c98646', features: 'ochre brick bands, bay windows, stepped attics; behind: the ochre #e3b85a studio with the white four-column portico at the end of the garden' }),
  r3419529: T('1905-1906', 'Д. А. Крыжановский, П. М. Мульханов', 'nouveau', 'Доходный дом Г. А. Александрова (№ 12)', { wall: '#e6dcc0', trim: '#c98646', features: 'ochre brick bands, bay windows, stepped attics' }),
  r5986712: T('1911-1912', 'М. С. Лялевич (скульптор Я. А. Троупянский)', 'neoclassic', 'Дом Д. В. Быховского', { wall: '#bdb9ad', trim: '#cbc7bb', features: 'six storeys, arched fourth-floor windows with iron balconies, quoins, relief panels' }),
  w59965741: T('1896-1897, 1907-1912', 'Л. Н. Бенуа; В. М. Андросов', 'eclectic', 'Дом Е. Ц. Кавоса (Каменноостровский, 24 / Б. Монетная, 10)', { wall: '#7d4438', trim: '#cfc6b4', features: 'red brick with pale strips, green majolica frieze, glazed oriel, mansard' }),
  r2142991: T('1910-1911', 'Д. Д. Устругов', 'nouveau', 'Дом И. Ф. Алюшинского', { wall: '#e9e2c4', trim: '#3f9a8c', features: 'round corner tower bay with a pointed helmet dome, turquoise tile panels, dark rough base, shaped gables' }),
  r1248810: T('1902-1903', 'П. Ю. Сюзор', 'eclectic', 'Дом П. Т. Бадаева', { wall: '#e2b48f', trim: '#efe2c8', features: 'two bay windows under pediments, rounded corner, dark-red dome over the avenue front' }),
  r2106382: T('1912-1913', 'В. В. Шауб', 'neoclassic', 'Дом А. А. Антоновой (кинотеатр «Свет»)', { wall: '#b5b1a4', trim: '#c6c2b5', features: 'six storeys and a mansard, giant pilasters, baroque attic' }),
};

// ------------------------------------------------------------------------------------------ candidates
const segsOf = (name) => { const out = []; for (const r of C.ROADS) if (r.name === name) for (let i = 0; i + 3 < r.pts.length; i += 2) out.push([r.pts[i], r.pts[i + 1], r.pts[i + 2], r.pts[i + 3]]); return out; };
const SEG = { K: segsOf(KAM), B: segsOf(BOL) };
const dseg = (px, pz, s) => { const dx = s[2] - s[0], dz = s[3] - s[1], t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (pz - s[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - s[0] - dx * t, pz - s[1] - dz * t); };
const distTo = (k, x, z) => { let d = 1e9; for (const s of SEG[k]) d = Math.min(d, dseg(x, z, s)); return d; };
const LAT0 = 59.932421 * Math.PI / 180, KY = 111132.954 - 559.822 * Math.cos(2 * LAT0) + 1.175 * Math.cos(4 * LAT0), KX = 111412.84 * Math.cos(LAT0) - 93.5 * Math.cos(3 * LAT0) + 0.118 * Math.cos(5 * LAT0);
const inScope = (b) => (b.cx > -2450 && b.cx < -1500 && b.cz < -2700 && b.cz > -3900) || (b.cx > -3400 && b.cx <= -1500 && b.cz <= -2800 && b.cz > -3900) || (b.cx > -2700 && b.cx < -2000 && b.cz <= -3900 && b.cz > -4260);   // + region P8: both avenues to the Karpovka

const out = [];
for (const b of C.BUILDINGS) {
  if ((b.part && !BUILT[b.id]) || b.cx === undefined || !inScope(b) || b.area < 120) continue;
  // frontage: the length of the outer walls that look at an avenue from less than 24 m
  const front = { K: 0, B: 0 };
  for (const p of b.polys) for (const e of ringEdges(p, 0.3)) {
    if (e.hole) continue;
    const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2;
    for (const k of ['K', 'B']) { const d0 = distTo(k, mx, mz), d1 = distTo(k, mx + e.n[0] * 4, mz + e.n[1] * 4); if (d0 < 24 && d1 < d0 - 2.5 && !L.insideBuilding(mx + e.n[0] * 3, mz + e.n[1] * 3)) front[k] += e.len; }
  }
  const street = b.addr && b.addr.street === KAM ? 'K' : b.addr && b.addr.street === BOL ? 'B' : front.K >= front.B ? 'K' : 'B';
  const setBack = b.addr && (b.addr.street === KAM || b.addr.street === BOL) && b.area > 800 && distTo(b.addr.street === KAM ? 'K' : 'B', b.cx, b.cz) < 130;   // a house behind a front garden (the Lyceum)
  if (front.K + front.B < 5 && !setBack) continue;
  const t = rawBy.get(b.id) || {};
  const no = b.addr ? b.addr.no : null;
  const cur = BUILT[b.id] || CUR[`${street} ${b.addr && (b.addr.street === KAM || b.addr.street === BOL) ? no : b.id}`] || CUR[`B ${b.id}`] || CUR[`K ${b.id}`] || null;
  const st = cur && STYLE[cur.style];
  const claimed = L.claimedBy(b.id);
  const num = parseInt(no, 10);
  const ring = []; for (let i = 0; i < b.polys[0].o.length; i += 2) ring.push([b.polys[0].o[i], b.polys[0].o[i + 1]]);
  out.push({
    addr: b.addr ? `${b.addr.street}, ${b.addr.no}` : null,
    name: (cur && cur.name) || b.name || t.name || null,
    osm: b.id, street: street === 'K' ? KAM : BOL, side: b.addr && Number.isFinite(num) && (b.addr.street === KAM || b.addr.street === BOL) ? (num % 2 ? 'odd' : 'even') : null,
    x: Math.round(b.cx * 10) / 10, z: Math.round(b.cz * 10) / 10, lat: +(59.932421 - b.cz / KY).toFixed(6), lon: +(30.351279 + b.cx / KX).toFixed(6),
    frontage_m: { kamennoostrovsky: Math.round(front.K), bolshoy: Math.round(front.B) },
    storeys: b.levels ?? null, storeysSource: b.levels ? 'OSM building:levels' : null, hCornice: Math.round(L.heightOf(b) * 10) / 10, hSource: b.hSrc === 'height' ? 'OSM height' : 'layout.heightOf (era table)',
    year: (cur && cur.year) || b.startDate || t.start_date || null, architect: (cur && cur.architect) || t.architect || null,
    style: cur ? cur.style : null, styleHint: st ? st.hint : null,
    wall: (cur && cur.wall) || b.colour || t['building:colour'] || null, wallGuess: cur && cur.wall ? null : st ? st.wallGuess : null, trim: (cur && cur.trim) || null,
    socle: st ? st.socle : null, roof: b.roofColour || t['roof:colour'] || null,
    features: (cur && cur.features) || null, shop: front.K + front.B > 12 && (b.levels || 5) >= 3 ? 'shop floor on the avenue front (generic)' : null,
    notes: (cur && cur.notes) || null,
    conf: BUILT[b.id] ? 'H' : cur ? (cur.conf || 'M') : 'L', photos: (cur && cur.photos) || [],
    drawnBy: claimed || (b.parent && L.claimedBy(b.parent)) || 'city',
    osmTags: { levels: b.levels ?? null, start_date: t.start_date || null, architect: t.architect || null, name: t.name || null, colour: t['building:colour'] || null, height: t.height || null, architecture: t['building:architecture'] || null, heritage: t.heritage || null, wikidata: b.wikidata || t.wikidata || null, building: b.kind },
    footprintArea: b.area, footprint: ring.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]),
  });
}
out.sort((a, b) => (a.street === b.street ? b.z - a.z : a.street < b.street ? -1 : 1));
fs.writeFileSync(path.join(root, 'docs/research/kamennoostrovsky-houses.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');
const by = (f) => out.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log('records', out.length, '| by street', JSON.stringify(by((r) => (r.street === KAM ? 'Kamennoostrovsky' : 'Bolshoy'))), '| conf', JSON.stringify(by((r) => r.conf)), '| drawnBy', JSON.stringify(by((r) => r.drawnBy)));
const unused = Object.keys(CUR).filter((k) => !out.some((r) => r.name === CUR[k].name && CUR[k].name) && !out.some((r) => r.year === CUR[k].year && r.architect === CUR[k].architect));
if (unused.length) console.log('curated keys without a building:', unused.join(' | '));
if (process.argv.includes('--list')) for (const r of out) console.log(r.osm.padEnd(12), (r.addr || '-').padEnd(46), String(r.storeys ?? '-').padEnd(3), r.conf, r.drawnBy.padEnd(26), r.year || '', '|', r.architect || '');
