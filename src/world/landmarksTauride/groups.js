// The claims of the Tauride module in the North: PURE LITERAL DATA (no import: the source's groups.js imports terrain.js only to list the 8 garden bridge ids, and the North area module reads this file).
// SOURCE: 102_3d_piter src/world/landmarksTauride/groups.js, commit 0568f7af; the first two sub-groups are the source's. T2 of docs/TAURIDE-REMAKE.md added the third, 'tauride-garden': the garden is claimed so that
// the generic modules stop drawing what the garden's own builders replace (T3 ground and paths, T5 vegetation, T6 furniture; the relief and its terrain mesh are in the module since T2):
//   osm = the park r1582734 + the 23 wood polygons of GARDEN_GREEN (data/footprints.js: NOT the pitch, the playgrounds, the fitness station or the wetland), the 120 garden ways (data/paths.js: the 118 of the
//         source's terrain.js + w425188838 / w425188839, bridge ways included), the 132 benches and the 167 bins (data/furniture.js, OSM nodes: props/osm.js skips a claimed bench / waste basket).
//   T3 fix round 1 added the 4 footway AREAS inside the fence (GARDEN_AREAS: the central round w415779476 and three plazas, 1,565 / 375 / 277 / 188 m2): streets drew each as a 10 cm kerb wall round a paver cap whose triangles
//   wind downward (the cap is culled in the colour pass, the wall stays), a closed grey polygon on the lawn that the outline pass traced through the floor (QA: radius 27 m at the central round); the garden's own ground and
//   paths replace them (the worn plazas of data/ground.js), and T6 owns the memorial and the fountain.
//   Effect until the later phases: no generic trees, grass tufts, hedges, maroon path ribbons or OSM benches / bins in the garden (bare terrain). The 7 OSM trees are NOT claimed (they stay until T5).

