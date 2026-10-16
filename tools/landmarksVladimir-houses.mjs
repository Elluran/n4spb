// landmarksVladimir-houses: writes docs/research/vladimir-houses.json = the ORDINARY houses of the west Petrograd side that `landmarksVladimir` does not model (same shape as
// aurora-houses.json / nikolsky-houses.json: the city owner turns it into KNOWN houses): both sides of the beginning of Bolshoy pr. P.S. (Nos. 1-32), pr. Dobrolyubova, Mytninskaya and
// Zhdanovskaya embankments, Blokhina street, Zhdanovskaya street.  Curated entries come from the dossier docs/research/vladimir.md, ru.wikipedia (street articles) and the photos
// refs/vladimir mytn_*; the other addressed buildings of these streets get an entry from the OSM tags only.   node tools/landmarksVladimir-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);
const WIN = { x0: -3990, x1: -2430, z0: -2830, z1: -1680 };
const STREETS = /Добролюбова|Мытнинская|Ждановская|Блохина|Большой проспект|Зоологический переулок/;
const MINE = new Set(['w109067002', 'w117478061', 'w30352230', 'w1390919082', 'w1390919083', 'w1513983337', 'w1390919084', 'w30352025', 'r2277233', 'r9073800']);
const W = 'ru.wikipedia';

const CUR = {
  // ---- Мытнинская набережная (фронт напротив Стрелки; фото refs/vladimir mytn_01..11)
  r6152164: { addr: 'Мытнинская наб., 3', name: 'Доходный дом П. С. Оболенского', storeys: 5, hCornice: 21, style: 'эклектика (необарокко)', era: 'кон. XIX в.', wall: '#e2d2ae', trim: '#f0e8d4', roof: '#7c7f82', conf: 'M', photos: ['mytn_06_3'],
    notes: 'угловой дом на площадь Академика Лихачёва: светлая песочная штукатурка, богатая лепнина наличников, балконы с коваными решётками, мансарда с люкарнами.' },
  w187184861: { addr: 'Мытнинская наб., 5', storeys: 6, hCornice: 23.5, style: 'доходный дом / поздняя эклектика', era: 'нач. XX в.', wall: '#dba488', trim: '#efe3d0', roof: '#8a8d90', conf: 'L', photos: ['mytn_08_likh', 'mytn_01'],
    notes: 'персиково-розовый шестиэтажный дом с мансардой; в панораме с Невы стоит левее дома № 7.' },
  w35131100: { addr: 'Мытнинская наб., 7 / Зоологический пер., 5', storeys: 7, hCornice: 25, style: 'модерн', era: 'нач. XX в.', wall: '#e0a58c', trim: '#f1e4d2', roof: '#9a9da0', conf: 'M', photos: ['mytn_05_7', 'mytn_11'],
    notes: 'лососево-розовый дом со скруглённым угловым эркером под куполком, мансарда со светлой кровлей; первый этаж: магазины. Самый заметный дом фронта, виден со Стрелки.' },
  w85749100: { addr: 'Мытнинская наб., 9', storeys: 5, hCornice: 20, style: 'эклектика', era: 'кон. XIX в.', wall: '#dcc07e', trim: '#efe6cc', roof: '#8a8d90', conf: 'M', photos: ['mytn_04_9'],
    notes: 'охристо-жёлтый пятиэтажный дом с эркером в центре, белые тяги; перед домом ряд стриженых лип.' },
  w35131025: { addr: 'Мытнинская наб., 11', storeys: 6, hCornice: 23.5, style: 'модерн / неоклассика', era: 'нач. XX в.', wall: '#d9c6a4', trim: '#ece2cc', roof: '#6f7376', conf: 'M', photos: ['mytn_02_11'],
    notes: 'бежевый шестиэтажный дом: три полуциркульных аттика с большими арочными окнами мансарды, балконы с решётками, серый гранитный цоколь.' },
  w35130972: { addr: 'Мытнинская наб., 13', storeys: 5, hCornice: 20, style: 'эклектика (классицизирующая)', era: 'втор. пол. XIX в.', wall: '#c9c9c2', trim: '#e6e5dd', roof: '#7c7f82', conf: 'M', photos: ['mytn_03_13'],
    notes: 'серый пятиэтажный дом на углу проспекта Добролюбова: ровная сетка окон в белых наличниках, скошенный угол.' },
  w173528736: { addr: 'Мытнинская наб., 6 (причал)', name: 'Плавучий ресторан-парусник', storeys: 2, hCornice: 8, style: 'реплика трёхмачтового фрегата', era: 'у причала с 2000-х гг.', wall: '#5a3a26', trim: '#d9c79a', roof: '#3a2a20', conf: 'M', photos: ['mytn_09_meteor', 'mytn_11', 'mytn_01'],
    notes: 'деревянный трёхмачтовый корабль-ресторан у причала (в OSM building=ship, colour saddlebrown): тёмно-коричневый корпус, три мачты с реями БЕЗ флагов и вымпелов (правило сцены); виден со Стрелки на фоне домов 7-11.' },
  // ---- проспект Добролюбова
  r1544221: { addr: 'пр. Добролюбова, 1 / Кронверкский пр., 79', storeys: 5, hCornice: 21, style: 'эклектика', era: '1899 [OSM start_date]', wall: null, conf: 'L', notes: 'угловой доходный дом у площади Академика Лихачёва.' },
  w52503472: { addr: 'пр. Добролюбова, 3', storeys: 4, hCornice: 17.5, style: 'доходный дом', era: 'нач. XX в.', conf: 'L', notes: `отмечен «Энциклопедией Санкт-Петербурга» среди заметных домов проспекта [${W} Проспект Добролюбова].` },
  w85749096: { addr: 'пр. Добролюбова, 8', storeys: 8, hCornice: 28, style: 'доходный дом / надстройка', era: 'нач. XX в. + современная реконструкция', conf: 'L', notes: `единственный жилой дом чётной стороны у Биржевого моста; отмечен среди заметных домов проспекта [${W}].` },
  w40047638: { addr: 'пр. Добролюбова, 9', storeys: 5, hCornice: 21, style: 'доходный дом', era: 'нач. XX в.', conf: 'L', notes: `отмечен среди заметных домов проспекта [${W}].` },
  w40047639: { addr: 'пр. Добролюбова, 11', name: 'Бизнес-центр «Добролюбов»', storeys: 6, hCornice: 23, style: 'современный офисный дом в исторической линии', era: '2000-е', wall: '#d8d2c4', conf: 'L', notes: 'офисное здание в ряду доходных домов нечётной стороны.' },
  w40047640: { addr: 'пр. Добролюбова, 13', storeys: 4, hCornice: 17.5, style: 'доходный дом', era: 'нач. XX в.', conf: 'L', notes: `отмечен среди заметных домов проспекта [${W}].` },
  w40047658: { addr: 'пр. Добролюбова, 15', storeys: 4, hCornice: 17.5, style: 'доходный дом', era: 'нач. XX в.', conf: 'L', notes: `отмечен среди заметных домов проспекта [${W}].` },
  r1544009: { addr: 'пр. Добролюбова, 19', storeys: 4, hCornice: 17.5, style: 'доходный дом', era: 'нач. XX в.', conf: 'L', notes: `отмечен среди заметных домов проспекта [${W}]; фасад смотрит на стройплощадку Судебного квартала.` },
  w108814955: { addr: 'пр. Добролюбова, 16 к2', name: 'Бизнес-центр «Арена Холл»', storeys: 7, hCornice: 26, style: 'современный бизнес-центр', era: '2010-е', wall: '#cfd3d6', trim: '#e9eaea', roof: '#8a8f94', conf: 'L', photos: ['yub_03_aerial'],
    notes: 'светлые панели и ленточное остекление, Г-образный корпус между «Юбилейным» и стройплощадкой Дворца танца.' },
  w31027237: { addr: 'пр. Добролюбова, 20 к1', storeys: 3, hCornice: 12, style: 'общественное здание', era: 'XX в.', conf: 'L', photos: ['yub_10'], notes: 'трёхэтажный корпус у входа № 1 в подземный переход станции «Спортивная».' },
  // ---- Большой проспект П.С. (начало)
  r2859632: { addr: 'Большой пр. П.С., 1-3 / ул. Блохина, 33', name: 'Доходный дом Калгина / Тележкина', storeys: 5, hCornice: 21, style: 'модерн', era: '1911-1912 (М. Ф. Еремеев; угловая часть: для купца В. М. Калгина)', conf: 'M',
    notes: `один из первых доходных домов Петроградской стороны, строился поэтапно более 70 лет [${W} Большой проспект П.С.; Улица Блохина]; напротив часовни Александра Невского.` },
  w55413099: { addr: 'Большой пр. П.С., 2 / Ждановская наб., 1', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1896-1900 (В. И. Баранкеев)', conf: 'M', notes: `четырёхэтажный угловой доходный дом; над парадными лепные инициалы «А В» первой владелицы Александры Ванюковой [${W}].` },
  r2700329: { addr: 'Большой пр. П.С., 4', storeys: 5, hCornice: 21, style: 'эклектика', era: '1898-1899 (техн. М. Д. Розензон)', conf: 'M', notes: `[${W}]` },
  r1547262: { addr: 'Большой пр. П.С., 5 / Зверинская ул., 2', name: 'Доходный дом В. Г. Чубакова', storeys: 6, hCornice: 23.5, style: 'модерн', era: '1909-1910 (В. И. Ван-дер-Гюхт)', conf: 'M', notes: `здесь в 1922-1944 гг. жил поэт Н. С. Тихонов [${W}].` },
  w178554146: { addr: 'Большой пр. П.С., 6', name: 'Дом А. И. Угрюмова', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1856-1899 (А. И. Угрюмов)', conf: 'M', notes: `[${W}]` },
  w36438945: { addr: 'Большой пр. П.С., 7', storeys: 5, hCornice: 21, style: 'эклектика', era: '1888 (А. В. Иванов)', conf: 'M', notes: `[${W}]` },
  w36220854: { addr: 'Большой пр. П.С., 9', name: 'Дом И. Бурмейстера', storeys: 3, hCornice: 13, style: 'поздний классицизм', era: '1840-1841 (Е. Т. Цолликофер)', conf: 'M', notes: `[${W}]` },
  w178554147: { addr: 'Большой пр. П.С., 10', storeys: 5, hCornice: 21, style: 'эклектика / модерн', era: 'левая часть перестроена в 1905 (П. М. Мульханов)', conf: 'M', notes: `[${W}]` },
  w36220645: { addr: 'Большой пр. П.С., 11 / Съезжинская ул., 2', name: 'Съезжий дом Петербургской части', storeys: 2, hCornice: 9, style: 'классицизм', era: '1827', wall: '#e2c98c', trim: '#f1ece0', conf: 'M',
    notes: `самое старое здание проспекта: бывшая полицейская и пожарная часть (каланча не сохранилась); пожарная часть работает и теперь [${W}].` },
  r1547268: { addr: 'Большой пр. П.С., 13 / Пионерская ул., 4', name: 'Дом Н. А. Бородулина', storeys: 5, hCornice: 21, style: 'модерн', era: '1901-1902 (А. К. Гаммерштедт)', conf: 'M', notes: `[${W}]` },
  r3117254: { addr: 'Большой пр. П.С., 14 / ул. Красного Курсанта, 2', name: 'Дом П. Панова', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1901-1902 (А. М. Ливен)', conf: 'M', notes: `[${W}]` },
  r2927900: { addr: 'Большой пр. П.С., 16 / ул. Красного Курсанта, 1', name: 'Доходный дом Н. Я. и Ф. Я. Колобовых (левая часть)', storeys: 5, hCornice: 21, style: 'неоклассицизм', era: '1910-е (П. М. Мульханов, Д. А. Крыжановский)', conf: 'M', notes: `[${W}]` },
  r12504711: { addr: 'Большой пр. П.С., 18', name: 'Доходный дом Н. Я. и Ф. Я. Колобовых', storeys: 5, hCornice: 21, style: 'неоклассицизм', era: '1910-е (П. М. Мульханов, Д. А. Крыжановский)', conf: 'M', notes: `большой дом с курдонёром, три части (16, 18а, 18) [${W}].` },
  r1547270: { addr: 'Большой пр. П.С., 17', storeys: 5, hCornice: 21, style: 'модерн', era: '1905 (В. А. Гартман)', conf: 'M', notes: `здесь в 1922-1930 гг. жил Я. С. Друскин [${W}].` },
  r1547271: { addr: 'Большой пр. П.С., 19-21', name: 'Доходный дом И. А. и Ф. А. Корневых', storeys: 5, hCornice: 21, style: 'модерн', era: '1905-1906 (П. М. Мульханов)', conf: 'M', notes: `[${W}]` },
  w59047088: { addr: 'Большой пр. П.С., 20 / Пионерская ул., 6', storeys: 6, hCornice: 23.5, style: 'эклектика', era: '1886 (техн. Н. Н. Бобров), надстроен в 1913 (П. Г. Прокофьев)', conf: 'M', notes: `[${W}]` },
  // ---- Ждановская набережная и улица
  w55413101: { addr: 'Ждановская наб., 3', storeys: 6, hCornice: 23.5, style: 'неоклассицизм', era: '1911-1913 (техн. И. И. Демикелли)', conf: 'M', notes: `здесь жили А. Н. Толстой (1923-1928), Ф. К. Сологуб [${W} Ждановская набережная]; фасад на Ждановку и стадион «Петровский».` },
  w55440261: { addr: 'Ждановская наб., 7', name: 'Дом купцов Сидоровых', storeys: 3, hCornice: 13, style: 'классицизм', era: '1833 (А. М. Болотов), позднее надстроен третьим этажом', conf: 'M', notes: `во дворовом флигеле жили И. И. Введенский и Н. Г. Чернышевский [${W}].` },
  w55440259: { addr: 'Ждановская наб., 9', name: 'Доходный дом А. Э. Мейснера', storeys: 5, hCornice: 21, style: 'модерн', era: '1903 (А. И. Стюнкель)', wall: '#b9b3a8', trim: '#8f8a82', conf: 'M',
    notes: `выразительный северный модерн: гранит в облицовке, львиные маски скрывают вентиляционные отверстия, оригинальные витражи; с 2023 г. объект культурного наследия [${W}].` },
  w55440267: { addr: 'Ждановская наб., 11 / Офицерский пер.', storeys: 5, hCornice: 19, style: 'сталинский неоклассицизм', era: '1950-е', conf: 'M', notes: `во дворе четырёхэтажный дом 11а, где «жил» инженер Лось из «Аэлиты» А. Н. Толстого [${W}].` },
  w37463857: { addr: 'Ждановская ул., 13', name: 'Военно-космическая академия им. А. Ф. Можайского (бывший Второй кадетский корпус)', storeys: 3, hCornice: 15, style: 'классицизм', era: 'кон. XVIII - XIX в.', wall: '#e3c98a', trim: '#f1ece0', roof: '#8a8f94', conf: 'L',
    notes: 'огромное каре с плацем во дворе к северу от стадиона (16 871 м2 в OSM): жёлтые фасады с белыми пилястрами; закрытая территория. Это «второй большой контур» района, не стадион.' },
  // ---- улица Блохина (Улица Блохина, ru.wikipedia)
  w35424399: { addr: 'ул. Блохина, 1 / Кронверкский пр., 75', storeys: 6, hCornice: 23.5, style: 'модерн', era: '1901 (Н. А. Дрягин)', conf: 'M', notes: `[${W}]` },
  w52503476: { addr: 'ул. Блохина, 2 / Кронверкский пр., 77', name: 'Доходный дом Кёнига', storeys: 6, hCornice: 23.5, style: 'модерн', era: '1911-1912 (К. К. Шмидт)', conf: 'M', notes: `здесь жил архитектор А. А. Парланд [${W}].` },
  w52503473: { addr: 'ул. Блохина, 2 / Кронверкский пр., 77', name: 'Доходный дом Кёнига (корпус)', storeys: 6, hCornice: 23.5, style: 'модерн', era: '1911-1912 (К. К. Шмидт)', conf: 'M', notes: `[${W}]` },
  w35424397: { addr: 'ул. Блохина, 3 / Мытнинский пер., 1', name: 'Доходный дом В. Т. Тимофеева', storeys: 6, hCornice: 23.5, style: 'эклектика', era: '1905 (Н. И. Иванов)', conf: 'M', notes: `[${W}]` },
  w52503482: { addr: 'ул. Блохина, 4', name: 'Доходный дом Бурцева', storeys: 6, hCornice: 23.5, style: 'модерн', era: '1905 (П. И. Мульханов)', conf: 'M', notes: `[${W}]` },
  r2435430: { addr: 'ул. Блохина, 5 / Мытнинский пер., 2', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1872 (К. Т. Соловьёв)', conf: 'M', notes: `[${W}]` },
  w52503481: { addr: 'ул. Блохина, 6', name: 'Доходный дом Бурцева', storeys: 5, hCornice: 21, style: 'модерн', era: '1903-1904 (П. И. Мульханов)', conf: 'M', notes: `здесь жил А. Ф. Шорин; на первом этаже был Кулаковский магазин [${W}].` },
  w54356013: { addr: 'ул. Блохина, 7', storeys: 3, hCornice: 13, style: 'классицизм', era: '1877 (Н. А. Газельмейер)', conf: 'M', notes: `[${W}]` },
  w39891287: { addr: 'ул. Блохина, 8', name: 'Бывший ДК «Красный Октябрь» (деловой центр)', storeys: 5, hCornice: 20, style: 'сталинский неоклассицизм', era: '1957, перестроен в 2005', conf: 'M', notes: `[${W}]` },
  w35799793: { addr: 'ул. Блохина, 9', name: 'Бизнес-центр «Кронверк»', storeys: 6, hCornice: 23, style: 'современное офисное здание', era: '2004', conf: 'M', notes: `на месте католической церкви св. Бонифация (1914, снесена в 1940-х) [${W}].` },
  w35799795: { addr: 'ул. Блохина, 11', storeys: 3, hCornice: 13, style: 'модерн', era: '1909 (А. И. Владовский)', conf: 'M', notes: `[${W}]` },
  w39891039: { addr: 'ул. Блохина, 12', name: 'Доходный дом Кандаурова (Лытиковой)', storeys: 5, hCornice: 21, style: 'эклектика', era: '1905 (А. К. Голосуев)', conf: 'M', notes: `[${W}]` },
  w35799801: { addr: 'ул. Блохина, 15', name: 'Жилой дом с котельной «Камчатка»', storeys: 5, hCornice: 19, style: 'сталинский неоклассицизм', era: '1950-е', conf: 'M',
    notes: `в котельной «Камчатка» во дворе в 1986-1988 гг. работал кочегаром Виктор Цой: культовое место ленинградского рока (клуб-музей) [${W}].` },
  w108814966: { addr: 'ул. Блохина, 16', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1891', conf: 'M', notes: `[${W}]` },
  r1544223: { addr: 'ул. Блохина, 17', name: 'Доходный дом военного инженера Н. И. Полешко', storeys: 5, hCornice: 21, style: 'эклектика', era: '1904-1907 (Н. И. Полешко)', conf: 'M', notes: `здесь жили востоковеды В. М. Алексеев, Н. А. Невский, Н. И. Конрад [${W}].` },
  w39891022: { addr: 'ул. Блохина, 18', name: 'Доходный дом Второго Российского страхового общества', storeys: 4, hCornice: 17.5, style: 'модерн', era: '1901-1902 (В. Д. Николя)', conf: 'M', notes: `[${W}]` },
  w36482816: { addr: 'ул. Блохина, 19', name: 'Механический завод Г. М. Пека', storeys: 4, hCornice: 17, style: 'эклектика (кирпичный стиль)', era: '1899 (Н. И. Полешко)', conf: 'M', notes: `[${W}]` },
  r16231280: { addr: 'ул. Блохина, 20 / пер. Талалихина, 7', name: 'Доходный дом Игнатовича', storeys: 5, hCornice: 21, style: 'эклектика', era: '1903-1904 (О. Л. Игнатович)', conf: 'M', notes: `[${W}]; угол сквера у собора.` },
  w36482683: { addr: 'ул. Блохина, 21', storeys: 5, hCornice: 21, style: 'эклектика', era: '1898-1899 (Е. С. Бикарюков)', conf: 'M', notes: `[${W}]` },
  w30352028: { addr: 'ул. Блохина, 22', storeys: 6, hCornice: 23.5, style: 'эклектика', era: '1911 (И. И. Демикелли)', wall: '#d9c9a0', conf: 'M', photos: ['cath_04_aerial'], notes: `сосед собора с востока: светлый шестиэтажный дом с брандмауэром к ограде [${W}].` },
  w36482400: { addr: 'ул. Блохина, 23', name: 'Дом работников Гипромеза', storeys: 5, hCornice: 19, style: 'сталинский неоклассицизм', era: '1955 (Я. О. Свирский)', wall: '#b9b08a', conf: 'M', photos: ['cath_04_aerial'], notes: `[${W}]` },
  r1547264: { addr: 'ул. Блохина, 25', storeys: 4, hCornice: 17.5, style: 'модерн', era: '1898-1899 (С. А. Баранкеев)', wall: '#c98a78', trim: '#eadfcd', conf: 'M', photos: ['cath_04_aerial'], notes: `красно-розовый дом с белым декором напротив северного фасада собора [${W}].` },
  w109067012: { addr: 'ул. Блохина, 27', storeys: 4, hCornice: 17.5, style: 'эклектика', era: '1878-1879 (П. П. Наранович)', wall: '#e6dccb', conf: 'M', photos: ['cath_04_aerial'], notes: `[${W}]` },
  w867024861: { addr: 'ул. Блохина, 29', storeys: 3, hCornice: 13, style: 'эклектика', era: '1851-1852 (А. М. Тверской)', wall: '#e9b9b0', conf: 'M', photos: ['cath_04_aerial'], notes: `розовый трёхэтажный дом напротив колокольни [${W}].` },
  w36475941: { addr: 'ул. Блохина, 31', name: 'Школа № 77 (бывшее училище св. Елены)', storeys: 3, hCornice: 15, style: 'эклектика', era: '1898-1901 (А. И. Шамбахер)', conf: 'M', notes: `в здании была домовая церковь равноапостольных Константина и Елены (ныне актовый зал) [${W}].` },
  w109066965: { addr: 'ул. Блохина, 26 литБ', name: 'Церковный дом Князь-Владимирского собора', storeys: 1, hCornice: 4.5, style: 'служебный флигель', era: 'XIX в.', wall: '#efcb7e', trim: '#f4f1e8', roof: '#b9c0c6', conf: 'M', photos: ['cath_04_aerial'],
    notes: 'одноэтажный жёлтый дом с серой кровлей в северной части ограды собора (воскресная школа, лавка): в цветах собора.' },
};

const out = [];
for (const b of D.BUILDINGS) {
  if (b.part || MINE.has(b.id) || b.cx < WIN.x0 || b.cx > WIN.x1 || b.cz < WIN.z0 || b.cz > WIN.z1) continue;
  const cur = CUR[b.id];
  if (!cur && !(b.addr && STREETS.test(b.addr.street || ''))) continue;
  if ((b.area || 0) < 60 && !cur) continue;
  const c = cur || {}, [lon, lat] = unproj(b.cx, b.cz), o = b.polys[0].o, fp = [];
  for (let i = 0; i < o.length; i += 2) fp.push([Math.round(o[i] * 10) / 10, Math.round(o[i + 1] * 10) / 10]);
  const st = c.storeys ?? b.levels ?? null;
  out.push({
    addr: c.addr || (b.addr ? `${b.addr.street || ''}, ${b.addr.no || ''}`.replace(/^, |, $/g, '') : null), name: c.name ?? b.name ?? null, osm: b.id, scope: 'vladimir', side: null,
    lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: st, storeysSource: c.storeys ? 'dossier / photo / OSM' : b.levels ? 'OSM building:levels' : null,
    hCornice: c.hCornice ?? Math.round(L.heightOf(b)), hSource: c.hCornice ? 'estimated (storeys x 3.3-3.6 + plinth)' : 'layout.heightOf',
    style: c.style || null, era: c.era || null, wall: c.wall || null, trim: c.trim || null, roof: c.roof || null, shop: null,
    notes: c.notes || 'not researched in depth (no curated entry): the streets west of Alexander Park are rent houses of 1870-1914 (eclectic and Art Nouveau, 4-6 storeys, plaster in sand / ochre / grey-pink) with a few Stalin-era and modern infills',
    conf: c.conf || 'L', photos: c.photos || [],
    osmTags: { colour: b.colour ?? null, levels: b.levels ?? null, height: b.h ?? null, start_date: b.startDate ?? null, roofShape: b.roof ?? null, heritage: b.heritage ?? null, wikidata: b.wikidata ?? null },
    footprintArea: Math.round(b.area || 0), footprint: fp,
  });
}
out.sort((a, b) => (CUR[b.osm] ? 1 : 0) - (CUR[a.osm] ? 1 : 0) || b.footprintArea - a.footprintArea);
fs.writeFileSync(path.join(root, 'docs/research/vladimir-houses.json'), JSON.stringify(out, null, 1));
console.log(`vladimir-houses.json: ${out.length} houses, ${out.filter((h) => CUR[h.osm]).length} curated`);