const GARDEN_GREEN_IDS = [
    'r1582734','w1458068121','w1458072768','w1458068122','w1458068123','w1458068124',
    'w1458068125','w1458068126','w1458068127','w1458068128','w1458072769','w1458072770',
    'w1458072771','w1458072781','w1458072767','w1458072772','w1458072773','w1458072774',
    'w1458072775','w1458072776','w1458072777','w1458072778','w1458072779','w1458072780',
];
const GARDEN_WAYS = [
    'w81524425','w86283674','w425188839','w425188847','w81524419','w86283668','w106951341','w112853186',
    'w112853188','w112853191','w112853193','w112853204','w112853208','w112853211','w112853214','w112856734',
    'w112856742','w112880634','w112880640','w112880650','w116709199','w116709202','w116709203','w116709207',
    'w116709208','w116709209','w415779490','w415779498','w415779500','w420650661','w420650662','w420650667',
    'w420650668','w420650669','w422281932','w422281933','w422538570','w422538571','w422538572','w422538573',
    'w423970934','w423970939','w425188838','w425188840','w425188841','w425188842','w425188843','w425188845',
    'w426502816','w975299685','w1458068091','w1458068099','w112853199','w112856744','w112856749','w420650663',
    'w86283664','w112853198','w112853201','w112853217','w112881681','w112881682','w112881683','w116709205',
    'w116709206','w419263230','w419263235','w425188844','w425219408','w1051226582','w112853220','w81524417',
    'w81524422','w81524423','w81524426','w86283671','w86283676','w106951342','w112729984','w112729985',
    'w112729986','w112880635','w112880638','w112880644','w112880649','w112933682','w415779492','w415779499',
    'w418563884','w420650666','w422281936','w423970936','w423970938','w425201986','w425434598','w425434600',
    'w425635247','w425635248','w425635251','w425635253','w425635257','w425635260','w425635262','w425635264',
    'w425635266','w426502822','w426502824','w427110425','w427110426','w882128034','w882132271','w882132272',
    'w1458068086','w1458068087','w1458068088','w1458068089','w1458068092','w1458068093','w1458068094','w112880645',
];
const GARDEN_AREAS = ['w415779476', 'w1458068090', 'w1458068100', 'w1458068120'];
const GARDEN_BENCHES = [
    'n4244934439','n4257948325','n4257948326','n4257948327','n4257948328','n4326759653',
    'n4326759654','n4189483399','n4189483400','n4189483401','n4189483402','n4244934435',
    'n4244934436','n4244934440','n4263458867','n4263458868','n4263458871','n4263458874',
    'n4263458875','n4263458879','n4263458882','n4263458883','n4263458886','n4263458887',
    'n4263461290','n4263461292','n4263461294','n4263461296','n4263461298','n4263461301',
    'n4263461303','n4263461305','n4263461309','n4263461310','n4263461312','n4263461315',
    'n4263461317','n4263461319','n4263461321','n4263461324','n4263461327','n4263461331',
    'n4263461334','n4302305851','n4302305853','n4302305855','n4302305857','n4302305860',
    'n4326759632','n4326759634','n4326759636','n4326759637','n4326759639','n4326759641',
    'n4326759642','n4326759644','n4326759646','n4326759647','n4326759650','n4326759652',
    'n4326759659','n4326759663','n4326759664','n4326759667','n4326759668','n4326759671',
    'n4326759672','n4326759675','n4326759676','n4326759681','n4326759682','n4326759686',
    'n4326759688','n5524568622','n4189483403','n4189483404','n4234686232','n4234686234',
    'n4234686235','n4234686236','n4260141441','n4260141464','n4260141467','n4260141473',
    'n4260141476','n4260141480','n4260141482','n4189483393','n4189483394','n4189483395',
    'n4189483396','n4189483398','n4232765919','n4232765921','n4232765925','n4232765927',
    'n4232765929','n4234686223','n4234686224','n4234686225','n4234686226','n4234686227',
    'n4244934442','n4244934443','n4244934444','n4260113709','n4260113710','n4260113712',
    'n4260113717','n4260113720','n4260113723','n4260113725','n4260113727','n4260113728',
    'n4260113730','n4260113732','n4260113735','n4260141437','n4260141440','n4260141444',
    'n4260141445','n4260141448','n4260141450','n4260141454','n4260141457','n4260141460',
    'n4260141465','n4260141468','n4263458840','n4263458844','n4263458859','n13371954335',
];
const GARDEN_BINS = [
    'n4302305839','n4302305841','n4302305844','n4302305846','n4326759655','n4326759656',
    'n4326759657','n4326759658','n4326759662','n4260141484','n4263458831','n4263458832',
    'n4263458866','n4263458869','n4263458870','n4263458872','n4263458876','n4263458878',
    'n4263458881','n4263458884','n4263458885','n4263458888','n4263461291','n4263461293',
    'n4263461295','n4263461297','n4263461299','n4263461300','n4263461302','n4263461304',
    'n4263461307','n4263461308','n4263461311','n4263461313','n4263461314','n4263461316',
    'n4263461318','n4263461320','n4263461322','n4263461323','n4263461325','n4263461326',
    'n4263461328','n4263461329','n4263461330','n4263461332','n4263461333','n4263461335',
    'n4263461336','n4263461337','n4263461340','n4263461341','n4263461342','n4302305836',
    'n4302305837','n4302305838','n4302305840','n4302305842','n4302305845','n4302305847',
    'n4302305852','n4302305854','n4302305856','n4302305858','n4302305859','n4302305861',
    'n4326759633','n4326759635','n4326759638','n4326759640','n4326759643','n4326759645',
    'n4326759648','n4326759649','n4326759651','n4326759660','n4326759661','n4326759665',
    'n4326759666','n4326759669','n4326759670','n4326759673','n4326759674','n4326759677',
    'n4326759679','n4326759680','n4326759683','n4326759684','n4326759685','n4326759889',
    'n4326759890','n4326759891','n4326759892','n4260141486','n4260141487','n4260141488',
    'n4260142189','n4260141442','n4260141455','n4260141461','n4260141463','n4260141472',
    'n4260141474','n4260141475','n4260141477','n4260141478','n4260141479','n4260141481',
    'n4260141483','n4263458833','n4263458864','n4263458880','n5524623421','n4260067518',
    'n4260113705','n4260113706','n4260113707','n4260113708','n4260113711','n4260113713',
    'n4260113714','n4260113715','n4260113716','n4260113718','n4260113719','n4260113721',
    'n4260113722','n4260113724','n4260113726','n4260113729','n4260113731','n4260113733',
    'n4260113734','n4260113736','n4260141432','n4260141433','n4260141434','n4260141435',
    'n4260141439','n4260141443','n4260141446','n4260141449','n4260141453','n4260141458',
    'n4260141462','n4260141466','n4260141469','n4263458834','n4263458836','n4263458841',
    'n4263458842','n4263458843','n4263458845','n4263458847','n4263458848','n4263458849',
    'n4263458850','n4263458853','n4263458854','n4263458855','n4263458856','n4263458857',
    'n4263458860','n4263458861','n4263458862','n4263458863','n4263458873',
];

// T6 (docs/TAURIDE-REMAKE.md): the fence ways (the 14 mapped fence ways of data/furniture.js FENCES, among them the central round's w420650657 / w420650658 and the pitch ring w81524430, which is also the pitch GREEN record: claimed once),
// the 11 gate nodes, the 3 monuments and the fountain, the other GARDEN_GREEN records (the pitch, 3 playgrounds, the fitness station, the lake island's wetland) and the two hedges w1199664269 / w1199664270 that stand by the
// west gate: the garden draws its own fence, gates, monuments and play fittings, so nothing generic may stand there. The orangery building w23002927 (the palm house, OUTSIDE the outline in the north-west corner) is a
// building claim (`ids`): the module draws it as a glasshouse and `city` draws no block there. The service lane (w1258039516 / 17) is NOT claimed (data/furniture-design.js SERVICE_LANE_DECISION).
const GARDEN_FENCES = ['w418967227','w418967228','w420650657','w420650658','w426502809','w1458068097','w1458068098','w83151420','w418563881','w1293521581','w10903027','w418563880','w81524430','w112853216'];
const GARDEN_GATES = ['n950150459','n11695724997','n967683857','n4222941897','n8486544221','n828488069','n1001527689','n4249215401','n4249215405','n4263458837','n4263458839'];
const GARDEN_MONUMENTS = ['n2974761162','n4222941889','n4186236011','n950150577'];
const GARDEN_OTHERS = ['w188083933','w69029505','w188083935','w423708263','w188083936'];
const GARDEN_HEDGES = ['w1199664269','w1199664270'];
const GARDEN_ORANGERY = 'w23002927';

export const GROUPS_LIST = [
  {key:'tauride-palace',name:'Таврический дворец',nameEn:'Tauride Palace',ids:['r3801092'],osm:[],at:[1380,-1735]},
  {key:'paradny-quarter',name:'Парадный квартал',nameEn:'Paradny Quarter',ids:['w102153008','w102153013','w145419644','r1452259','r1967088','r3304715','r3304716','w102153007','w134638076','w134638078','w134638079'],osm:['w1501496505','w1501496506'],at:[944,-1038]},
  {key:'tauride-garden',name:'Таврический сад',nameEn:'Tauride Garden',ids:[GARDEN_ORANGERY],osm:[...GARDEN_GREEN_IDS,...GARDEN_WAYS,...GARDEN_AREAS,...GARDEN_BENCHES,...GARDEN_BINS,...GARDEN_FENCES,...GARDEN_GATES,...GARDEN_MONUMENTS,...GARDEN_OTHERS,...GARDEN_HEDGES],at:[1210,-1520]},
  // T8b (a user fix): the buildings of the garden nursery lot north-west of the garden: SHEDS (two concrete boxes, the long annex along the north edge; FIX ROUND 1: the grey office box, the barn and a utility cube of the yard) and YARD_HOUSES (the three classical blocks of the yard, drawn low with blue-green hipped roofs). OSM gives them no height and the generic city drew each as a
  // 4-storey yellow block; the air photo shows low plain buildings, which nursery.js draws (with colliders): `city` no longer draws them. The ids are the literal copy of data/nursery.js CLAIMED_IDS (nursery-test pins the equality).
  {key:'tauride-nursery',name:'Питомник Таврического сада',nameEn:'Tauride Garden nursery',ids:['w1457964048','w1457964049','w30324512','w239884014','w259579860','w30324513','w23002928','w23002936','w23002941'],osm:[],at:[1060,-1740]},
];
