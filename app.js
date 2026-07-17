const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const canvas = $("#gameCanvas");
const ctx = canvas.getContext("2d");
const video = $("#camera");

const ui = {
  intro: $("#intro"), loading: $("#loading"), loadingTitle: $("#loadingTitle"), loadingText: $("#loadingText"),
  loadingActions: $("#loadingActions"), calibrate: $("#calibrate"), calibrateTitle: $("#calibrateTitle"),
  calibrateText: $("#calibrateText"), calibrateDetail: $("#calibrateDetail"), signal: $("#signalBar"),
  countdown: $("#countdown"), result: $("#result"), resultTitle: $("#resultTitle"), cue: $("#cue"),
  toast: $("#toast"), demoHelp: $("#demoHelp"), motionArt: $("#motionArt"), tracking: $("#trackingStatus"),
  listen: $("#listenBtn"), home: $("#homeBtn"),
  score: $("#score"), combo: $("#combo"), time: $("#time"), finalScore: $("#finalScore"),
  accuracy: $("#accuracy"), maxCombo: $("#maxCombo"), grade: $("#grade"),
  resultMetricLabel: $("#resultMetricLabel"), resultStreakLabel: $("#resultStreakLabel")
};

const bg = new Image();
bg.src = "assets/kid-playroom-bg-v1.webp";

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const MODEL_LITE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MODEL_FULL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
// lear/rear·leye/reye는 얼굴 동작(귀·코 잡기) 판정에 쓴다.
const LM = {
  nose: 0, leye: 2, reye: 5, lear: 7, rear: 8, lmouth: 9, rmouth: 10,
  ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lp: 17, rp: 18, li: 19, ri: 20,
  lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28
};
const SKELETON = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];
const POSE_JOINTS = [LM.nose, LM.lear, LM.rear, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh];
const ARM_JOINTS = new Set([LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw]);
const FACE_JOINTS = new Set([LM.nose, LM.leye, LM.reye, LM.lear, LM.rear, LM.lmouth, LM.rmouth]);
const MAJOR_JOINTS = new Set([LM.ls, LM.rs, LM.lh, LM.rh]);
const POSE_INFERENCE_INTERVAL = 55;
const POSE_FRESH_MS = 280;
const POSE_CLEAR_MS = 420;
const POSE_DT_MAX_MS = 140;
const POSE_LOAD_TIMEOUT_MS = 20000;
const TOUCH_DWELL_MS = 140;
const TOUCH_REARM_MS = 90;
const SPELLING_GOAL = 10;
const PICTURE_GOAL = 10;
const COLOR_GOAL = 10;
const SPELLING_MAX_LETTERS = 6;
const WORDS = [
  // 동물
  { word: "CAT", emoji: "🐱", ko: "고양이" },
  { word: "DOG", emoji: "🐶", ko: "강아지" },
  { word: "FISH", emoji: "🐟", ko: "물고기" },
  { word: "BIRD", emoji: "🐦", ko: "새" },
  { word: "DUCK", emoji: "🦆", ko: "오리" },
  { word: "BEAR", emoji: "🐻", ko: "곰" },
  { word: "FROG", emoji: "🐸", ko: "개구리" },
  { word: "LION", emoji: "🦁", ko: "사자" },
  { word: "TIGER", emoji: "🐯", ko: "호랑이" },
  { word: "MONKEY", emoji: "🐵", ko: "원숭이" },
  { word: "PIG", emoji: "🐷", ko: "돼지" },
  { word: "COW", emoji: "🐮", ko: "소" },
  { word: "HORSE", emoji: "🐴", ko: "말" },
  { word: "SHEEP", emoji: "🐑", ko: "양" },
  { word: "MOUSE", emoji: "🐭", ko: "쥐" },
  { word: "RABBIT", emoji: "🐰", ko: "토끼" },
  { word: "FOX", emoji: "🦊", ko: "여우" },
  { word: "WOLF", emoji: "🐺", ko: "늑대" },
  { word: "PANDA", emoji: "🐼", ko: "판다" },
  { word: "KOALA", emoji: "🐨", ko: "코알라" },
  { word: "ZEBRA", emoji: "🦓", ko: "얼룩말" },
  { word: "SNAKE", emoji: "🐍", ko: "뱀" },
  { word: "WHALE", emoji: "🐳", ko: "고래" },
  { word: "SHARK", emoji: "🦈", ko: "상어" },
  { word: "CRAB", emoji: "🦀", ko: "게" },
  { word: "ANT", emoji: "🐜", ko: "개미" },
  { word: "BEE", emoji: "🐝", ko: "꿀벌" },
  { word: "OWL", emoji: "🦉", ko: "부엉이" },
  { word: "CHICK", emoji: "🐤", ko: "병아리" },
  { word: "DEER", emoji: "🦌", ko: "사슴" },
  { word: "TURTLE", emoji: "🐢", ko: "거북이" },
  { word: "SEAL", emoji: "🦭", ko: "물개" },
  { word: "BAT", emoji: "🦇", ko: "박쥐" },
  { word: "GOAT", emoji: "🐐", ko: "염소" },
  { word: "SQUID", emoji: "🦑", ko: "오징어" },
  { word: "SNAIL", emoji: "🐌", ko: "달팽이" },
  { word: "HIPPO", emoji: "🦛", ko: "하마" },
  { word: "CAMEL", emoji: "🐫", ko: "낙타" },
  { word: "EAGLE", emoji: "🦅", ko: "독수리" },
  { word: "SPIDER", emoji: "🕷️", ko: "거미" },
  { word: "PARROT", emoji: "🦜", ko: "앵무새" },
  { word: "SWAN", emoji: "🦢", ko: "백조" },
  { word: "LLAMA", emoji: "🦙", ko: "라마" },
  { word: "SLOTH", emoji: "🦥", ko: "나무늘보" },
  { word: "OTTER", emoji: "🦦", ko: "수달" },
  { word: "LIZARD", emoji: "🦎", ko: "도마뱀" },
  { word: "WORM", emoji: "🪱", ko: "지렁이" },
  { word: "BUG", emoji: "🐛", ko: "애벌레" },
  { word: "SHRIMP", emoji: "🦐", ko: "새우" },
  { word: "RHINO", emoji: "🦏", ko: "코뿔소" },
  { word: "HEN", emoji: "🐔", ko: "닭" },
  { word: "DOVE", emoji: "🕊️", ko: "비둘기" },
  { word: "BEAVER", emoji: "🦫", ko: "비버" },
  { word: "SKUNK", emoji: "🦨", ko: "스컹크" },
  // 음식
  { word: "MILK", emoji: "🥛", ko: "우유" },
  { word: "CAKE", emoji: "🍰", ko: "케이크" },
  { word: "APPLE", emoji: "🍎", ko: "사과" },
  { word: "BANANA", emoji: "🍌", ko: "바나나" },
  { word: "GRAPE", emoji: "🍇", ko: "포도" },
  { word: "MELON", emoji: "🍈", ko: "멜론" },
  { word: "PEACH", emoji: "🍑", ko: "복숭아" },
  { word: "LEMON", emoji: "🍋", ko: "레몬" },
  { word: "CORN", emoji: "🌽", ko: "옥수수" },
  { word: "EGG", emoji: "🥚", ko: "달걀" },
  { word: "BREAD", emoji: "🍞", ko: "빵" },
  { word: "PIZZA", emoji: "🍕", ko: "피자" },
  { word: "CANDY", emoji: "🍬", ko: "사탕" },
  { word: "COOKIE", emoji: "🍪", ko: "쿠키" },
  { word: "DONUT", emoji: "🍩", ko: "도넛" },
  { word: "RICE", emoji: "🍚", ko: "밥" },
  { word: "JUICE", emoji: "🧃", ko: "주스" },
  { word: "HONEY", emoji: "🍯", ko: "꿀" },
  { word: "CHEESE", emoji: "🧀", ko: "치즈" },
  { word: "SOUP", emoji: "🍲", ko: "수프" },
  { word: "TOMATO", emoji: "🍅", ko: "토마토" },
  { word: "CARROT", emoji: "🥕", ko: "당근" },
  { word: "ONION", emoji: "🧅", ko: "양파" },
  { word: "POTATO", emoji: "🥔", ko: "감자" },
  { word: "BURGER", emoji: "🍔", ko: "햄버거" },
  { word: "CHERRY", emoji: "🍒", ko: "체리" },
  { word: "KIWI", emoji: "🥝", ko: "키위" },
  { word: "MANGO", emoji: "🥭", ko: "망고" },
  { word: "OLIVE", emoji: "🫒", ko: "올리브" },
  { word: "PEANUT", emoji: "🥜", ko: "땅콩" },
  { word: "SALAD", emoji: "🥗", ko: "샐러드" },
  { word: "TACO", emoji: "🌮", ko: "타코" },
  { word: "SUSHI", emoji: "🍣", ko: "초밥" },
  { word: "NOODLE", emoji: "🍜", ko: "국수" },
  { word: "PIE", emoji: "🥧", ko: "파이" },
  { word: "TEA", emoji: "🍵", ko: "차" },
  { word: "ICE", emoji: "🧊", ko: "얼음" },
  { word: "BACON", emoji: "🥓", ko: "베이컨" },
  { word: "GARLIC", emoji: "🧄", ko: "마늘" },
  { word: "WAFFLE", emoji: "🧇", ko: "와플" },
  { word: "BUTTER", emoji: "🧈", ko: "버터" },
  { word: "SALT", emoji: "🧂", ko: "소금" },
  { word: "HOTDOG", emoji: "🌭", ko: "핫도그" },
  { word: "FRIES", emoji: "🍟", ko: "감자튀김" },
  // 사물·자연
  { word: "SUN", emoji: "☀️", ko: "해" },
  { word: "STAR", emoji: "⭐", ko: "별" },
  { word: "MOON", emoji: "🌙", ko: "달" },
  { word: "TREE", emoji: "🌳", ko: "나무" },
  { word: "BALL", emoji: "⚽", ko: "공" },
  { word: "BOOK", emoji: "📕", ko: "책" },
  { word: "SHOE", emoji: "👟", ko: "신발" },
  { word: "HAT", emoji: "🎩", ko: "모자" },
  { word: "BUS", emoji: "🚌", ko: "버스" },
  { word: "CAR", emoji: "🚗", ko: "자동차" },
  { word: "BED", emoji: "🛏️", ko: "침대" },
  { word: "DOOR", emoji: "🚪", ko: "문" },
  { word: "KEY", emoji: "🔑", ko: "열쇠" },
  { word: "BAG", emoji: "🎒", ko: "가방" },
  { word: "KITE", emoji: "🪁", ko: "연" },
  { word: "DRUM", emoji: "🥁", ko: "북" },
  { word: "BELL", emoji: "🔔", ko: "종" },
  { word: "CLOCK", emoji: "⏰", ko: "시계" },
  { word: "CHAIR", emoji: "🪑", ko: "의자" },
  { word: "TRAIN", emoji: "🚆", ko: "기차" },
  { word: "SHIP", emoji: "🚢", ko: "배" },
  { word: "BOAT", emoji: "⛵", ko: "보트" },
  { word: "PLANE", emoji: "✈️", ko: "비행기" },
  { word: "HOUSE", emoji: "🏠", ko: "집" },
  { word: "ROBOT", emoji: "🤖", ko: "로봇" },
  { word: "CROWN", emoji: "👑", ko: "왕관" },
  { word: "RING", emoji: "💍", ko: "반지" },
  { word: "SOCK", emoji: "🧦", ko: "양말" },
  { word: "GLOVE", emoji: "🧤", ko: "장갑" },
  { word: "RAIN", emoji: "🌧️", ko: "비" },
  { word: "SNOW", emoji: "⛄", ko: "눈" },
  { word: "CLOUD", emoji: "☁️", ko: "구름" },
  { word: "FIRE", emoji: "🔥", ko: "불" },
  { word: "LEAF", emoji: "🍃", ko: "나뭇잎" },
  { word: "ROSE", emoji: "🌹", ko: "장미" },
  { word: "SEED", emoji: "🌱", ko: "씨앗" },
  { word: "GIFT", emoji: "🎁", ko: "선물" },
  { word: "PIANO", emoji: "🎹", ko: "피아노" },
  { word: "FLAG", emoji: "🚩", ko: "깃발" },
  { word: "TENT", emoji: "⛺", ko: "텐트" },
  { word: "SPOON", emoji: "🥄", ko: "숟가락" },
  { word: "CANDLE", emoji: "🕯️", ko: "초" },
  { word: "WATCH", emoji: "⌚", ko: "손목시계" },
  { word: "PENCIL", emoji: "✏️", ko: "연필" },
  { word: "WATER", emoji: "💧", ko: "물" },
  { word: "HEART", emoji: "❤️", ko: "하트" },
  { word: "LAMP", emoji: "💡", ko: "전등" },
  { word: "CUP", emoji: "🥤", ko: "컵" },
  { word: "FORK", emoji: "🍴", ko: "포크" },
  { word: "PLATE", emoji: "🍽️", ko: "접시" },
  { word: "PAINT", emoji: "🎨", ko: "물감" },
  { word: "RULER", emoji: "📏", ko: "자" },
  { word: "PHONE", emoji: "📱", ko: "휴대폰" },
  { word: "CAMERA", emoji: "📷", ko: "카메라" },
  { word: "GUITAR", emoji: "🎸", ko: "기타" },
  { word: "VIOLIN", emoji: "🎻", ko: "바이올린" },
  { word: "BIKE", emoji: "🚲", ko: "자전거" },
  { word: "TRUCK", emoji: "🚚", ko: "트럭" },
  { word: "ROCKET", emoji: "🚀", ko: "로켓" },
  { word: "CASTLE", emoji: "🏰", ko: "성" },
  { word: "SCHOOL", emoji: "🏫", ko: "학교" },
  { word: "TOWER", emoji: "🗼", ko: "탑" },
  { word: "MAP", emoji: "🗺️", ko: "지도" },
  { word: "BOX", emoji: "📦", ko: "상자" },
  { word: "MONEY", emoji: "💰", ko: "돈" },
  { word: "COIN", emoji: "🪙", ko: "동전" },
  { word: "BROOM", emoji: "🧹", ko: "빗자루" },
  { word: "SOAP", emoji: "🧼", ko: "비누" },
  { word: "MIRROR", emoji: "🪞", ko: "거울" },
  { word: "WINDOW", emoji: "🪟", ko: "창문" },
  { word: "LADDER", emoji: "🪜", ko: "사다리" },
  { word: "BUCKET", emoji: "🪣", ko: "양동이" },
  { word: "HAMMER", emoji: "🔨", ko: "망치" },
  { word: "PUZZLE", emoji: "🧩", ko: "퍼즐" },
  { word: "TEDDY", emoji: "🧸", ko: "곰인형" },
  { word: "MAGNET", emoji: "🧲", ko: "자석" },
  { word: "SHELL", emoji: "🐚", ko: "조개껍데기" },
  { word: "CACTUS", emoji: "🌵", ko: "선인장" },
  { word: "TULIP", emoji: "🌷", ko: "튤립" },
  { word: "MAPLE", emoji: "🍁", ko: "단풍잎" },
  { word: "BEACH", emoji: "🏖️", ko: "해변" },
  { word: "EARTH", emoji: "🌍", ko: "지구" },
  // 몸
  { word: "HAND", emoji: "✋", ko: "손" },
  { word: "FOOT", emoji: "🦶", ko: "발" },
  { word: "NOSE", emoji: "👃", ko: "코" },
  { word: "EAR", emoji: "👂", ko: "귀" },
  { word: "MOUTH", emoji: "👄", ko: "입" },
  { word: "ARM", emoji: "💪", ko: "팔" },
  { word: "LEG", emoji: "🦵", ko: "다리" },
  { word: "TOOTH", emoji: "🦷", ko: "이" },
  { word: "TONGUE", emoji: "👅", ko: "혀" },
  { word: "BONE", emoji: "🦴", ko: "뼈" },
  { word: "BRAIN", emoji: "🧠", ko: "뇌" },
  { word: "FACE", emoji: "😀", ko: "얼굴" }
];

const COLORS = [
  { word: "RED", ko: "빨간색", emoji: "🔴", hex: "#ef4056", ink: "#ffffff" },
  { word: "BLUE", ko: "파란색", emoji: "🔵", hex: "#3b82f6", ink: "#ffffff" },
  { word: "GREEN", ko: "초록색", emoji: "🟢", hex: "#2fa85c", ink: "#ffffff" },
  { word: "YELLOW", ko: "노란색", emoji: "🟡", hex: "#ffd23e", ink: "#6b4e00" },
  { word: "PINK", ko: "분홍색", emoji: "💗", hex: "#f77fb2", ink: "#71173f" },
  { word: "PURPLE", ko: "보라색", emoji: "🟣", hex: "#9d5cf0", ink: "#ffffff" },
  { word: "ORANGE", ko: "주황색", emoji: "🟠", hex: "#ff8a2a", ink: "#ffffff" },
  { word: "BROWN", ko: "갈색", emoji: "🟤", hex: "#9a6234", ink: "#ffffff" },
  { word: "BLACK", ko: "검은색", emoji: "⚫", hex: "#2c3040", ink: "#ffffff" },
  { word: "WHITE", ko: "흰색", emoji: "⚪", hex: "#f6f7f9", ink: "#4a5568" }
];

// 전부 상체·얼굴 동작이다 — 무릎·발목은 화면에 없어도 된다.
// 자세를 잡는 순간 넘어간다. 한두 프레임 튐만 걸러낼 만큼만 유지 시간을 둔다.
const ACTION_HOLD_MS = 110;
// 손뼉은 손이 맞닿는 순간이 짧아서 더 짧게 본다.
const ACTION_CLAP_HOLD_MS = 60;
const ACTION_ROUND_MISSIONS = 10;
const USED_ACTIONS_KEY = "mallang-used-actions-v1";

const UPPER_CORE = [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw];
const FACE_CORE = [...UPPER_CORE, LM.leye, LM.reye, LM.lear, LM.rear];
const MOUTH_CORE = [...FACE_CORE, LM.lmouth, LM.rmouth];

// 미션 은행. 한 판에 ACTION_ROUND_MISSIONS개를 무작위로 뽑아 무작위 순서로 낸다.
// ko는 실제 판정 조건을 그대로 풀어 쓴다 — 설명과 인식이 다르면 아이가 헤맨다.
// oneHand: 반대쪽 팔이 화면 밖이어도 진행. armed: 손을 벌렸다 모으는 "동작"이라 준비 단계가 필요.
// en은 화면에 보이는 동시에 음성으로도 읽힌다. 한 손인지 두 손인지를 en에 넣어야
// 아이가 한글 자막을 못 읽어도 귀로 알 수 있다.
const ACTION_COMMANDS = [
  // --- 팔·몸 ---
  { id: "handsUp", en: "Raise both hands high!", ko: "두 팔을 머리 위로 쭉 뻗어요", emoji: "🙌", required: UPPER_CORE, focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "raiseOneHand", en: "Raise one hand!", ko: "한 손만 번쩍 들어요 (반대 손은 아래로)", emoji: "🙋", oneHand: true, required: UPPER_CORE, focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "touchShoulders", en: "Touch both shoulders!", ko: "두 손으로 내 양쪽 어깨를 잡아요", emoji: "🤗", required: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "airplane", en: "Open both arms wide!", ko: "두 팔을 어깨높이에서 옆으로 쭉 펴요", emoji: "✈️", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "reachSide", en: "Reach out with one arm!", ko: "한 팔만 옆으로 쭉 펴요 (반대 손은 아래로)", emoji: "👉", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "clap", en: "Clap your hands in front!", ko: "손을 벌렸다가 가슴 앞에서 짝! 마주쳐요", emoji: "👏", armed: true, hold: ACTION_CLAP_HOLD_MS, required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.le, LM.re, LM.lw, LM.rw] },
  { id: "clapHigh", en: "Clap over your head!", ko: "손을 벌렸다가 머리 위에서 짝! 마주쳐요", emoji: "🎉", armed: true, hold: ACTION_CLAP_HOLD_MS, required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.nose, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "crossArms", en: "Cross both arms!", ko: "두 팔을 가슴 앞에서 X자로 겹쳐요", emoji: "🙅", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.le, LM.re, LM.lw, LM.rw] },
  { id: "crossArmsHigh", en: "Make an X over your head!", ko: "두 팔을 머리 위로 올려 X자로 겹쳐요", emoji: "❌", required: UPPER_CORE, focus: [LM.nose, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "handsOnHips", en: "Put both hands on your hips!", ko: "두 손을 허리 양옆에 올리고 팔꿈치를 벌려요", emoji: "🕺", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh] },
  { id: "showMuscles", en: "Make muscles with both arms!", ko: "팔꿈치를 옆으로 벌리고 굽혀서 알통을 만들어요", emoji: "💪", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "touchTummy", en: "Touch your tummy with both hands!", ko: "두 손을 모아 배 위에 얹어요", emoji: "👐", required: [...UPPER_CORE, LM.lh, LM.rh], focus: [LM.lw, LM.rw, LM.lh, LM.rh] },
  { id: "touchElbow", en: "Touch your elbow with one hand!", ko: "한 손으로 반대쪽 팔꿈치를 잡아요", emoji: "🤝", required: UPPER_CORE, focus: [LM.le, LM.re, LM.lw, LM.rw] },

  // --- 얼굴·머리 ---
  { id: "touchHead", en: "Touch your head with one hand!", ko: "한 손을 머리 꼭대기에 얹어요", emoji: "🧢", oneHand: true, required: FACE_CORE, focus: [LM.nose, LM.leye, LM.reye, LM.lw, LM.rw] },
  { id: "touchFace", en: "Touch your face with one hand!", ko: "한 손으로 얼굴을 짚어요", emoji: "😊", oneHand: true, required: FACE_CORE, focus: [LM.nose, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "touchNose", en: "Touch your nose with one hand!", ko: "한 손으로 코를 짚어요", emoji: "👃", oneHand: true, required: MOUTH_CORE, focus: [LM.nose, LM.lw, LM.rw] },
  { id: "touchMouth", en: "Touch your mouth with one hand!", ko: "한 손을 입에 대요", emoji: "🤫", oneHand: true, required: MOUTH_CORE, focus: [LM.lmouth, LM.rmouth, LM.lw, LM.rw] },
  { id: "touchEyes", en: "Cover both eyes with your hands!", ko: "두 손으로 양쪽 눈을 가려요", emoji: "🙈", required: MOUTH_CORE, focus: [LM.leye, LM.reye, LM.lw, LM.rw] },
  { id: "touchEars", en: "Touch both ears with your hands!", ko: "두 손으로 양쪽 귀를 잡아요", emoji: "👂", required: MOUTH_CORE, focus: [LM.lear, LM.rear, LM.lw, LM.rw] },
  { id: "tiltHead", en: "Tilt your head to the side!", ko: "어깨는 그대로 두고 고개만 옆으로 갸웃 기울여요", emoji: "🙃", noHands: true, required: [LM.nose, LM.leye, LM.reye, LM.lear, LM.rear, LM.ls, LM.rs], focus: [LM.nose, LM.lear, LM.rear] }
];

const games = {
  sequence: { name: "SPELL POP · 10 WORDS", ms: 100000, image: "assets/kid-spell-pop-v1.webp", description: "한국어 그림 힌트를 보고 서로 다른 영어 단어 10개의 철자를 완성해요." },
  math: { name: "PICTURE PICK · 10 WORDS", ms: 90000, image: "assets/kid-picture-pick-v1.webp", description: "한국어 문제 10개를 듣고 알맞은 영어 단어를 손으로 골라요." },
  squat: { name: "LISTEN & MOVE · 10 MISSIONS", ms: 130000, image: "assets/kid-action-missions-v2.webp", description: "동작 20가지 중 매판 10개를 새로 뽑아요. 영어를 듣고 상체와 얼굴로 따라 하면 바로 통과!" },
  color: { name: "COLOR POP · 10 COLORS", ms: 90000, image: "assets/kid-color-pop-v2.webp", description: "색깔 문제를 듣고 위쪽 좌·우 색 구름에서 정답을 빠르게 터치해요." }
};

let selectedGame = "math";
let stream = null;
let poseLandmarker = null;
let poseLoading = null;
let poseWorker = null;
let poseWorkerReady = false;
let poseWorkerGeneration = 0;
let poseLoadGeneration = 0;
let poseRuntime = "none";
let poseModelVariant = "lite";
let lastPose = null;
let lastWorldPose = null;
let poseVersion = 0;
let evaluatedPoseVersion = -1;
let poseTimestamp = 0;
let poseCaptureTimestamp = 0;
let lastInferenceAt = 0;
let lastVideoTime = -1;
let inferenceErrors = 0;
let demo = false;
let running = false;
let calibrating = false;
let countdownActive = false;
let renderLoopActive = false;
let renderFrameId = 0;
let sound = true;
let audioCtx = null;
let wakeLock = null;
let gameState = null;
let score = 0, combo = 0, maxCombo = 0, hits = 0, misses = 0, gameElapsed = 0;
let lastFrameAt = performance.now();
let lastPoseEvalAt = 0;
let calibrationGoodSince = null;
let cameraRect = { x: 0, y: 0, w: 1, h: 1 };
let playRect = { x: 0, y: 0, w: 1, h: 1 };
let viewW = innerWidth, viewH = innerHeight;
let particles = [], ripples = [];
let feedbacks = [];
let wristTrails = { [LM.lw]: [], [LM.rw]: [] };
let inputLockedUntil = 0;
let cameraAttemptId = 0;
let cameraFrameGeneration = 0;
let cameraStreamReady = false;
let countdownAttemptId = 0;
let forceCpuPose = false;
let preferLitePose = false;
let poseInferenceBusy = false;
let poseInferenceStartedAt = 0;
let poseRecovering = false;
let poseInferenceSamples = 0;
let poseDowngradeStarted = false;
let disablePoseWorker = false;
let selfTesting = false;
let adaptiveInferenceInterval = POSE_INFERENCE_INTERVAL;
let lastUsablePoseAt = 0;
let trackingInvalidSince = 0;
let trackingInputReset = false;
let speechRoundToken = 0;
let trackingWasPaused = false;
let wordDeck = [];
let colorDeck = [];
let completedWordCount = 0;
let completedRun = false;
let orientationTimer = 0;
let resumeCameraAfterPageShow = false;
let resumeCameraMode = "";
let cameraStartInProgress = false;
const motionDiagnostics = {
  runtime: "none", model: "none", delegate: "none", camera: null,
  inferenceMs: 0, inferenceAverageMs: 0, poseAgeMs: Infinity,
  droppedFrames: 0, errors: 0, lastError: ""
};
window.__MOTION_DIAGNOSTICS__ = motionDiagnostics;

const hide = (...elements) => elements.forEach((el) => el?.classList.add("hidden"));
const show = (...elements) => elements.forEach((el) => el?.classList.remove("hidden"));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function withTimeout(promise, timeoutMs, message, onLateResolve) {
  let timer;
  let settled = false;
  const guardedPromise = Promise.resolve(promise).then((value) => {
    if (settled) {
      try { onLateResolve?.(value); } catch {}
    }
    return value;
  });
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      settled = true;
      reject(new Error(message));
    }, timeoutMs);
  });
  return Promise.race([guardedPromise, timeoutPromise]).finally(() => {
    settled = true;
    clearTimeout(timer);
  });
}

function currentPoseAge(now = performance.now()) {
  if (!poseTimestamp) return Infinity;
  const receivedAge = now - poseTimestamp;
  const captureAge = poseCaptureTimestamp ? now - poseCaptureTimestamp : receivedAge;
  return Math.max(0, receivedAge, captureAge);
}

// 문제 은행. 낸 문제를 낸 순서대로 기기에 기억해 두고, 은행을 한 바퀴 다 돌기 전에는
// 같은 문제가 다시 나오지 않게 한다. 게임을 바꿔도 단어 기록은 함께 쓴다.
function loadUsedList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function persistUsedList(key, list) {
  if (selfTesting) return;
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

// 은행을 다 돌아 기록을 풀 때도, 최근에 낸 이만큼은 계속 잠가 둔다 — 방금 낸 문제가 바로 또 나오면 안 된다.
const RECENT_WORD_LOCK = 40;
const RECENT_ACTION_LOCK = 6;

const USED_WORDS_KEY = "mallang-used-words-v1";
let usedWordOrder = loadUsedList(USED_WORDS_KEY);
let usedWordSet = new Set(usedWordOrder);

function persistUsedWords() {
  persistUsedList(USED_WORDS_KEY, usedWordOrder);
}

// 은행이 바닥나면 오래전에 낸 문제부터 다시 풀어 주고, 최근 것만 잠가 둔다.
function recycleUsed(order, keepRecent) {
  const kept = order.slice(-keepRecent);
  return { order: kept, set: new Set(kept) };
}

function buildWordDeck(maxLetters = Infinity) {
  const eligible = WORDS.filter((item) => item.word.length <= maxLetters);
  let fresh = eligible.filter((item) => !usedWordSet.has(item.word));
  // 한 판(문제 10개 × 단어 2개)을 채울 만큼 안 남으면 오래된 기록부터 풀어 준다.
  if (fresh.length < PICTURE_GOAL * 2) {
    const lock = Math.min(RECENT_WORD_LOCK, Math.max(0, eligible.length - PICTURE_GOAL * 3));
    const recycled = recycleUsed(usedWordOrder, lock);
    usedWordOrder = recycled.order;
    usedWordSet = recycled.set;
    persistUsedWords();
    fresh = eligible.filter((item) => !usedWordSet.has(item.word));
  }
  return shuffle(fresh);
}

function nextWord() {
  const word = wordDeck.shift() || null;
  if (word) {
    usedWordSet.add(word.word);
    usedWordOrder.push(word.word);
    persistUsedWords();
  }
  return word;
}

function withObjectParticle(word) {
  const value = word || "";
  const last = value.charCodeAt(value.length - 1) || 0;
  const hasFinalConsonant = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "을" : "를"}`;
}

function withTopicParticle(word) {
  const value = word || "";
  const last = value.charCodeAt(value.length - 1) || 0;
  const hasFinalConsonant = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "은" : "는"}`;
}

function speakText(text, lang, interrupt = false, onDone = null) {
  if (!sound || selfTesting || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
  try {
    if (interrupt) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === "ko-KR" ? .88 : .78;
    utterance.pitch = lang === "ko-KR" ? 1.08 : 1.16;
    utterance.volume = .9;
    if (onDone) {
      utterance.onend = onDone;
      utterance.onerror = onDone;
    }
    speechSynthesis.speak(utterance);
    return true;
  } catch { return false; }
}

const speakEnglish = (text, interrupt = false, onDone = null) => speakText(text, "en-US", interrupt, onDone);
const speakKorean = (text, interrupt = false, onDone = null) => speakText(text, "ko-KR", interrupt, onDone);

function resize() {
  const bounds = app.getBoundingClientRect();
  viewW = Math.max(1, bounds.width);
  viewH = Math.max(1, bounds.height);
  const dpr = Math.min(devicePixelRatio || 1, viewW < 700 ? 1.35 : 1.75);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateCameraGeometry();
  if (!renderLoopActive) drawBackground();
}

function updateCameraGeometry() {
  const compactLandscape = viewW > viewH && viewH < 680;
  const stageTop = compactLandscape ? 62 : viewW < 700 ? 82 : viewW <= 900 ? 108 : 76;
  const stageBottom = compactLandscape ? 12 : viewW < 700 ? 18 : 24;
  const stage = { x: 8, y: stageTop, w: Math.max(1, viewW - 16), h: Math.max(1, viewH - stageTop - stageBottom) };
  const sourceW = video.videoWidth || (matchMedia("(orientation: portrait)").matches ? 720 : 1280);
  const sourceH = video.videoHeight || (matchMedia("(orientation: portrait)").matches ? 1280 : 720);
  const scale = Math.min(stage.w / sourceW, stage.h / sourceH);
  const w = sourceW * scale, h = sourceH * scale;
  cameraRect = { x: stage.x + (stage.w - w) / 2, y: stage.y + (stage.h - h) / 2, w, h };
  playRect = { x: cameraRect.x + cameraRect.w * .07, y: cameraRect.y + cameraRect.h * .08, w: cameraRect.w * .86, h: cameraRect.h * .86 };
  app.style.setProperty("--camera-left", `${cameraRect.x}px`);
  app.classList.toggle("side-calibration", viewW > viewH && cameraRect.x - stage.x >= 60);
}

addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
addEventListener("orientationchange", () => {
  calibrationGoodSince = null;
  clearTimeout(orientationTimer);
  orientationTimer = setTimeout(() => {
    resize();
    if (stream && !demo && (running || countdownActive || calibrating)) {
      cameraFrameGeneration += 1;
      lastPose = null;
      lastWorldPose = null;
      poseTimestamp = 0;
      poseCaptureTimestamp = 0;
      rearmGameInput();
      setTracking("다시 찾는 중", "warn");
      showToast("화면이 돌아갔어요 · 그대로 이어서 해요");
      void reconfigureCameraForOrientation();
    }
  }, 220);
});
video.addEventListener("resize", resize);
resize();
// #app의 레이아웃이 아직 확정되지 않으면 초기 resize()가 캔버스를 1x1로 잡아
// 화면이 텅 비어 보일 수 있다. 크기가 잡힐 때까지 짧게 재시도한다.
if (app.getBoundingClientRect().width <= 1 || app.getBoundingClientRect().height <= 1) {
  (function retrySize(tries) {
    const b = app.getBoundingClientRect();
    if (b.width > 1 && b.height > 1) { resize(); return; }
    if (tries < 40) setTimeout(() => retrySize(tries + 1), 100);
  })(0);
}
// 이후 화면 크기 변화(회전 등)는 ResizeObserver로도 대응한다.
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(resize).observe(app);
}

function setTracking(text, state = "") {
  ui.tracking.className = `tracking-status ${state}`.trim();
  ui.tracking.querySelector("span").textContent = text;
}

function setCue(title, detail = "", accessibleLabel = "") {
  const heading = ui.cue.querySelector("strong");
  const description = ui.cue.querySelector("span");
  if (heading.textContent !== title) heading.textContent = title;
  if (description.textContent !== detail) description.textContent = detail;
  if (accessibleLabel) {
    if (ui.cue.getAttribute("aria-label") !== accessibleLabel) ui.cue.setAttribute("aria-label", accessibleLabel);
  } else if (ui.cue.hasAttribute("aria-label")) {
    ui.cue.removeAttribute("aria-label");
  }
}

function tone(frequency = 440, duration = .08, type = "sine", volume = .05) {
  if (!sound) return;
  try {
    audioCtx ||= new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
    oscillator.connect(gain).connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {}
}

function closePoseWorker() {
  poseWorkerGeneration += 1;
  poseWorkerReady = false;
  poseInferenceBusy = false;
  try { poseWorker?.terminate?.(); } catch {}
  poseWorker = null;
  if (poseRuntime === "worker") poseRuntime = "none";
}

function closePoseCandidate(candidate) {
  try { candidate?.close?.(); } catch {}
}

function closeMainPose() {
  closePoseCandidate(poseLandmarker);
  poseLandmarker = null;
  if (poseRuntime === "main") poseRuntime = "none";
}

function resetPoseRuntime() {
  poseLoadGeneration += 1;
  closePoseWorker();
  closeMainPose();
  poseLoading = null;
  poseInferenceSamples = 0;
  poseDowngradeStarted = false;
  motionDiagnostics.inferenceAverageMs = 0;
  motionDiagnostics.runtime = "none";
  motionDiagnostics.model = "none";
  motionDiagnostics.delegate = "none";
}

function smoothWorldPose(raw, now) {
  if (!lastWorldPose || now - poseTimestamp > 350) return raw?.map((point) => ({ ...point })) || null;
  const dt = clamp(now - poseTimestamp, 16, 140);
  const alpha = 1 - Math.exp(-dt / 90);
  return raw?.map((point, index) => {
    const previous = lastWorldPose[index];
    if (!previous) return { ...point };
    return {
      ...point,
      x: lerp(previous.x, point.x, alpha),
      y: lerp(previous.y, point.y, alpha),
      z: lerp(previous.z || 0, point.z || 0, alpha)
    };
  }) || null;
}

function acceptPoseResult(raw, world, captureTimestamp, inferenceMs, receivedAt = performance.now(), frameGeneration = cameraFrameGeneration) {
  if (frameGeneration !== cameraFrameGeneration) return;
  if (Number.isFinite(captureTimestamp) && poseCaptureTimestamp && captureTimestamp <= poseCaptureTimestamp) return;
  motionDiagnostics.inferenceMs = Math.round(inferenceMs || 0);
  motionDiagnostics.inferenceAverageMs = Math.round(motionDiagnostics.inferenceAverageMs
    ? motionDiagnostics.inferenceAverageMs * .84 + (inferenceMs || 0) * .16
    : (inferenceMs || 0));
  poseInferenceSamples += 1;
  if (raw?.length) {
    lastPose = smoothPose(raw, receivedAt);
    lastWorldPose = smoothWorldPose(world, receivedAt);
    poseCaptureTimestamp = Number.isFinite(captureTimestamp) ? captureTimestamp : receivedAt;
    poseTimestamp = receivedAt;
    poseVersion += 1;
    inferenceErrors = 0;
    motionDiagnostics.poseAgeMs = 0;
  } else if (receivedAt - poseTimestamp > POSE_CLEAR_MS) {
    lastPose = null;
    lastWorldPose = null;
  }
  adaptiveInferenceInterval = inferenceMs > 90
    ? Math.min(125, adaptiveInferenceInterval + 10)
    : inferenceMs > 55
      ? Math.min(95, adaptiveInferenceInterval + 4)
      : Math.max(POSE_INFERENCE_INTERVAL, adaptiveInferenceInterval - 2);
  const fullModelTooSlow = poseModelVariant === "full"
    && ((poseInferenceSamples >= 6 && motionDiagnostics.inferenceAverageMs > 95)
      || (poseInferenceSamples >= 4 && motionDiagnostics.inferenceAverageMs > 140));
  if (poseRuntime === "worker" && fullModelTooSlow && !poseDowngradeStarted) {
    poseDowngradeStarted = true;
    void recoverPoseRuntime({ preferLite: true });
  }
}

function startPoseWorker(modelAssetPath, variant, delegate) {
  closePoseWorker();
  const worker = new Worker(new URL("pose-worker.js", import.meta.url), { type: "module" });
  const generation = ++poseWorkerGeneration;
  poseWorker = worker;
  poseWorkerReady = false;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      if (poseWorker === worker) {
        try { worker.terminate(); } catch {}
        poseWorker = null;
        poseWorkerReady = false;
      }
      reject(error instanceof Error ? error : new Error(String(error || "포즈 작업을 시작하지 못했습니다.")));
    };
    const handleWorkerTransportError = (event) => {
      event?.preventDefault?.();
      const error = new Error(event?.message || "포즈 작업 연결 오류");
      if (!settled) fail(error);
      else {
        poseWorkerReady = false;
        handlePoseRuntimeFailure(error, true);
      }
    };
    worker.onerror = handleWorkerTransportError;
    worker.onmessageerror = handleWorkerTransportError;
    worker.onmessage = (event) => {
      const message = event.data || {};
      if (message.generation !== generation || poseWorker !== worker) return;
      if (message.type === "ready") {
        poseWorkerReady = true;
        poseRuntime = "worker";
        poseModelVariant = variant;
        motionDiagnostics.runtime = "worker";
        motionDiagnostics.model = variant;
        motionDiagnostics.delegate = message.delegate || delegate;
        if (!settled) {
          settled = true;
          resolve(true);
        }
        return;
      }
      if (message.type === "result") {
        acceptPoseResult(message.landmarks?.[0], message.worldLandmarks?.[0], message.timestamp, message.inferenceMs, performance.now(), message.frameGeneration);
        return;
      }
      if (message.type === "error") {
        const error = new Error(`${message.phase || "worker"}: ${message.message || "포즈 인식 오류"}`);
        if (!settled) fail(error);
        else handlePoseRuntimeFailure(error);
      }
    };
    worker.postMessage({
      type: "init", wasmRoot: `${CDN}/wasm`, modelAssetPath, delegate, generation
    });
  });
}

async function waitForPoseCandidate(candidatePromise, generation, message, timeoutMs = POSE_LOAD_TIMEOUT_MS) {
  const candidate = await withTimeout(candidatePromise, timeoutMs, message, closePoseCandidate);
  if (generation !== poseLoadGeneration) {
    closePoseCandidate(candidate);
    throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  }
  return candidate;
}

async function loadMainPose(generation) {
  const { FilesetResolver, PoseLandmarker } = await withTimeout(import(`${CDN}/+esm`), POSE_LOAD_TIMEOUT_MS, "동작 인식 모듈 시간이 초과됐습니다.");
  if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  const vision = await withTimeout(FilesetResolver.forVisionTasks(`${CDN}/wasm`), POSE_LOAD_TIMEOUT_MS, "동작 인식 준비 시간이 초과됐습니다.");
  if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  const common = {
    baseOptions: { modelAssetPath: MODEL_LITE, delegate: forceCpuPose ? "CPU" : "GPU" },
    runningMode: "VIDEO", numPoses: 1,
    minPoseDetectionConfidence: .50, minPosePresenceConfidence: .50, minTrackingConfidence: .48
  };
  let candidate;
  try {
    candidate = await waitForPoseCandidate(PoseLandmarker.createFromOptions(vision, common), generation, "동작 인식 모델 시간이 초과됐습니다.");
  } catch (error) {
    if (generation !== poseLoadGeneration) throw error;
    if (forceCpuPose) throw error;
    forceCpuPose = true;
    common.baseOptions.delegate = "CPU";
    candidate = await waitForPoseCandidate(PoseLandmarker.createFromOptions(vision, common), generation, "안전 모드 준비 시간이 초과됐습니다.");
  }
  if (generation !== poseLoadGeneration) {
    closePoseCandidate(candidate);
    throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  }
  poseLandmarker = candidate;
  poseRuntime = "main";
  poseModelVariant = "lite";
  motionDiagnostics.runtime = "main";
  motionDiagnostics.model = "lite";
  motionDiagnostics.delegate = forceCpuPose ? "CPU" : "GPU";
  return true;
}

async function loadPose() {
  if (poseWorkerReady || poseLandmarker) return true;
  if (poseLoading) return poseLoading;
  const generation = ++poseLoadGeneration;
  poseLoading = (async () => {
    const canUseWorker = !disablePoseWorker && typeof Worker !== "undefined" && typeof createImageBitmap === "function";
    if (canUseWorker) {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 4;
      const highPerformance = !forceCpuPose && !preferLitePose && cores >= 6 && memory >= 4;
      const attempts = forceCpuPose
        ? [{ model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
        : preferLitePose
          ? [{ model: MODEL_LITE, variant: "lite", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
        : highPerformance
          ? [{ model: MODEL_FULL, variant: "full", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
          : [{ model: MODEL_LITE, variant: "lite", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }];
      for (const attempt of attempts) {
        try {
          await withTimeout(startPoseWorker(attempt.model, attempt.variant, attempt.delegate), POSE_LOAD_TIMEOUT_MS, "동작 인식 작업 시간이 초과됐습니다.");
          if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
          return true;
        } catch (error) {
          motionDiagnostics.lastError = error.message;
          closePoseWorker();
        }
      }
    }
    return loadMainPose(generation);
  })();
  try {
    return await poseLoading;
  } finally {
    if (generation === poseLoadGeneration) poseLoading = null;
  }
}

async function recoverPoseRuntime(options = {}) {
  if (poseRecovering) return;
  const { preferLite = false, forceCpu = false, disableWorker = false } = options;
  poseRecovering = true;
  if (preferLite) preferLitePose = true;
  if (forceCpu) forceCpuPose = true;
  if (disableWorker) disablePoseWorker = true;
  setTracking(forceCpu ? "안전 모드로 바꾸는 중" : preferLite ? "속도에 맞게 조정 중" : "동작 인식 다시 연결 중", "warn");
  try {
    resetPoseRuntime();
    await loadPose();
    inferenceErrors = 0;
    rearmGameInput();
  } catch (error) {
    motionDiagnostics.lastError = error.message;
    running = calibrating = countdownActive = false;
    countdownAttemptId += 1;
    stopCamera();
    hide(ui.calibrate, ui.cue, ui.countdown);
    show(ui.loading);
    showCameraError({ name: "PoseRuntimeError" });
  } finally {
    poseRecovering = false;
  }
}

function handlePoseRuntimeFailure(error, workerTransportFailed = false) {
  const failedRuntime = poseRuntime;
  inferenceErrors = workerTransportFailed ? 3 : inferenceErrors + 1;
  motionDiagnostics.errors += 1;
  motionDiagnostics.lastError = error?.message || String(error || "pose error");
  if (inferenceErrors >= 3) {
    void recoverPoseRuntime({
      preferLite: true,
      forceCpu: failedRuntime === "main",
      disableWorker: workerTransportFailed || failedRuntime === "worker"
    });
  }
}

function cameraVideoConstraints(includeResizeMode = true) {
  const portrait = matchMedia("(orientation: portrait)").matches;
  const constraints = {
    facingMode: { ideal: "user" },
    width: { ideal: portrait ? 480 : 640, max: 640 },
    height: { ideal: portrait ? 640 : 480, max: 640 },
    aspectRatio: { ideal: portrait ? .75 : 1.333 },
    frameRate: { ideal: 30, max: 30 }
  };
  if (includeResizeMode) constraints.resizeMode = { ideal: "none" };
  return constraints;
}

function recordCameraSettings(track) {
  const settings = track?.getSettings?.() || {};
  motionDiagnostics.camera = {
    width: settings.width || video.videoWidth || 0,
    height: settings.height || video.videoHeight || 0,
    frameRate: settings.frameRate || 0,
    facingMode: settings.facingMode || "unknown"
  };
}

async function alignCameraToOrientation(track) {
  const portrait = matchMedia("(orientation: portrait)").matches;
  const width = video.videoWidth || track?.getSettings?.().width || 0;
  const height = video.videoHeight || track?.getSettings?.().height || 0;
  const mismatched = width && height && (portrait ? width > height : height > width);
  if (!mismatched) return;
  const strict = cameraVideoConstraints(false);
  strict.aspectRatio = { exact: portrait ? .75 : 1.333 };
  try {
    await track.applyConstraints(strict);
    await video.play();
  } catch {
    // Some desktop webcams only expose a landscape sensor; contain mode remains the safe fallback.
  }
}

function bindCameraTrack(track, ownerStream) {
  track.onended = () => {
    if (stream !== ownerStream) return;
    cameraStreamReady = false;
    stream = null;
    video.srcObject = null;
    running = calibrating = countdownActive = false;
    countdownAttemptId += 1;
    hide(ui.calibrate, ui.cue, ui.countdown);
    show(ui.loading);
    showCameraError({ name: "NotReadableError" });
  };
  track.onmute = () => {
    if (stream !== ownerStream || document.hidden) return;
    trackingInvalidSince = performance.now();
    rearmGameInput();
    setTracking("카메라 화면 다시 찾는 중", "warn");
  };
  track.onunmute = () => {
    if (stream !== ownerStream) return;
    setTracking("동작 다시 찾는 중", "warn");
  };
}

function releaseCameraStream(targetStream) {
  targetStream?.getTracks?.().forEach((track) => {
    track.onended = track.onmute = track.onunmute = null;
    try { track.stop(); } catch {}
  });
}

function discardCameraStream(targetStream) {
  if (!targetStream) return;
  if (stream === targetStream) {
    stream = null;
    cameraStreamReady = false;
  }
  if (video.srcObject === targetStream) video.srcObject = null;
  releaseCameraStream(targetStream);
}

function releaseSupersededCameraStream(previousStream, targetStream) {
  if (previousStream && previousStream !== targetStream && previousStream !== stream) releaseCameraStream(previousStream);
}

function cameraOpenIsCurrent(attemptId, targetStream) {
  return attemptId === cameraAttemptId && stream === targetStream && video.srcObject === targetStream;
}

async function openCamera(attemptId) {
  const preferred = cameraVideoConstraints(true);
  const relaxed = cameraVideoConstraints(false);
  delete relaxed.aspectRatio;
  let nextStream;
  try {
    nextStream = await navigator.mediaDevices.getUserMedia({ video: preferred, audio: false });
  } catch (error) {
    if (error.name === "OverconstrainedError") nextStream = await navigator.mediaDevices.getUserMedia({ video: relaxed, audio: false });
    else throw error;
  }
  if (attemptId !== cameraAttemptId) {
    releaseCameraStream(nextStream);
    return false;
  }
  const previousStream = stream;
  cameraFrameGeneration += 1;
  stream = nextStream;
  cameraStreamReady = false;
  video.srcObject = nextStream;
  const track = nextStream.getVideoTracks()[0];
  if (!track) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    throw Object.assign(new Error("camera track unavailable"), { name: "NotFoundError" });
  }
  try {
    await video.play();
    if (!cameraOpenIsCurrent(attemptId, nextStream)) {
      releaseSupersededCameraStream(previousStream, nextStream);
      discardCameraStream(nextStream);
      return false;
    }
    releaseCameraStream(previousStream);
    bindCameraTrack(track, nextStream);
    await alignCameraToOrientation(track);
    if (!cameraOpenIsCurrent(attemptId, nextStream)) {
      releaseSupersededCameraStream(previousStream, nextStream);
      discardCameraStream(nextStream);
      return false;
    }
  } catch (error) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    throw error;
  }
  try {
    const capabilities = track.getCapabilities?.();
    if (capabilities?.zoom && Number.isFinite(capabilities.zoom.min)) await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] });
  } catch {}
  if (!cameraOpenIsCurrent(attemptId, nextStream)) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    return false;
  }
  recordCameraSettings(track);
  cameraStreamReady = true;
  resize();
  return true;
}

async function reconfigureCameraForOrientation() {
  const track = stream?.getVideoTracks?.()[0];
  if (!track || track.readyState !== "live") return;
  const operationAttempt = cameraAttemptId;
  try {
    await track.applyConstraints(cameraVideoConstraints(false));
    if (document.hidden || operationAttempt !== cameraAttemptId || stream?.getVideoTracks?.()[0] !== track) return;
    await video.play();
    await alignCameraToOrientation(track);
    if (document.hidden || operationAttempt !== cameraAttemptId || stream?.getVideoTracks?.()[0] !== track) return;
    recordCameraSettings(track);
    resize();
  } catch {
    if (document.hidden || operationAttempt !== cameraAttemptId) return;
    const attemptId = ++cameraAttemptId;
    try {
      stopCamera();
      if (!(await openCamera(attemptId))) return;
      rearmGameInput();
      setTracking("동작 다시 찾는 중", "warn");
    } catch (error) {
      running = calibrating = countdownActive = false;
      hide(ui.calibrate, ui.cue, ui.countdown);
      show(ui.loading);
      showCameraError(error);
    }
  }
}

function stopCamera() {
  cameraFrameGeneration += 1;
  const activeStream = stream;
  stream = null;
  cameraStreamReady = false;
  video.srcObject = null;
  releaseCameraStream(activeStream);
  lastPose = null;
  lastWorldPose = null;
  poseTimestamp = 0;
  poseCaptureTimestamp = 0;
  poseInferenceBusy = false;
  lastVideoTime = -1;
}

function showCameraError(error) {
  const messages = {
    NotAllowedError: ["카메라 권한이 필요해요", "브라우저 주소창의 카메라 권한을 허용한 뒤 다시 시도하세요."],
    NotFoundError: ["카메라를 찾지 못했어요", "연결된 카메라가 있는지 확인하세요."],
    NotReadableError: ["카메라가 사용 중이에요", "화상회의 앱을 닫은 뒤 다시 시도하세요."],
    SecurityError: ["안전한 연결이 필요해요", "HTTPS 주소에서 게임을 열어 주세요."],
    PoseRuntimeError: ["동작 인식을 다시 준비할게요", "그래픽 인식이 멈춰 CPU 안전 모드로 바꿉니다. 다시 시도를 눌러 주세요."]
  };
  const [title, text] = messages[error?.name] || ["동작 인식을 시작하지 못했어요", "네트워크를 확인하고 다시 시도해 주세요."];
  ui.loadingTitle.textContent = title;
  ui.loadingText.textContent = text;
  ui.loading.querySelector(".loader").classList.add("hidden");
  show(ui.loadingActions);
  setTracking("연결 실패", "warn");
}

async function startCamera() {
  const attemptId = ++cameraAttemptId;
  cameraStartInProgress = true;
  let cameraConnected = false;
  hide(ui.intro, ui.result, ui.loadingActions);
  show(ui.loading, ui.home);
  ui.loading.querySelector(".loader").classList.remove("hidden");
  ui.loadingTitle.textContent = "카메라 연결 중";
  ui.loadingText.textContent = "전체 화면을 유지하는 광각 모드로 준비하고 있습니다.";
  const permissionHint = setTimeout(() => {
    if (attemptId !== cameraAttemptId) return;
    ui.loadingText.textContent = cameraConnected
      ? "동작 인식 모델을 준비하고 있어요. 네트워크가 느리면 조금 더 걸릴 수 있어요."
      : "브라우저의 카메라 허용 창을 확인해 주세요. 계속 막히면 체험 모드로 먼저 확인할 수 있어요.";
    show(ui.loadingActions);
  }, 7000);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("camera unavailable"), { name: "NotFoundError" });
    const hasLiveCamera = cameraStreamReady && stream?.getVideoTracks().some((track) => track.readyState === "live");
    if (!hasLiveCamera) {
      stopCamera();
      if (!(await openCamera(attemptId))) return;
    }
    cameraConnected = true;
    if (attemptId !== cameraAttemptId) return;
    ui.loadingTitle.textContent = "AI 동작 인식 준비 중";
    ui.loadingText.textContent = "처음 한 번만 포즈 모델을 불러옵니다.";
    await loadPose();
    if (attemptId !== cameraAttemptId) return;
    demo = false;
    hide(ui.loading);
    beginCalibration();
    startRenderLoop();
  } catch (error) {
    if (attemptId !== cameraAttemptId) return;
    stopCamera();
    showCameraError(error);
  } finally {
    clearTimeout(permissionHint);
    if (attemptId === cameraAttemptId) cameraStartInProgress = false;
  }
}

function beginCalibration() {
  countdownAttemptId += 1;
  calibrating = true;
  running = false;
  countdownActive = false;
  hide(ui.countdown);
  calibrationGoodSince = null;
  ui.signal.style.width = "0%";
  const actionMissions = selectedGame === "squat";
  ui.calibrateTitle.textContent = actionMissions ? "얼굴과 두 손을 보여주세요" : "상체와 한 손을 보여주세요";
  ui.calibrateDetail.textContent = actionMissions ? "얼굴·어깨와 두 팔이 화면에 들어오면 바로 시작해요." : "머리·어깨와 한 손만 보여도 시작할 수 있어요.";
  show(ui.calibrate, ui.home);
  setTracking("몸 위치 확인 중", "warn");
}

function requiredIndices(game = selectedGame, calibration = false) {
  if (game === "squat") {
    if (!calibration && gameState?.currentAction?.required) return gameState.currentAction.required;
    // 상체 동작만 쓰므로 얼굴·어깨·팔만 보이면 된다.
    return [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw];
  }
  const core = [LM.nose, LM.ls, LM.rs];
  return core;
}

function landmarkVisible(landmark, minimum = .48) {
  return !!landmark && (landmark.visibility ?? 1) >= minimum && (landmark.presence ?? 1) >= minimum;
}

function landmarkInFrame(landmark, margin = .025) {
  return landmarkVisible(landmark, .30)
    && landmark.x >= margin && landmark.x <= 1 - margin
    && landmark.y >= margin && landmark.y <= 1 - margin;
}

function actionRequiredLandmarksUsable(action = gameState?.currentAction) {
  if (!action?.required?.length) return false;
  const margin = .008;
  const usable = (index, threshold = .34) => {
    const landmark = lastPose?.[index];
    return landmarkVisible(landmark, threshold)
      && landmark.x >= margin && landmark.x <= 1 - margin
      && landmark.y >= margin && landmark.y <= 1 - margin;
  };
  // 손을 쓰지 않는 동작(고개 기울이기)은 팔이 화면 밖이어도 진행한다.
  if (action.noHands) return action.required.every((index) => usable(index));
  // 한 손만 쓰는 동작은 반대쪽 팔이 화면 밖이어도 진행한다.
  if (action.oneHand) {
    const core = action.required
      .filter((index) => !ARM_JOINTS.has(index) || index === LM.ls || index === LM.rs)
      .every((index) => usable(index));
    const leftArm = [LM.le, LM.lw].every((index) => usable(index));
    const rightArm = [LM.re, LM.rw].every((index) => usable(index));
    return core && (leftArm || rightArm);
  }
  return action.required.every((index) => usable(index));
}

function analyzeFit() {
  if (!lastPose || currentPoseAge() > POSE_FRESH_MS) return { good: false, title: "몸을 찾고 있어요", text: "카메라 정면에 서 주세요." };
  const needed = requiredIndices(selectedGame, true);
  // 동작 미션은 두 팔을 다 쓰므로 양손, 단어 놀이는 한 손만 보여도 된다.
  const actionMissions = selectedGame === "squat";
  const handVisible = actionMissions
    ? [LM.lw, LM.rw].every((index) => landmarkInFrame(lastPose[index], .015))
    : [LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index]));
  if (!needed.every((index) => landmarkVisible(lastPose[index], .36)) || !handVisible) {
    return {
      good: false,
      title: actionMissions ? "두 손을 모두 보여주세요" : "한 손을 흔들어 주세요",
      text: actionMissions ? "얼굴·어깨와 두 팔이 화면 안에 들어오게 서요." : "카메라 정면에서 손을 들어 보여주세요."
    };
  }
  const points = needed.map((index) => lastPose[index]);
  const minY = Math.min(...points.map((p) => p.y));
  const leftShoulder = lastPose[LM.ls];
  const rightShoulder = lastPose[LM.rs];
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const centerX = (leftShoulder.x + rightShoulder.x) / 2;
  // 동작 미션은 팔을 옆으로 펴도, 머리 위로 들어도 안 잘리게 여유를 더 둔다.
  const tooClose = shoulderWidth > (actionMissions ? .42 : .58) || minY < (actionMissions ? .06 : .025);
  const tooFar = shoulderWidth < .10;
  if (tooClose) return {
    good: false,
    title: "카메라가 조금 가까워요",
    text: actionMissions
      ? "두 팔을 펴도 잘리지 않게 한 걸음 뒤로 가요."
      : "손이 잘리지 않도록 반 걸음 뒤로 가요."
  };
  if (tooFar) return { good: false, title: "몸이 너무 작게 보여요", text: "한 걸음만 앞으로 이동하세요." };
  if (centerX < .25) return { good: false, title: "화면 오른쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
  if (centerX > .75) return { good: false, title: "화면 왼쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
  return { good: true, title: "좋아요, 그대로!", text: "잠시 자세를 유지하면 시작합니다." };
}

function updateCalibration(now) {
  const fit = analyzeFit();
  ui.calibrateTitle.textContent = fit.title;
  ui.calibrateText.textContent = fit.text;
  if (!fit.good) {
    calibrationGoodSince = null;
    ui.signal.style.width = "0%";
    setTracking(fit.title, "warn");
    return;
  }
  calibrationGoodSince ??= now;
  const progress = clamp((now - calibrationGoodSince) / 650, 0, 1);
  ui.signal.style.width = `${progress * 100}%`;
  setTracking(`카메라 인식 ${Math.round(progress * 100)}%`, "good");
  if (progress >= 1 && !countdownActive) {
    calibrating = false;
    hide(ui.calibrate);
    startCountdown();
  }
}

async function startCountdown() {
  if (countdownActive) return;
  const attemptId = ++countdownAttemptId;
  countdownActive = true;
  hide(ui.calibrate, ui.loading, ui.intro, ui.result);
  show(ui.home);
  for (const value of [3, 2, 1]) {
    ui.countdown.textContent = value;
    show(ui.countdown);
    tone(280 + value * 80, .12, "square", .04);
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (attemptId !== countdownAttemptId) { hide(ui.countdown); return; }
    hide(ui.countdown);
  }
  ui.countdown.textContent = "GO";
  show(ui.countdown);
  tone(700, .22, "sawtooth", .07);
  await new Promise((resolve) => setTimeout(resolve, 430));
  if (attemptId !== countdownAttemptId) { hide(ui.countdown); return; }
  hide(ui.countdown);
  countdownActive = false;
  beginGame();
}

function startDemo() {
  cameraAttemptId += 1;
  cameraStartInProgress = false;
  stopCamera();
  demo = true;
  calibrating = false;
  hide(ui.intro, ui.loading, ui.result, ui.calibrate, ui.loadingActions);
  show(ui.demoHelp, ui.home);
  setTracking("체험 모드", "good");
  startRenderLoop();
  startCountdown();
}

function resetScore() {
  score = combo = maxCombo = hits = misses = 0;
  gameElapsed = 0;
  wordDeck = buildWordDeck(selectedGame === "sequence" ? SPELLING_MAX_LETTERS : Infinity);
  colorDeck = shuffle(COLORS);
  completedWordCount = 0;
  completedRun = false;
  lastUsablePoseAt = 0;
  trackingInvalidSince = 0;
  trackingInputReset = false;
  trackingWasPaused = false;
  adaptiveInferenceInterval = POSE_INFERENCE_INTERVAL;
  evaluatedPoseVersion = poseVersion;
  lastPoseEvalAt = poseCaptureTimestamp || poseTimestamp;
  inputLockedUntil = 0;
  particles = [];
  ripples = [];
  feedbacks = [];
  wristTrails = { [LM.lw]: [], [LM.rw]: [] };
}

function rearmGameInput() {
  if (!gameState) return;
  inputLockedUntil = performance.now() + 120;
  wristTrails = { [LM.lw]: [], [LM.rw]: [] };
  if (selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") {
    gameState.targets?.forEach((target) => target.dwell = 0);
    gameState.inputReady = false;
    gameState.clearMs = 0;
  } else if (selectedGame === "squat") {
    gameState.stableMs = 0;
    gameState.neutralMs = 0;
    gameState.matching = false;
    gameState.progress = 0;
    gameState.commandArmed = false;
    gameState.phase = "active";
  }
  updateGameCue();
}

function beginGame() {
  resetScore();
  running = true;
  gameState = createGameState(selectedGame);
  evaluatedPoseVersion = poseVersion;
  lastPoseEvalAt = poseCaptureTimestamp || poseTimestamp;
  ui.motionArt.src = games[selectedGame].image;
  show(ui.cue, ui.motionArt, ui.listen);
  updateHUD();
  updateGameCue();
  scheduleRoundAnnouncement(180);
  navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
}

function announceRound() {
  if (!gameState) return false;
  if (selectedGame === "sequence") {
    if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
    return speakKorean(`${gameState.prompt.ko}의 영어 철자를 완성하세요.`, true);
  }
  if (selectedGame === "math") {
    if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
    return speakKorean(`${withObjectParticle(gameState.prompt.ko)} 찾으세요.`, true);
  }
  if (selectedGame === "squat") return speakEnglish(gameState.currentAction?.en || "Let's move!", true);
  if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
  return speakKorean(`${withObjectParticle(gameState.prompt.ko)} 빨리 찾으세요.`, true);
}

function scheduleRoundAnnouncement(delay = 0) {
  const token = ++speechRoundToken;
  const mode = selectedGame;
  const word = gameState?.prompt?.word || "";
  const actionId = gameState?.currentAction?.id || "";
  setTimeout(() => {
    if (token !== speechRoundToken || !running || selectedGame !== mode || (word && gameState?.prompt?.word !== word) || (actionId && gameState?.currentAction?.id !== actionId)) return;
    announceRound();
  }, delay);
}

function createGameState(game) {
  if (game === "sequence") return createSequenceRound(1);
  if (game === "math") return createMathProblem();
  if (game === "squat") return createActionGame();
  return createColorRound();
}

// 손을 위로 뻗어야 닿도록 답 버블은 화면 위쪽에 배치한다.
function sequenceSlots(count) {
  if (count <= 3) return [[.18, .28], [.50, .24], [.82, .28]].slice(0, count);
  if (count === 4) return [[.20, .22], [.80, .22], [.30, .52], [.70, .52]];
  if (count === 5) return [[.16, .22], [.50, .20], [.84, .22], [.30, .52], [.70, .52]];
  return [[.16, .22], [.50, .20], [.84, .22], [.16, .52], [.50, .54], [.84, .52]].slice(0, count);
}

function createSequenceRound(round) {
  if (round > SPELLING_GOAL) return null;
  const prompt = nextWord();
  if (!prompt) return null;
  const letters = [...prompt.word];
  const count = letters.length;
  // 글자 위치를 매번 섞어서 답이 왼쪽부터 차례대로 놓이지 않게 한다.
  const slots = shuffle(sequenceSlots(count));
  return {
    mode: "sequence", round, prompt, current: 1, inputReady: false, clearMs: 0, answerRevealed: false, advancing: false,
    targets: slots.map(([x, y], index) => ({ value: letters[index], order: index + 1, x, y, dwell: 0, flashUntil: 0 }))
  };
}

function createMathProblem() {
  if (completedWordCount >= PICTURE_GOAL || wordDeck.length < 2) return null;
  const prompt = nextWord();
  const distractor = nextWord();
  if (!prompt || !distractor) return null;
  const answer = prompt.word;
  const values = shuffle([answer, distractor.word]);
  const slots = [[.24, .24], [.76, .24]];
  return {
    mode: "math", prompt, answer, inputReady: false, clearMs: 0, startedAt: gameElapsed, answerRevealed: false, advancing: false,
    targets: values.map((value, index) => ({ value, x: slots[index][0], y: slots[index][1], dwell: 0, flashUntil: 0 }))
  };
}

function createColorRound() {
  if (completedWordCount >= COLOR_GOAL) return null;
  const prompt = colorDeck.shift();
  if (!prompt) return null;
  const others = COLORS.filter((item) => item.word !== prompt.word);
  const distractor = others[Math.floor(Math.random() * others.length)];
  const choices = shuffle([prompt, distractor]);
  const slots = [[.22, .22], [.78, .22]];
  // 보기 버블에는 색을 칠하지 않는다 — 색만 보고 찍지 않고 영어 단어를 읽게 하기 위해서다.
  return {
    mode: "color", prompt, answer: prompt.word, inputReady: false, clearMs: 0, startedAt: gameElapsed, answerRevealed: false, advancing: false,
    targets: choices.map((item, index) => ({ value: item.word, x: slots[index][0], y: slots[index][1], dwell: 0, flashUntil: 0 }))
  };
}

function targetPoint(target) {
  return { x: playRect.x + target.x * playRect.w, y: playRect.y + target.y * playRect.h };
}

function targetRadius() {
  const points = posePoints();
  const shoulder = points ? distance(points.ls, points.rs) : playRect.w * .2;
  const wordChoice = selectedGame === "math" || selectedGame === "color";
  if (viewH < 420 && viewW > viewH) return clamp(shoulder * .34, 26, 30);
  if (viewW < 700) {
    const minimum = wordChoice ? 36 : 34;
    const maximum = wordChoice ? 42 : 40;
    return clamp(shoulder * .42, minimum, maximum);
  }
  return clamp(shoulder * .46, wordChoice ? 50 : 44, wordChoice ? 62 : 56);
}

function pointInsideTarget(point, target, radius = targetRadius(), outsideScale = 1) {
  const center = targetPoint(target);
  const widthScale = selectedGame === "math" || selectedGame === "color" ? 1.45 : 1;
  const dx = (point.x - center.x) / (radius * widthScale * outsideScale);
  const dy = (point.y - center.y) / (radius * outsideScale);
  return dx * dx + dy * dy <= 1;
}

function posePoint(index) {
  const landmark = lastPose?.[index];
  if (!landmark) return null;
  return {
    x: cameraRect.x + (1 - landmark.x) * cameraRect.w,
    y: cameraRect.y + landmark.y * cameraRect.h,
    z: landmark.z || 0,
    v: Math.min(landmark.visibility ?? 1, landmark.presence ?? 1)
  };
}

function posePoints() {
  if (!lastPose) return null;
  const points = {};
  for (const [name, index] of Object.entries(LM)) points[name] = posePoint(index);
  return points;
}

function angle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  return Math.acos(clamp((ab.x * cb.x + ab.y * cb.y) / (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1), -1, 1)) * 180 / Math.PI;
}

function angle3D(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const mag = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z) || 1;
  return Math.acos(clamp(dot / mag, -1, 1)) * 180 / Math.PI;
}

// 터치는 손목이 아니라 손바닥으로 판정한다.
// 1순위: 새끼·검지 관절이 잡히면 그 중간(손등 중심)을 손끝 쪽으로 조금 밀어 손바닥을 잡는다.
// 2순위: 손가락이 안 잡히면 팔꿈치→손목 방향으로 아래팔 길이의 일부만큼 연장해 손바닥을 추정한다.
// 손목 좌표를 그대로 쓰지는 않는다 — 아이가 손을 뻗어도 판정점이 손목에 있으면 터치감이 없다.
const PALM_KNUCKLE_REACH = 1.35;
const PALM_FOREARM_RATIO = .34;

function palmPoint(wristIndex, elbowIndex, pinkyIndex, indexIndex) {
  const wrist = posePoint(wristIndex);
  if (!wrist) return null;
  const pinky = posePoint(pinkyIndex);
  const pointer = posePoint(indexIndex);
  if (pinky && pointer && Math.min(pinky.v, pointer.v) >= .22) {
    const knuckleX = (pinky.x + pointer.x) / 2;
    const knuckleY = (pinky.y + pointer.y) / 2;
    return {
      x: wrist.x + (knuckleX - wrist.x) * PALM_KNUCKLE_REACH,
      y: wrist.y + (knuckleY - wrist.y) * PALM_KNUCKLE_REACH,
      v: wrist.v
    };
  }
  const elbow = posePoint(elbowIndex);
  if (elbow && elbow.v >= .22) {
    const dx = wrist.x - elbow.x;
    const dy = wrist.y - elbow.y;
    const forearm = Math.hypot(dx, dy);
    if (forearm > 1) {
      return {
        x: wrist.x + dx / forearm * forearm * PALM_FOREARM_RATIO,
        y: wrist.y + dy / forearm * forearm * PALM_FOREARM_RATIO,
        v: wrist.v
      };
    }
  }
  return wrist;
}

function handPoint(wristIndex) {
  return wristIndex === LM.lw
    ? palmPoint(LM.lw, LM.le, LM.lp, LM.li)
    : palmPoint(LM.rw, LM.re, LM.rp, LM.ri);
}

function handPositions(points) {
  if (!points) return [];
  return [LM.lw, LM.rw]
    .filter((index) => {
      const point = posePoint(index);
      return point && point.v >= .30 && landmarkInFrame(lastPose?.[index], .012);
    })
    .map((index) => handPoint(index));
}

function handsOutsideAll(targets, hands, radius) {
  return targets.every((target) => hands.every((hand) => !pointInsideTarget(hand, target, radius, 1.18)));
}

function updateTouchReadiness(state, hands, radius, dt) {
  if (state.inputReady) return true;
  const selectableTargets = state.mode === "sequence"
    ? state.targets.filter((target) => target.order >= state.current)
    : state.targets;
  if (handsOutsideAll(selectableTargets, hands, radius)) state.clearMs += dt;
  else state.clearMs = 0;
  if (state.clearMs >= TOUCH_REARM_MS) state.inputReady = true;
  return state.inputReady;
}

function enqueueFeedback(type, x, y, label, gain = 0, detail = "") {
  const now = performance.now();
  const compactLandscape = viewH < 420 && viewW > viewH;
  feedbacks = [{
    type, x, y, label, gain, detail, mode: selectedGame, startedAt: now,
    duration: compactLandscape ? (type === "good" ? 320 : 280) : (type === "good" ? 420 : 340),
    radius: compactLandscape
      ? clamp(targetRadius() * .72, 22, 27)
      : clamp(targetRadius() * .82, 26, viewW < 700 ? 44 : 56)
  }];
}

function award(points, x, y, label = "PERFECT", detail = "") {
  hits++;
  combo++;
  maxCombo = Math.max(maxCombo, combo);
  const gain = points + Math.min(combo, 10) * 10;
  score += gain;
  burst(x, y, selectedGame === "math" ? "#ff3ea5" : "#38f6ff");
  enqueueFeedback("good", x, y, label, gain, detail);
  ui.toast.textContent = `${label} +${gain}`;
  ui.toast.classList.remove("show");
  if (combo > 0 && combo % 5 === 0) showToast(`${combo} COMBO!`);
  try { if (!demo) navigator.vibrate?.(18); } catch {}
  tone(520 + Math.min(combo, 12) * 28, .1, "triangle", .07);
  return gain;
}

function penalty(label = "다시!", x = null, y = null, amount = 5) {
  misses++;
  if (Number.isFinite(x) && Number.isFinite(y)) enqueueFeedback("try", x, y, label, 0);
  else showToast(label, true);
  tone(260, .08, "sine", .025);
}

function showToast(text, bad = false) {
  ui.toast.textContent = text;
  ui.toast.style.color = bad ? "#9b651b" : "#28775f";
  ui.toast.classList.remove("show");
  void ui.toast.offsetWidth;
  ui.toast.classList.add("show");
}

function finishRunSoon(title, detail, delay = 950) {
  completedRun = true;
  if (gameState) {
    gameState.sessionComplete = true;
    gameState.advancing = true;
  }
  inputLockedUntil = Infinity;
  setCue(title, detail);
  showToast(title);
  const token = ++speechRoundToken;
  if (selfTesting) return;
  setTimeout(() => {
    if (token === speechRoundToken && running) endGame();
  }, delay);
}

function transitionAfterAnswer(completedWord, createNextRound) {
  const answeredState = gameState;
  answeredState.answerRevealed = true;
  answeredState.advancing = true;
  inputLockedUntil = Infinity;
  updateGameCue();
  const token = ++speechRoundToken;
  const revealedAt = performance.now();
  answeredState.answerHoldUntil = revealedAt + 1100;
  let finished = false;
  const advance = () => {
    if (finished || token !== speechRoundToken || gameState !== answeredState) return;
    finished = true;
    const nextState = createNextRound();
    if (!nextState) {
      finishRunSoon("🎉 모든 단어를 만났어요!", `${completedWordCount}개의 영어를 배웠어요`);
      return;
    }
    gameState = nextState;
    inputLockedUntil = performance.now() + 180;
    updateGameCue();
    scheduleRoundAnnouncement(240);
  };
  if (selfTesting) { advance(); return; }
  const advanceAfterMinimum = () => {
    const wait = answeredState.answerHoldUntil - performance.now();
    if (wait > 0) setTimeout(advance, wait);
    else advance();
  };
  const spoken = speakEnglish(completedWord.word.toLowerCase(), true, advanceAfterMinimum);
  setTimeout(advanceAfterMinimum, spoken ? 1550 : 1100);
}

function completeSequenceTarget(target) {
  const point = targetPoint(target);
  const completedWord = gameState.prompt;
  award(100, point.x, point.y, `${target.value} 좋아요!`, `${completedWord.word.slice(0, target.order)} ✓`);
  speakEnglish(target.value);
  gameState.current++;
  inputLockedUntil = performance.now() + 150;
  gameState.inputReady = false;
  gameState.clearMs = 0;
  gameState.targets.forEach((item) => item.dwell = 0);
  if (gameState.current > gameState.targets.length) {
    score += 180 + gameState.targets.length * 20;
    const nextRound = gameState.round + 1;
    completedWordCount++;
    showToast(`${completedWord.emoji} ${completedWord.word}!`);
    transitionAfterAnswer(completedWord, () => createSequenceRound(nextRound));
  }
  updateGameCue();
}

function completeMathTarget(target) {
  const point = targetPoint(target);
  if (target.value !== gameState.answer) {
    target.flashUntil = performance.now() + 500;
    penalty("한 번 더 골라봐요", point.x, point.y, 0);
    inputLockedUntil = performance.now() + 110;
    gameState.inputReady = false;
    gameState.clearMs = 0;
    return;
  }
  const completedWord = gameState.prompt;
  const responseBonus = Math.max(0, 40 - Math.floor((gameElapsed - gameState.startedAt) / 250));
  award(140 + responseBonus, point.x, point.y, `${target.value} 정답!`, `${completedWord.emoji} ${completedWord.ko} = ${target.value}`);
  completedWordCount++;
  transitionAfterAnswer(completedWord, gameState.mode === "color" ? createColorRound : createMathProblem);
  updateGameCue();
}

function updateTouchGame(dt) {
  if (gameState?.advancing || gameState?.sessionComplete) return;
  const points = posePoints();
  const hands = handPositions(points);
  if (!hands.length || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  if (!updateTouchReadiness(gameState, hands, radius, dt)) return;
  for (const target of gameState.targets) {
    if (selectedGame === "sequence" && target.order < gameState.current) continue;
    const point = targetPoint(target);
    const inside = hands.some((hand) => pointInsideTarget(hand, target, radius));
    target.dwell = inside ? target.dwell + dt : Math.max(0, target.dwell - dt * 1.5);
    if (target.dwell < TOUCH_DWELL_MS) continue;
    if (selectedGame === "sequence") {
      if (target.order === gameState.current) completeSequenceTarget(target);
      else {
        target.flashUntil = performance.now() + 450;
        const nextLetter = gameState.targets[gameState.current - 1]?.value || "";
        penalty(`${nextLetter}부터 찾아봐요`, point.x, point.y, 0);
        inputLockedUntil = performance.now() + 110;
        gameState.inputReady = false;
        gameState.clearMs = 0;
      }
    } else completeMathTarget(target);
    break;
  }
}

function exerciseFeedbackPoint(yRatio = .5) {
  const points = posePoints();
  const visible = points ? Object.values(points).filter((point) => point?.v > .38) : [];
  const inset = viewW < 700 ? 74 : 90;
  let x = cameraRect.x + inset;
  if (visible.length) {
    const minX = Math.min(...visible.map((point) => point.x));
    const maxX = Math.max(...visible.map((point) => point.x));
    const leftSpace = minX - cameraRect.x;
    const rightSpace = cameraRect.x + cameraRect.w - maxX;
    x = leftSpace >= rightSpace
      ? cameraRect.x + clamp(leftSpace * .5, inset, cameraRect.w * .28)
      : cameraRect.x + cameraRect.w - clamp(rightSpace * .5, inset, cameraRect.w * .28);
  }
  return { x, y: cameraRect.y + cameraRect.h * yRatio };
}

let usedActionOrder = loadUsedList(USED_ACTIONS_KEY);
let usedActionSet = new Set(usedActionOrder);

// 미션 은행에서 한 판치를 무작위로 뽑는다. 은행을 한 바퀴 다 돌기 전에는 같은 미션이 다시 나오지 않는다.
function buildActionDeck() {
  let fresh = ACTION_COMMANDS.filter((action) => !usedActionSet.has(action.id));
  if (fresh.length < ACTION_ROUND_MISSIONS) {
    const lock = Math.min(RECENT_ACTION_LOCK, Math.max(0, ACTION_COMMANDS.length - ACTION_ROUND_MISSIONS));
    const recycled = recycleUsed(usedActionOrder, lock);
    usedActionOrder = recycled.order;
    usedActionSet = recycled.set;
    fresh = ACTION_COMMANDS.filter((action) => !usedActionSet.has(action.id));
  }
  // 뽑기와 순서를 한 번에 섞는다 — 매판 내용도 순서도 달라진다.
  const picked = shuffle(fresh).slice(0, ACTION_ROUND_MISSIONS);
  picked.forEach((action) => {
    usedActionSet.add(action.id);
    usedActionOrder.push(action.id);
  });
  persistUsedList(USED_ACTIONS_KEY, usedActionOrder);
  return picked;
}

function createActionGame() {
  const state = {
    mode: "squat", commands: buildActionDeck(), commandIndex: 0, currentAction: null,
    completed: 0, reps: 0, stableMs: 0, neutralMs: 0, phase: "active",
    matching: false, progress: 0, advancing: false, sessionComplete: false,
    commandArmed: false
  };
  activateActionCommand(state, 0);
  return state;
}

function activateActionCommand(state, index) {
  const action = state.commands[index];
  state.commandIndex = index;
  state.currentAction = action;
  state.stableMs = 0;
  state.neutralMs = 0;
  state.matching = false;
  state.progress = 0;
  state.advancing = false;
  // 손뼉류는 손을 한 번 벌려야 준비된다. 나머지는 자세를 잡는 즉시 인정.
  state.commandArmed = !action?.armed;
  // 앞 동작을 그대로 유지하고 있으면 다음 미션이 저절로 통과된다.
  // 명령이 바뀐 뒤 한 번이라도 자세가 풀린 걸 확인한 다음부터 인정한다.
  // (이미 풀린 상태면 첫 프레임에 바로 해제되므로 평소엔 걸리는 느낌이 없다.)
  state.needsRelease = true;
  state.phase = "active";
  state.introUntil = performance.now() + (selfTesting ? 0 : 680);
}

// 얼굴 부위 기준점. 눈↔입 세로 길이를 얼굴 단위(unit)로 삼아 정수리·볼·턱을 추정한다.
// 얼굴 크기에 비례하므로 아이가 멀리 서든 가까이 오든 같은 기준이 된다.
function faceMetrics(points) {
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const eyes = mid(points.leye, points.reye);
  const mouthTracked = (points.lmouth?.v ?? 0) >= .30 && (points.rmouth?.v ?? 0) >= .30;
  // 입이 안 잡히면 눈↔코 간격으로 입 위치를 추정한다(코는 눈과 입 사이 약 40% 지점).
  const mouth = mouthTracked
    ? mid(points.lmouth, points.rmouth)
    : { x: points.nose.x, y: eyes.y + (points.nose.y - eyes.y) / .40 };
  const unit = Math.max(6, Math.abs(mouth.y - eyes.y));
  const lmouth = mouthTracked ? points.lmouth : mouth;
  const rmouth = mouthTracked ? points.rmouth : mouth;
  return {
    eyes, mouth, unit, mouthTracked,
    // 정수리는 눈 위로 얼굴 단위의 약 1.4배, 턱은 입 아래로 약 0.7배 지점.
    headTop: { x: eyes.x, y: eyes.y - unit * 1.40 },
    chin: { x: mouth.x, y: mouth.y + unit * .70 },
    // 볼은 귀와 입 사이 중간.
    lcheek: mid(points.lear, lmouth),
    rcheek: mid(points.rear, rmouth)
  };
}

// 얼굴 부위 짚기 판정.
//
// 손 위치는 손목에서 추정한 값이라 오차가 크다(손가락 끝을 알 수 없다). 반면 코와 입은
// 얼굴 단위로 0.5칸밖에 안 떨어져 있다. 즉 픽셀 거리로 코/입/볼을 정밀하게 가르려 하면
// 아이가 아무리 정확히 짚어도 몇 픽셀 차이로 탈락한다(실제로 그렇게 만들었다가 되돌림).
//
// 그래서 "가장 가까운 부위 찾기"를 버리고, 넉넉한 반경 + 굵은 구분만 쓴다:
//   위/아래(눈-코-입) · 가운데/양옆(코-귀). 이 둘은 오차보다 충분히 크다.
// 유아용 언어 놀이라 조금 헐거워도 아이가 영어를 듣고 몸을 움직이면 목적을 달성한다.
function faceAnchorMap(points, face) {
  return {
    headTop: face.headTop, leye: points.leye, reye: points.reye, nose: points.nose,
    mouth: face.mouth, lear: points.lear, rear: points.rear
  };
}

// 얼굴 한가운데(눈과 입 사이). 얼굴 전체 판정의 기준점이다.
function faceCenter(points, face) {
  return { x: points.nose.x, y: (face.eyes.y + face.mouth.y) / 2 };
}

// 손이 얼굴 위에 있는가(부위를 가리지 않음).
function handOnFace(hand, points, face) {
  return !!hand && distance(hand, faceCenter(points, face)) < face.unit * 1.75;
}

// 손이 코 근처에 있는가 — 얼굴 가운데 세로줄, 눈부터 입 아래까지.
// 세로 범위가 넓어서 입을 짚어도 통과된다. 의도한 것이다: 코와 입은 얼굴 단위로 0.66칸
// (실제 약 15px)밖에 안 떨어져서, 둘을 정말 가르려면 허용 오차가 그보다 작아야 하는데
// 그러면 아이가 제대로 짚어도 탈락한다. 인식률을 택했다. 좌우(코-귀)는 충분히 멀어서 가른다.
function touchingNose(hand, points, face) {
  return !!hand
    && Math.abs(hand.x - points.nose.x) < face.unit * .95
    && hand.y > face.eyes.y - face.unit * .40
    && hand.y < face.mouth.y + face.unit * .30;
}

// 손이 입 근처에 있는가 — 얼굴 가운데 세로줄, 코 아래부터 턱까지. 턱을 받쳐도 인정한다.
function touchingMouth(hand, points, face) {
  return !!hand
    && Math.abs(hand.x - face.mouth.x) < face.unit * .95
    && hand.y > points.nose.y
    && hand.y < face.chin.y + face.unit * .55;
}

// 손이 같은 쪽 눈 근처(얼굴 위쪽)에 있는가.
function touchingEye(hand, eye, points, face) {
  return !!hand && !!eye
    && distance(hand, eye) < face.unit * 1.5
    && hand.y < points.nose.y + face.unit * .30;
}

// 손이 같은 쪽 귀 근처에 있는가. 귀는 얼굴 가장자리라 "코보다 귀 쪽인가"로 갈린다.
// 1.25배를 준 건 딱 중간선으로 자르면 귀를 제대로 잡아도 안쪽으로 8px만 밀리면 탈락해서다.
function touchingEar(hand, ear, points, face) {
  return !!hand && !!ear && (ear.v ?? 1) >= .30
    && distance(hand, ear) < face.unit * 1.6
    && distance(hand, ear) < distance(hand, points.nose) * 1.25;
}

// 자세를 잡는 순간 넘어가되, 한 프레임 튐으로 오인정되지 않을 만큼만 붙잡아 둔다.
function actionHold(action) {
  return Math.max(1, action?.hold ?? ACTION_HOLD_MS);
}

function actionMetrics(points) {
  const shoulderWidth = Math.max(8, cameraRect.w * .045, distance(points.ls, points.rs));
  const shoulderMid = { x: (points.ls.x + points.rs.x) / 2, y: (points.ls.y + points.rs.y) / 2 };
  const hipMid = { x: (points.lh.x + points.rh.x) / 2, y: (points.lh.y + points.rh.y) / 2 };
  const torso = Math.max(shoulderWidth * .8, distance(shoulderMid, hipMid));
  const leftArm = angle(points.lh, points.ls, points.lw);
  const rightArm = angle(points.rh, points.rs, points.rw);
  const leftElbow = angle(points.ls, points.le, points.lw);
  const rightElbow = angle(points.rs, points.re, points.rw);
  return {
    shoulderWidth, shoulderMid, hipMid, torso, leftArm, rightArm, leftElbow, rightElbow,
    wristGap: distance(points.lw, points.rw)
  };
}

function staticActionMatches(action, points, metric, state) {
  if (!actionRequiredLandmarksUsable(action)) return false;
  if (action.id === "handsUp") {
    return metric.leftArm > 134 && metric.rightArm > 134
      && metric.leftElbow > 108 && metric.rightElbow > 108
      && points.lw.y < points.nose.y + metric.torso * .12
      && points.rw.y < points.nose.y + metric.torso * .12;
  }
  if (action.id === "raiseOneHand") {
    // 한 손은 코 위로, 반대 손은 어깨 아래에 있어야 한다(두 손 다 들면 handsUp이므로 오답).
    const raised = (wrist, elbowAngle) => wrist.y < points.nose.y && elbowAngle > 100;
    const lowered = (wrist) => wrist.y > metric.shoulderMid.y + metric.torso * .18;
    const leftUp = raised(points.lw, metric.leftElbow) && lowered(points.rw);
    const rightUp = raised(points.rw, metric.rightElbow) && lowered(points.lw);
    return leftUp || rightUp;
  }
  if (action.id === "touchFace") {
    // 손이 얼굴 어디든 닿으면 된다(부위를 가리지 않는 가장 쉬운 미션).
    // 반경은 얼굴 크기(unit) 기준이다 — 어깨너비(가로 길이)로 세로 반경까지 재면
    // 화면이 가로로 넓어질 때 판정 범위가 세로로 늘어나 머리 위 만세까지 통과된다.
    // 팔이 몸통과 이루는 각(armAngle)은 보지 않는다 — 거리만으로 이미 만세가 걸러지는데,
    // 어깨가 좁은 아이가 같은 쪽 볼을 짚으면 팔이 거의 수직이 되어 잘못 탈락한다.
    const face = faceMetrics(points);
    const touchesFace = (hand, elbowAngle) => handOnFace(hand, points, face) && elbowAngle < 155;
    const leftTracked = [LM.le, LM.lw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    const rightTracked = [LM.re, LM.rw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    return (leftTracked && touchesFace(handPoint(LM.lw) || points.lw, metric.leftElbow))
      || (rightTracked && touchesFace(handPoint(LM.rw) || points.rw, metric.rightElbow));
  }
  if (action.id === "touchHead") {
    // 손이 정수리 위로 올라가 머리에 얹혀야 한다. 얼굴을 짚는 건 인정하지 않는다.
    const face = faceMetrics(points);
    // 손목이 코보다 위여야 한다는 조건은 뺐다 — 손을 머리에 얹으면 손목은 귀 높이쯤에
    // 오는데, 손바닥이 추정값이라 4px만 어긋나도 탈락했다. 아래 세 조건으로 충분하다.
    const onHead = (hand, elbowAngle) => hand
      && hand.y < face.headTop.y + face.unit * .90
      && Math.abs(hand.x - face.headTop.x) < metric.shoulderWidth * .46
      // 머리 위로 손을 든 것(만세)과 머리에 얹은 것을 가른다.
      && distance(hand, face.headTop) < face.unit * 1.30
      && elbowAngle < 155;
    const leftTracked = [LM.le, LM.lw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    const rightTracked = [LM.re, LM.rw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    return (leftTracked && onHead(handPoint(LM.lw) || points.lw, metric.leftElbow))
      || (rightTracked && onHead(handPoint(LM.rw) || points.rw, metric.rightElbow));
  }
  if (action.id === "touchEars") {
    // 두 손이 각각 같은 쪽 귀에 있어야 한다.
    const face = faceMetrics(points);
    return touchingEar(handPoint(LM.lw) || points.lw, points.lear, points, face)
      && touchingEar(handPoint(LM.rw) || points.rw, points.rear, points, face)
      && metric.leftElbow < 150 && metric.rightElbow < 150;
  }
  if (action.id === "touchNose") {
    // 한 손이 코에 닿고, 반대 손은 얼굴에 없어야 한다(두 손 다 얼굴이면 다른 미션이다).
    const face = faceMetrics(points);
    const left = handPoint(LM.lw) || points.lw, right = handPoint(LM.rw) || points.rw;
    return (touchingNose(left, points, face) && metric.leftElbow < 155 && !handOnFace(right, points, face))
      || (touchingNose(right, points, face) && metric.rightElbow < 155 && !handOnFace(left, points, face));
  }
  if (action.id === "touchMouth") {
    const face = faceMetrics(points);
    const left = handPoint(LM.lw) || points.lw, right = handPoint(LM.rw) || points.rw;
    return (touchingMouth(left, points, face) && metric.leftElbow < 155 && !handOnFace(right, points, face))
      || (touchingMouth(right, points, face) && metric.rightElbow < 155 && !handOnFace(left, points, face));
  }
  if (action.id === "touchEyes") {
    // 두 손이 각각 같은 쪽 눈을 가려야 한다.
    const face = faceMetrics(points);
    return touchingEye(handPoint(LM.lw) || points.lw, points.leye, points, face)
      && touchingEye(handPoint(LM.rw) || points.rw, points.reye, points, face)
      && metric.leftElbow < 155 && metric.rightElbow < 155;
  }
  if (action.id === "tiltHead") {
    // 어깨는 수평인데 두 귀 높이가 눈에 띄게 달라야 고개를 기울인 것이다.
    const face = faceMetrics(points);
    if (!points.lear || !points.rear || points.lear.v < .30 || points.rear.v < .30) return false;
    const earDrop = Math.abs(points.lear.y - points.rear.y);
    const shoulderTilt = Math.abs(points.ls.y - points.rs.y);
    return earDrop > face.unit * .55 && shoulderTilt < metric.shoulderWidth * .18;
  }
  if (action.id === "touchShoulders") {
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return distance(points.lw, points.ls) < metric.shoulderWidth * .68
      && distance(points.rw, points.rs) < metric.shoulderWidth * .68
      && metric.leftElbow < 136 && metric.rightElbow < 136
      && metric.wristGap > metric.shoulderWidth * .65
      && wristMidY < metric.shoulderMid.y + metric.torso * .40;
  }
  if (action.id === "airplane") {
    return metric.leftArm > 62 && metric.leftArm < 116 && metric.rightArm > 62 && metric.rightArm < 116
      && metric.leftElbow > 130 && metric.rightElbow > 130
      && Math.abs(points.lw.y - points.ls.y) < metric.torso * .34
      && Math.abs(points.rw.y - points.rs.y) < metric.torso * .34
      && metric.wristGap > metric.shoulderWidth * 2.0;
  }
  if (action.id === "clap") {
    // 손을 벌렸다(준비) 가슴 앞에서 모아야 손뼉이다. 자연스러운 손뼉 폭이면 준비로 친다.
    if (metric.wristGap > metric.shoulderWidth * .85) state.commandArmed = true;
    const wristMid = { x: (points.lw.x + points.rw.x) / 2, y: (points.lw.y + points.rw.y) / 2 };
    return state.commandArmed && metric.wristGap < metric.shoulderWidth * .48
      && Math.abs(wristMid.x - metric.shoulderMid.x) < metric.shoulderWidth * .48
      // 가슴 높이 — 배나 얼굴 앞에서 친 건 인정하지 않는다.
      && wristMid.y > metric.shoulderMid.y - metric.torso * .05
      && wristMid.y < metric.shoulderMid.y + metric.torso * .50
      && metric.leftElbow > 38 && metric.leftElbow < 155 && metric.rightElbow > 38 && metric.rightElbow < 155;
  }
  if (action.id === "clapHigh") {
    // 손을 벌렸다가 머리 위에서 모아야 한다.
    if (metric.wristGap > metric.shoulderWidth * .85) state.commandArmed = true;
    const wristMid = { x: (points.lw.x + points.rw.x) / 2, y: (points.lw.y + points.rw.y) / 2 };
    return state.commandArmed && metric.wristGap < metric.shoulderWidth * .48
      && Math.abs(wristMid.x - metric.shoulderMid.x) < metric.shoulderWidth * .55
      && wristMid.y < points.nose.y
      && metric.leftElbow > 60 && metric.rightElbow > 60;
  }
  if (action.id === "showMuscles") {
    // 팔꿈치를 어깨 옆으로 벌리고 굽혀 주먹이 팔꿈치보다 위에 온다.
    const elbowGap = distance(points.le, points.re);
    return elbowGap > metric.shoulderWidth * 1.05
      && points.lw.y < points.le.y - metric.torso * .18
      && points.rw.y < points.re.y - metric.torso * .18
      && metric.leftElbow > 30 && metric.leftElbow < 115
      && metric.rightElbow > 30 && metric.rightElbow < 115
      // 주먹이 머리 위로 올라가면 만세다.
      && points.lw.y > points.nose.y && points.rw.y > points.nose.y
      && points.le.y > metric.shoulderMid.y - metric.torso * .10;
  }
  if (action.id === "touchTummy") {
    // 두 손을 모아 배(가슴보다 아래, 허리께)에 얹는다.
    const wristMid = { x: (points.lw.x + points.rw.x) / 2, y: (points.lw.y + points.rw.y) / 2 };
    const crossed = (points.lw.x - points.rw.x) * (points.ls.x - points.rs.x) < 0;
    return !crossed
      && metric.wristGap < metric.shoulderWidth * .95
      && Math.abs(wristMid.x - metric.hipMid.x) < metric.shoulderWidth * .42
      && wristMid.y > metric.shoulderMid.y + metric.torso * .58
      && wristMid.y < metric.hipMid.y + metric.torso * .16
      && metric.leftElbow < 145 && metric.rightElbow < 145;
  }
  if (action.id === "reachSide") {
    // 한 팔만 어깨높이로 옆으로 뻗고 반대 손은 내린다(두 팔이면 비행기).
    const reaching = (wrist, shoulder, armAngle, elbowAngle, otherWrist) =>
      armAngle > 62 && armAngle < 118 && elbowAngle > 130
      && Math.abs(wrist.y - shoulder.y) < metric.torso * .34
      && Math.abs(wrist.x - metric.shoulderMid.x) > metric.shoulderWidth * .95
      && otherWrist.y > metric.shoulderMid.y + metric.torso * .45;
    return reaching(points.lw, points.ls, metric.leftArm, metric.leftElbow, points.rw)
      || reaching(points.rw, points.rs, metric.rightArm, metric.rightElbow, points.lw);
  }
  if (action.id === "handsOnHips") {
    const elbowGap = distance(points.le, points.re);
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return distance(points.lw, points.lh) < metric.shoulderWidth * .76
      && distance(points.rw, points.rh) < metric.shoulderWidth * .76
      && metric.leftElbow < 138 && metric.rightElbow < 138
      && elbowGap > metric.shoulderWidth * 1.38
      && Math.abs(wristMidY - metric.hipMid.y) < metric.torso * .36;
  }
  if (action.id === "touchElbow") {
    // 한 손으로 반대쪽 팔꿈치를 잡는다.
    const grabs = (hand, otherElbow, elbowAngle) => hand
      && distance(hand, otherElbow) < metric.shoulderWidth * .42
      && elbowAngle < 155;
    return grabs(handPoint(LM.lw) || points.lw, points.re, metric.leftElbow)
      || grabs(handPoint(LM.rw) || points.rw, points.le, metric.rightElbow);
  }
  if (action.id === "crossArmsHigh") {
    // 머리 위에서 두 팔을 X자로 겹친다(가슴 앞 X자·머리 위 손뼉과 구분된다).
    const crossed = (points.lw.x - points.rw.x) * (points.ls.x - points.rs.x) < 0;
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return crossed
      && wristMidY < points.nose.y
      && metric.wristGap > metric.shoulderWidth * .35
      && metric.leftElbow > 95 && metric.rightElbow > 95;
  }
  if (action.id === "crossArms") {
    // 두 손목이 가슴 앞에서 서로 반대쪽으로 넘어가야 X자다.
    const crossed = (points.lw.x - points.rw.x) * (points.ls.x - points.rs.x) < 0;
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return crossed
      && metric.leftElbow < 140 && metric.rightElbow < 140
      && wristMidY > metric.shoulderMid.y
      && wristMidY < metric.hipMid.y
      && metric.wristGap > metric.shoulderWidth * .30;
  }
  return false;
}

function completeActionMission() {
  if (gameState.advancing || gameState.sessionComplete) return;
  const action = gameState.currentAction;
  gameState.completed++;
  gameState.reps = gameState.completed;
  gameState.matching = true;
  gameState.progress = 1;
  gameState.advancing = true;
  inputLockedUntil = Infinity;
  const point = exerciseFeedbackPoint(.42);
  award(170, point.x, point.y, `${action.en.replace("!", "")} ✓`, `${gameState.completed}/${gameState.commands.length} · ${action.ko}`);
  updateGameCue();
  const completedState = gameState;
  const nextIndex = gameState.commandIndex + 1;
  const token = ++speechRoundToken;
  const celebratedAt = performance.now();
  let moved = false;
  const moveNext = () => {
    if (moved || token !== speechRoundToken || gameState !== completedState) return;
    moved = true;
    if (nextIndex >= completedState.commands.length) {
      finishRunSoon(`🎉 영어 동작 ${completedState.commands.length}개 완주!`, "서로 다른 명령을 모두 따라 했어요", 1050);
      return;
    }
    activateActionCommand(completedState, nextIndex);
    inputLockedUntil = performance.now() + 180;
    updateGameCue();
    scheduleRoundAnnouncement(220);
  };
  if (selfTesting) { moveNext(); return; }
  const moveAfterMinimum = () => {
    const wait = 780 - (performance.now() - celebratedAt);
    if (wait > 0) setTimeout(moveNext, wait);
    else moveNext();
  };
  const spoken = speakEnglish("Great job!", true, moveAfterMinimum);
  setTimeout(moveAfterMinimum, spoken ? 1150 : 780);
}

function updateActionGame(dt) {
  const state = gameState;
  if (!state || state.advancing || state.sessionComplete) return;
  const points = posePoints();
  if (!points || (!selfTesting && performance.now() < state.introUntil)) return;
  const action = state.currentAction;
  if (!actionRequiredLandmarksUsable(action)) {
    state.matching = false;
    state.progress = 0;
    return;
  }
  const metric = actionMetrics(points);
  const hold = actionHold(action);
  const posed = staticActionMatches(action, points, metric, state);
  if (!posed) state.needsRelease = false;
  state.matching = posed && !state.needsRelease;
  state.stableMs = state.matching ? state.stableMs + dt : Math.max(0, state.stableMs - dt * 1.5);
  state.progress = clamp(state.stableMs / hold, 0, 1);
  if (state.stableMs >= hold) completeActionMission();
  updateGameCue();
}
function updateGame(dt) {
  if (selectedGame === "squat") updateActionGame(dt);
  else updateTouchGame(dt);
}

function shouldAdvanceGameClock(usable) {
  return running && usable && !gameState?.advancing && !gameState?.sessionComplete;
}

function updateGameCue() {
  if (!gameState) return;
  if (selectedGame === "sequence") {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    const next = gameState.targets[gameState.current - 1]?.value || "";
    const progress = gameState.targets.map((target) => target.order < gameState.current ? target.value : "_").join(" ");
    setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko}의 철자를 완성해요!`, `${progress} · 다음 글자 ${next} · 단어 ${completedWordCount + 1}/${SPELLING_GOAL}`);
  } else if (selectedGame === "math") {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    setCue(`${gameState.prompt.emoji} ${withObjectParticle(gameState.prompt.ko)} 찾으세요!`, `알맞은 영어 단어를 골라요 · ${completedWordCount + 1}/${PICTURE_GOAL}`);
  } else if (selectedGame === "squat") {
    const action = gameState.currentAction;
    if (!action) return;
    if (gameState.advancing) {
      setCue(`${action.emoji} GREAT JOB! ✓`, `미션 ${gameState.completed}/${gameState.commands.length} 완료`);
      return;
    }
    setCue(`${gameState.completed + 1}/${gameState.commands.length} · ${action.emoji} ${action.en}`, action.ko);
  } else if (selectedGame === "color") {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    const left = gameState.targets[0]?.value || "";
    const right = gameState.targets[1]?.value || "";
    const title = `${gameState.prompt.emoji} ${withObjectParticle(gameState.prompt.ko)} 찾으세요!`;
    const hint = `빠르게 정답 색 구름을 콕! · ${completedWordCount + 1}/${COLOR_GOAL}`;
    const accessible = `${title} 왼쪽 ${left}. 오른쪽 ${right}. ${hint}`;
    setCue(title, hint, accessible);
  }
}

function poseUsable(now = performance.now()) {
  motionDiagnostics.poseAgeMs = Math.round(currentPoseAge(now));
  if (!lastPose || currentPoseAge(now) > POSE_FRESH_MS) return false;
  if (selectedGame === "squat" && gameState?.currentAction) {
    return actionRequiredLandmarksUsable(gameState.currentAction);
  }
  if (!requiredIndices(selectedGame).every((index) => landmarkVisible(lastPose[index], .32))) return false;
  if (selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") {
    return [LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index], .012));
  }
  return true;
}

function trackingGuidance(now = performance.now()) {
  if (!lastPose || currentPoseAge(now) > POSE_FRESH_MS) {
    return selectedGame === "squat"
      ? ["몸을 다시 찾아요", "얼굴·어깨와 두 팔이 보이게 가운데에 서요"]
      : ["손을 다시 찾아요", "얼굴·어깨와 한 손을 화면 안에 보여 주세요"];
  }
  if (selectedGame === "squat") return ["팔을 다시 찾아요", "현재 동작에 쓰는 손과 팔을 보여 주세요"];
  if (![LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index], .012))) {
    return ["손이 화면 밖에 있어요", "한 손을 화면 안쪽으로 넣어 주세요"];
  }
  return ["동작을 다시 찾아요", "카메라 가운데에 서 주세요"];
}

function updateHUD() {
  const remaining = Math.max(0, Math.ceil((games[selectedGame].ms - gameElapsed) / 1000));
  ui.score.textContent = `★ ${hits}`;
  const successes = selectedGame === "squat" ? (gameState?.completed || 0) : completedWordCount;
  ui.combo.textContent = `🌟 ${successes}`;
  ui.time.textContent = remaining <= 10 ? "마무리" : "놀이 중";
}

function smoothPose(raw, now) {
  if (!lastPose || now - poseTimestamp > 350) return raw.map((point) => ({ ...point }));
  const dt = clamp(now - poseTimestamp, 16, POSE_DT_MAX_MS);
  return raw.map((point, index) => {
    const previous = lastPose[index];
    if (!previous || !landmarkVisible(point, .25)) return { ...point };
    const tau = index >= LM.lw && index <= LM.ri ? 48 : 82;
    const alpha = 1 - Math.exp(-dt / tau);
    return { ...point, x: lerp(previous.x, point.x, alpha), y: lerp(previous.y, point.y, alpha), z: lerp(previous.z || 0, point.z || 0, alpha) };
  });
}

function detectPose(now) {
  if ((!poseWorkerReady && !poseLandmarker) || video.readyState < 2 || video.currentTime === lastVideoTime || now - lastInferenceAt < adaptiveInferenceInterval) return;
  if (poseInferenceBusy) {
    motionDiagnostics.droppedFrames += 1;
    return;
  }
  poseInferenceBusy = true;
  poseInferenceStartedAt = now;
  lastInferenceAt = now;
  lastVideoTime = video.currentTime;
  if (poseWorkerReady && poseWorker) {
    const worker = poseWorker;
    const generation = poseWorkerGeneration;
    const frameGeneration = cameraFrameGeneration;
    let captureSettled = false;
    const captureTimeout = setTimeout(() => {
      if (captureSettled) return;
      captureSettled = true;
      poseInferenceBusy = false;
      handlePoseRuntimeFailure(new Error("카메라 프레임 준비 시간이 초과됐습니다."), true);
    }, 700);
    createImageBitmap(video).then((bitmap) => {
      if (captureSettled) {
        bitmap.close?.();
        return;
      }
      captureSettled = true;
      clearTimeout(captureTimeout);
      poseInferenceBusy = false;
      if (poseWorker !== worker || !poseWorkerReady || generation !== poseWorkerGeneration || frameGeneration !== cameraFrameGeneration) {
        bitmap.close?.();
        return;
      }
      try {
        worker.postMessage({ type: "frame", bitmap, timestamp: now, generation, frameGeneration }, [bitmap]);
      } catch (error) {
        bitmap.close?.();
        handlePoseRuntimeFailure(error, true);
      }
    }).catch((error) => {
      if (captureSettled) return;
      captureSettled = true;
      clearTimeout(captureTimeout);
      poseInferenceBusy = false;
      handlePoseRuntimeFailure(error, true);
    });
    return;
  }
  const inferenceStartedAt = performance.now();
  try {
    const result = poseLandmarker.detectForVideo(video, now);
    acceptPoseResult(result.landmarks?.[0], result.worldLandmarks?.[0], now, performance.now() - inferenceStartedAt);
  } catch (error) {
    handlePoseRuntimeFailure(error);
  } finally {
    poseInferenceBusy = false;
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, viewW, viewH);
  if (bg.complete && bg.naturalWidth) {
    const scale = Math.max(viewW / bg.naturalWidth, viewH / bg.naturalHeight);
    const w = bg.naturalWidth * scale, h = bg.naturalHeight * scale;
    ctx.drawImage(bg, (viewW - w) / 2, (viewH - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#a8e9ff";
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (video.readyState >= 2 && !demo) {
    ctx.save();
    ctx.globalAlpha = .92;
    ctx.translate(cameraRect.x + cameraRect.w, cameraRect.y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cameraRect.w, cameraRect.h);
    ctx.restore();
    ctx.fillStyle = "#fffaf010";
    ctx.fillRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    ctx.strokeStyle = "#ffffffdd";
    ctx.lineWidth = 4;
    ctx.strokeRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    if (!running) {
      const cameraHint = selectedGame === "squat" ? "얼굴과 두 손을 보여요 🙌" : "손을 흔들어요 👋";
      drawCanvasPill(cameraRect.x + 70, cameraRect.y + 18, cameraHint, "#28775f", true);
    }
  }
}

function poseIsFresh(now = performance.now()) {
  return !!lastPose && currentPoseAge(now) <= POSE_FRESH_MS;
}

function landmarkSignal(index) {
  const landmark = lastPose?.[index];
  return landmark ? clamp(Math.min(landmark.visibility ?? 1, landmark.presence ?? 1), 0, 1) : 0;
}

function focusJointSet() {
  if (selectedGame === "squat") return new Set(gameState?.currentAction?.focus || [LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk]);
  return new Set([LM.lw, LM.rw]);
}

function jointVisualColor(index, signal = landmarkSignal(index)) {
  if (signal < .35) return "#8c879b";
  if (signal < .58) return "#ffb15b";
  if (selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") {
    if (index === LM.lw) return "#38f6ff";
    if (index === LM.rw) return "#ff3ea5";
  }
  if (selectedGame === "squat" && (ARM_JOINTS.has(index) || FACE_JOINTS.has(index) || index === LM.ls || index === LM.rs)) {
    if (gameState?.matching && (gameState?.progress ?? 0) >= .7) return "#c8ff3d";
    return gameState?.matching ? "#ffb15b" : "#38f6ff";
  }
  return "#dce7ef";
}

function drawCanvasPill(cx, cy, text, color = "#28aeea", small = false) {
  ctx.save();
  ctx.font = `800 ${small ? 9 : viewW < 700 ? 11 : 12}px Nunito`;
  const width = clamp(ctx.measureText(text).width + (small ? 14 : 20), 44, viewW < 700 ? 150 : 190);
  const height = small ? 20 : 26;
  const x = clamp(cx - width / 2, cameraRect.x + 7, cameraRect.x + cameraRect.w - width - 7);
  const y = clamp(cy - height / 2, cameraRect.y + 7, cameraRect.y + cameraRect.h - height - 7);
  const cut = 6;
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + cut); ctx.closePath();
  ctx.fillStyle = "#fffaf0ed";
  ctx.strokeStyle = `${color}bb`;
  ctx.lineWidth = 1;
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#27334d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2 + .5, width - 10);
  ctx.restore();
}

function drawPose(now = performance.now()) {
  if (!poseIsFresh(now) || demo) return;
  const focus = focusJointSet();
  const points = new Map(POSE_JOINTS.map((index) => [index, posePoint(index)]));
  const baseWidth = viewW < 700 ? 2 : 3;
  ctx.save();

  ctx.beginPath();
  for (const [a, b] of SKELETON) {
    const p = points.get(a), q = points.get(b);
    if (p?.v < .35 || q?.v < .35) continue;
    ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
  }
  ctx.strokeStyle = "#dce7ef73";
  ctx.lineWidth = baseWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  for (const [a, b] of SKELETON) {
    if (!focus.has(a) || !focus.has(b)) continue;
    const p = points.get(a), q = points.get(b);
    if (p?.v < .35 || q?.v < .35) continue;
    const signal = Math.min(landmarkSignal(a), landmarkSignal(b));
    const color = jointVisualColor(b, signal);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = clamp((signal - .25) / .5, .35, 1);
    ctx.lineWidth = baseWidth + 1.5;
    ctx.stroke();
  }

  for (const index of POSE_JOINTS) {
    const point = points.get(index);
    const signal = landmarkSignal(index);
    if (!point || signal < .28) continue;
    const isHand = index === LM.lw || index === LM.rw;
    const isFocus = focus.has(index);
    const radius = isHand ? (viewW < 700 ? 6.5 : 8.5) : MAJOR_JOINTS.has(index) ? (viewW < 700 ? 4 : 5) : (viewW < 700 ? 3 : 4);
    const color = jointVisualColor(index, signal);
    ctx.globalAlpha = isHand ? 1 : isFocus ? .88 : clamp((signal - .25) / .65, .4, .68);
    ctx.shadowBlur = isFocus ? (isHand ? 8 : 5) : 0;
    ctx.shadowColor = color;
    ctx.fillStyle = "#05040b";
    ctx.strokeStyle = color;
    ctx.lineWidth = isFocus ? 2.2 : 1.4;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (isFocus) {
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 3.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();

  if (running && selectedGame === "squat" && gameState?.currentAction) {
    const shoulders = [points.get(LM.ls), points.get(LM.rs)];
    if (shoulders.every((point) => point?.v > .35)) {
      const label = gameState.matching
        ? `${Math.round((gameState.progress || 0) * 100)}% ✓`
        : gameState.currentAction.en.replace("!", "");
      drawCanvasPill((shoulders[0].x + shoulders[1].x) / 2, Math.min(shoulders[0].y, shoulders[1].y) - 26, label, gameState.matching ? "#c8ff3d" : "#38f6ff", true);
    }
  }
}

function drawHandCursors(now = performance.now()) {
  if (!running || demo || !poseIsFresh(now) || !poseUsable(now) || (selectedGame !== "sequence" && selectedGame !== "math" && selectedGame !== "color")) return;
  const hitRadius = targetRadius();
  for (const [index, baseColor] of [[LM.lw, "#38f6ff"], [LM.rw, "#ff3ea5"]]) {
    const point = handPoint(index);
    if (!point || point.v < .30) continue;
    const trail = wristTrails[index];
    const last = trail[trail.length - 1];
    if (!last || distance(last, point) > 2 || now - last.t > 42) trail.push({ x: point.x, y: point.y, t: now });
    wristTrails[index] = trail.filter((sample) => now - sample.t < 330).slice(-10);
    const touching = !!gameState?.inputReady && gameState?.targets?.some((target) => {
      if (selectedGame === "sequence" && target.order !== gameState.current) return false;
      return pointInsideTarget(point, target, hitRadius);
    });
    const color = touching ? "#ffb15b" : baseColor;
    ctx.save();
    const samples = wristTrails[index];
    for (let i = 1; i < samples.length; i++) {
      const alpha = i / samples.length * .3;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1 + i / samples.length * 2;
      ctx.beginPath(); ctx.moveTo(samples[i - 1].x, samples[i - 1].y); ctx.lineTo(samples[i].x, samples[i].y); ctx.stroke();
    }
    const radius = viewW < 700 ? 10 : 12;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius + 4 + Math.sin(now / 90) * 1.5, -.35, Math.PI * 1.25); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function trackingSignal() {
  if (!lastPose) return 0;
  if (selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") {
    const core = requiredIndices(selectedGame).map(landmarkSignal);
    return Math.min(...core, Math.max(landmarkSignal(LM.lw), landmarkSignal(LM.rw)));
  }
  return Math.min(...requiredIndices(selectedGame).map(landmarkSignal));
}

function drawTrackingSignal(now = performance.now()) {
  if (demo || !poseIsFresh(now)) return;
  const signal = trackingSignal();
  const color = signal >= .65 ? "#c8ff3d" : signal >= .30 ? "#ffb15b" : "#ff6b7f";
  drawCanvasPill(cameraRect.x + cameraRect.w - 48, cameraRect.y + 17, `TRACK ${Math.round(signal * 100)}%`, color, true);
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTargetCircle(target, active = true) {
  const point = targetPoint(target);
  const radius = targetRadius();
  const isWordChoice = selectedGame === "math" || selectedGame === "color";
  const shapeW = isWordChoice ? radius * 2.9 : radius * 2;
  const shapeH = isWordChoice ? radius * 1.65 : radius * 2;
  const now = performance.now();
  const wrong = now < target.flashUntil;
  const locked = gameState?.inputReady === false && !wrong;
  const progress = clamp((target.dwell || 0) / TOUCH_DWELL_MS, 0, 1);
  const color = wrong ? "#f2ad21" : locked ? "#9ba7b6" : active ? (progress > .55 ? "#39c594" : "#28aeea") : "#a9b4c5";
  const shake = wrong ? Math.sin((target.flashUntil - now) / 24) * Math.min(6, (target.flashUntil - now) / 50) : 0;
  ctx.save();
  ctx.translate(point.x + shake, point.y);
  ctx.shadowBlur = active && !locked ? (viewW < 700 ? 14 : 20) : 0;
  ctx.shadowColor = color;
  ctx.fillStyle = wrong ? "#fff2c9ee" : locked ? "#eef2f5dd" : "#fffaf0ee";
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 4 : 2;
  if (locked) ctx.setLineDash([6, 6]);
  if (isWordChoice) roundedRectPath(-shapeW / 2, -shapeH / 2, shapeW, shapeH, shapeH * .42);
  else { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); }
  ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  if (active && !locked) {
    ctx.globalAlpha = .4 + .22 * Math.sin(now / 120);
    if (isWordChoice) roundedRectPath(-shapeW / 2 - 7, -shapeH / 2 - 7, shapeW + 14, shapeH + 14, shapeH * .48);
    else { ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, Math.PI * 2); }
    ctx.stroke();
  }
  if (active && progress > 0) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#39c594";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isWordChoice) {
      ctx.moveTo(-shapeW * .38, shapeH / 2 + 10);
      ctx.lineTo(-shapeW * .38 + shapeW * .76 * progress, shapeH / 2 + 10);
    } else {
      ctx.arc(0, 0, radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = wrong ? "#9b651b" : "#27334d";
  ctx.font = `400 ${Math.round(radius * (isWordChoice ? .52 : .78))}px Jua`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (wrong) {
    ctx.fillText("↻", 0, isWordChoice ? -radius * .20 : 1);
    ctx.font = `400 ${Math.round(radius * (isWordChoice ? .32 : .38))}px Jua`;
    ctx.fillText(target.value, 0, isWordChoice ? radius * .32 : radius * .48);
  } else ctx.fillText(target.value, 0, 1);
  ctx.restore();
}

function drawLearningPrompt() {
  if (!gameState?.prompt || (selectedGame !== "sequence" && selectedGame !== "math" && selectedGame !== "color")) return;
  const compactLandscape = viewH < 420 && viewW > viewH;
  const prompt = gameState.prompt;
  const x = cameraRect.x + cameraRect.w / 2;
  let y = cameraRect.y + (compactLandscape ? 52 : 42);
  const progress = selectedGame === "sequence"
    ? [...prompt.word].map((letter, index) => index < gameState.current - 1 ? letter : "_").join(" ")
    : prompt.ko;
  const text = `${prompt.emoji}  ${progress}`;
  ctx.save();
  ctx.font = `400 ${compactLandscape ? 18 : viewW < 700 ? 24 : 30}px Jua`;
  const width = clamp(ctx.measureText(text).width + 30, 112, Math.max(112, cameraRect.w - 24));
  const height = compactLandscape ? 34 : viewW < 700 ? 48 : 58;
  if (!ui.cue.classList.contains("hidden")) {
    const appBounds = app.getBoundingClientRect();
    const cueBounds = ui.cue.getBoundingClientRect();
    const cueLeft = cueBounds.left - appBounds.left;
    const cueRight = cueBounds.right - appBounds.left;
    const cueBottom = cueBounds.bottom - appBounds.top;
    const overlapsHorizontally = cueRight > x - width / 2 - 8 && cueLeft < x + width / 2 + 8;
    if (compactLandscape && overlapsHorizontally) {
      ctx.restore();
      return;
    }
    if (overlapsHorizontally && cueBottom > cameraRect.y - 8) y = Math.max(y, cueBottom + height / 2 + 8);
  }
  y = clamp(y, cameraRect.y + height / 2 + 7, cameraRect.y + cameraRect.h - height / 2 - 7);
  roundedRectPath(x - width / 2, y - height / 2, width, height, height / 2);
  ctx.fillStyle = "#fffaf0f2";
  ctx.strokeStyle = "#ffd65a";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ffd65a66";
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#27334d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1, width - 18);
  ctx.restore();
}

function drawTouchGame() {
  if (!gameState?.targets) return;
  drawLearningPrompt();
  for (const target of gameState.targets) {
    const active = selectedGame !== "sequence" || target.order === gameState.current;
    const completed = selectedGame === "sequence" && target.order < gameState.current;
    if (!completed) drawTargetCircle(target, active);
    else {
      const point = targetPoint(target);
      const radius = targetRadius() * .48;
      ctx.save();
      ctx.fillStyle = "#e7fff5ee";
      ctx.strokeStyle = "#39c594";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#27334d";
      ctx.font = `400 ${Math.round(radius * .9)}px Jua`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.value, point.x, point.y + 1);
      ctx.fillStyle = "#39c594";
      ctx.font = `700 ${Math.round(radius * .68)}px Nunito`;
      ctx.fillText("✓", point.x + radius * .7, point.y - radius * .65);
      ctx.restore();
    }
  }
}

function drawExerciseGame() {
  const reps = gameState?.completed || 0;
  const color = "#c8ff3d";
  const x = viewW < 700 ? 70 : 110;
  const y = viewH * .56;
  const now = performance.now();
  let repScale = 1;
  for (let index = feedbacks.length - 1; index >= 0; index--) {
    const feedback = feedbacks[index];
    if (feedback.type !== "good" || feedback.mode !== selectedGame) continue;
    const progress = (now - feedback.startedAt) / feedback.duration;
    if (progress >= 0 && progress < 1) repScale += Math.sin(progress * Math.PI) * .18;
    break;
  }
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.font = `700 ${(viewW < 700 ? 54 : 80) * repScale}px IBM Plex Sans KR`;
  ctx.fillText(reps, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "700 11px IBM Plex Sans KR";
  const total = gameState?.commands?.length || ACTION_ROUND_MISSIONS;
  ctx.fillText(`MISSIONS / ${total}`, x, y + 24);
  const gap = viewW < 700 ? 12 : 16;
  const start = x - (total - 1) * gap / 2;
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(start + i * gap, y + 48, i === gameState.commandIndex ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i < gameState.completed ? "#c8ff3d" : i === gameState.commandIndex ? "#ffb15b" : "#ffffff55";
    ctx.fill();
  }
  ctx.restore();
}

function drawCalibrationGuide() {
  if (!calibrating || demo) return;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = analyzeFit().good ? "#c8ff3d99" : "#ff9f4388";
  ctx.lineWidth = 2;
  ctx.strokeRect(cameraRect.x + cameraRect.w * .06, cameraRect.y + cameraRect.h * .04, cameraRect.w * .88, cameraRect.h * .92);
  ctx.restore();
}

function drawFeedbackCard(feedback, ringRadius, alpha) {
  const compactLandscape = viewH < 420 && viewW > viewH;
  const color = feedback.type === "good" ? "#39c594" : "#f2ad21";
  const title = compactLandscape && feedback.detail
    ? `⭐ ${feedback.detail}  +${feedback.gain}`
    : feedback.type === "good" ? `⭐ ${feedback.label}  +${feedback.gain}` : `↻ ${feedback.label}`;
  const detail = compactLandscape ? "" : feedback.detail || (feedback.type !== "good" ? "괜찮아요 · 한 번 더!" : "");
  const titleSize = compactLandscape ? 12 : viewW < 700 ? 14 : 17;
  const detailSize = viewW < 700 ? 9 : 10;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `400 ${titleSize}px Jua`;
  const titleWidth = ctx.measureText(title).width;
  ctx.font = `700 ${detailSize}px IBM Plex Sans KR`;
  const detailWidth = detail ? ctx.measureText(detail).width : 0;
  const maxWidth = Math.max(92, cameraRect.w - 20);
  const width = clamp(Math.max(titleWidth, detailWidth) + (compactLandscape ? 18 : 24), 96, Math.min(compactLandscape ? 168 : viewW < 700 ? 220 : 280, maxWidth));
  const height = compactLandscape ? 27 : detail ? 43 : 31;
  const above = feedback.y > cameraRect.y + cameraRect.h * .38;
  const desiredY = above ? feedback.y - ringRadius - height - 12 : feedback.y + ringRadius + 12;
  const x = clamp(feedback.x - width / 2, cameraRect.x + 10, cameraRect.x + cameraRect.w - width - 10);
  const y = clamp(desiredY, cameraRect.y + 34, cameraRect.y + cameraRect.h - height - 10);
  const cut = 8;
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + cut); ctx.closePath();
  ctx.fillStyle = "#fffaf0f2";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = `${color}88`;
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = `400 ${titleSize}px Jua`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + width / 2, y + (detail ? 15 : height / 2), width - 12);
  if (detail) {
    ctx.fillStyle = "#5f6c84";
    ctx.font = `800 ${detailSize}px Nunito`;
    ctx.fillText(detail, x + width / 2, y + 31, width - 12);
  }
  ctx.restore();
}

function drawFeedbacks(now = performance.now()) {
  const compactLandscape = viewH < 420 && viewW > viewH;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const newestGood = [...feedbacks].reverse().find((feedback) => feedback.type === "good");
  if (newestGood && !reduceMotion) {
    const flashAge = now - newestGood.startedAt;
    if (flashAge >= 0 && flashAge < 190) {
      const alpha = (1 - flashAge / 190) * .09;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#c8ff3d";
      ctx.fillRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
      ctx.globalAlpha = alpha * 5;
      ctx.strokeStyle = "#c8ff3d";
      ctx.lineWidth = viewW < 700 ? 4 : 6;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#c8ff3d";
      ctx.strokeRect(cameraRect.x + 3, cameraRect.y + 3, cameraRect.w - 6, cameraRect.h - 6);
      ctx.restore();
    }
  }

  for (const feedback of feedbacks) {
    const progress = clamp((now - feedback.startedAt) / feedback.duration, 0, 1);
    if (progress >= 1) continue;
    const color = feedback.type === "good" ? "#39c594" : "#f2ad21";
    const fade = progress < .72 ? 1 : 1 - (progress - .72) / .28;
    const expansion = 1 - Math.pow(1 - progress, 3);
    const radius = feedback.radius * (1 + expansion * .5);
    ctx.save();
    ctx.translate(feedback.x, feedback.y);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}24`;
    ctx.lineWidth = feedback.type === "good" ? 4 : 3;
    ctx.shadowBlur = viewW < 700 ? 10 : 16;
    ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = fade * .5;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, radius + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = fade;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = viewW < 700 ? 6 : 8;
    ctx.beginPath();
    if (feedback.type === "good") {
      ctx.moveTo(-radius * .34, 0); ctx.lineTo(-radius * .08, radius * .25); ctx.lineTo(radius * .38, -radius * .27);
    } else {
      ctx.arc(0, 0, radius * .28, -.25, Math.PI * 1.55);
    }
    ctx.stroke();
    ctx.restore();
    if (compactLandscape) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = color;
      ctx.font = "700 10px IBM Plex Sans KR";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        feedback.type === "good" ? `+${feedback.gain}` : "한 번 더!",
        feedback.x,
        feedback.y + radius * .55
      );
      ctx.restore();
    } else {
      drawFeedbackCard(feedback, radius, fade);
    }
  }
  feedbacks = feedbacks.filter((feedback) => now - feedback.startedAt < feedback.duration);
}

function drawEffects(frameDt = 16, now = performance.now()) {
  ctx.save();
  drawFeedbacks(now);
  const frameScale = clamp(frameDt / 16.67, 0, 3);
  particles.forEach((particle) => {
    particle.x += particle.vx * frameScale; particle.y += particle.vy * frameScale;
    particle.vx *= Math.pow(.96, frameScale); particle.vy *= Math.pow(.96, frameScale);
    particle.life -= frameDt / 450;
    ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 3, 3);
  });
  particles = particles.filter((particle) => particle.life > 0);
  ripples.forEach((ripple) => {
    ripple.r = Math.min(ripple.maxR || 100, ripple.r + 9 * frameScale);
    ripple.alpha -= frameDt / 320;
    ctx.globalAlpha = Math.max(0, ripple.alpha); ctx.strokeStyle = ripple.color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2); ctx.stroke();
  });
  ripples = ripples.filter((ripple) => ripple.alpha > 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function burst(x, y, color) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const compactLandscape = viewH < 420 && viewW > viewH;
  ripples.push({
    x, y, r: 8,
    maxR: compactLandscape ? clamp(targetRadius() * 1.35, 34, 40) : clamp(targetRadius() * 1.7, 50, 92),
    alpha: 1, color
  });
  const count = viewW < 700 ? 10 : 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 7;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
  }
  particles = particles.slice(-(viewW < 700 ? 48 : 96));
}

function drawTrackingPause() {
  const [title, detail] = trackingGuidance();
  ctx.save();
  ctx.fillStyle = "#030207aa";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = "#ffb15b";
  ctx.textAlign = "center";
  ctx.font = `700 ${viewW < 700 ? 22 : 30}px IBM Plex Sans KR`;
  ctx.fillText(title, viewW / 2, viewH / 2);
  ctx.fillStyle = "#c9c5d1";
  ctx.font = "400 13px IBM Plex Sans KR";
  ctx.fillText(`${detail} · 게임 시간은 멈춰 있어요`, viewW / 2, viewH / 2 + 30);
  ctx.restore();
}

function render(now) {
  const rawFrameDt = Math.max(0, now - lastFrameAt);
  const frameDt = clamp(rawFrameDt, 0, 100);
  const elapsedDt = clamp(rawFrameDt, 0, 250);
  lastFrameAt = now;
  drawBackground();
  if (!demo) detectPose(now);
  drawPose(now);
  drawCalibrationGuide();
  if (calibrating) updateCalibration(now);

  if (running) {
    const usable = demo || poseUsable(now);
    let trackingPaused = false;
    if (usable) {
      lastUsablePoseAt = demo ? now : poseTimestamp;
      trackingInvalidSince = 0;
      trackingInputReset = false;
      if (shouldAdvanceGameClock(usable)) gameElapsed += elapsedDt;
      if (demo || poseVersion !== evaluatedPoseVersion) {
        const captureAt = poseCaptureTimestamp || poseTimestamp;
        const poseGap = lastPoseEvalAt ? captureAt - lastPoseEvalAt : adaptiveInferenceInterval;
        if (!demo && poseGap > POSE_FRESH_MS) rearmGameInput();
        else updateGame(demo ? frameDt : clamp(poseGap, 16, POSE_DT_MAX_MS));
        evaluatedPoseVersion = poseVersion;
        lastPoseEvalAt = captureAt;
      }
      setTracking(demo ? "체험 모드" : "동작 인식 중", "good");
    } else {
      trackingInvalidSince ||= now;
      const invalidFor = now - trackingInvalidSince;
      if (invalidFor >= 140 && !trackingInputReset) {
        rearmGameInput();
        trackingInputReset = true;
      }
      const [trackingTitle] = trackingGuidance(now);
      setTracking(trackingTitle, "warn");
      trackingPaused = invalidFor >= 220;
    }
    trackingWasPaused = trackingPaused;
    if (selectedGame === "squat") drawExerciseGame(); else drawTouchGame();
    drawHandCursors(now);
    drawEffects(frameDt, now);
    drawTrackingSignal(now);
    if (trackingPaused) drawTrackingPause();
    updateHUD();
    if (gameElapsed >= games[selectedGame].ms && !gameState?.advancing && !gameState?.sessionComplete) endGame();
  }

  if (running || calibrating || countdownActive) renderFrameId = requestAnimationFrame(render);
  else {
    renderLoopActive = false;
    renderFrameId = 0;
  }
}

function startRenderLoop() {
  if (renderLoopActive) return;
  renderLoopActive = true;
  lastFrameAt = performance.now();
  renderFrameId = requestAnimationFrame(render);
}

function endGame() {
  running = false;
  speechRoundToken++;
  try { speechSynthesis.cancel(); } catch {}
  hide(ui.cue, ui.demoHelp, ui.motionArt, ui.listen, ui.home);
  const total = hits + misses;
  ui.resultTitle.textContent = completedRun ? "모든 미션을 완주했어요!" : "오늘도 정말 잘했어요!";
  ui.finalScore.textContent = `${hits}개`;
  if (selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") {
    ui.resultMetricLabel.textContent = selectedGame === "color" ? "배운 색깔" : "배운 영어";
    ui.resultStreakLabel.textContent = "최고 연속";
    ui.accuracy.textContent = `${completedWordCount}개`;
    ui.maxCombo.textContent = maxCombo;
  } else if (selectedGame === "squat") {
    ui.resultMetricLabel.textContent = "완료한 동작";
    ui.resultStreakLabel.textContent = "미션 목표";
    ui.accuracy.textContent = `${gameState?.completed || 0}/${gameState?.commands?.length || ACTION_ROUND_MISSIONS}`;
    ui.maxCombo.textContent = `${gameState?.commands?.length || ACTION_ROUND_MISSIONS}개`;
  } else {
    ui.resultMetricLabel.textContent = "도전 횟수";
    ui.resultStreakLabel.textContent = "최고 연속";
    ui.accuracy.textContent = `${total}번`;
    ui.maxCombo.textContent = maxCombo;
  }
  ui.grade.textContent = hits >= 8 ? "🏆" : hits >= 4 ? "🌟" : "🌈";
  wakeLock?.release?.().catch(() => {});
  tone(660, .18, "triangle", .08);
  setTimeout(() => tone(880, .35, "triangle", .08), 180);
  show(ui.result);
  ui.result.focus({ preventScroll: true });
}

function returnToMenu() {
  cameraAttemptId += 1;
  cameraStartInProgress = false;
  countdownAttemptId += 1;
  running = calibrating = countdownActive = false;
  speechRoundToken++;
  demo = false;
  stopCamera();
  try { speechSynthesis.cancel(); } catch {}
  hide(ui.result, ui.cue, ui.demoHelp, ui.motionArt, ui.listen, ui.home, ui.calibrate, ui.loading, ui.countdown);
  show(ui.intro);
  setTracking("카메라 대기");
}

function demoTouch(x, y) {
  if (!running || !demo || !gameState?.targets || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  const target = gameState.targets.find((item) => {
    if (selectedGame === "sequence" && item.order < gameState.current) return false;
    return pointInsideTarget({ x, y }, item, radius);
  });
  if (!target) return;
  if (selectedGame === "sequence") {
    if (target.order === gameState.current) completeSequenceTarget(target);
    else {
      inputLockedUntil = performance.now() + 110;
      const point = targetPoint(target);
      penalty(`${gameState.targets[gameState.current - 1]?.value || ""}부터 찾아봐요`, point.x, point.y, 0);
    }
  } else completeMathTarget(target);
}

function demoExercise(game) {
  if (!running || !demo || selectedGame !== game || performance.now() < inputLockedUntil) return;
  inputLockedUntil = performance.now() + 220;
  completeActionMission();
  updateGameCue();
}

app.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  if (demo && running && selectedGame === "squat") demoExercise("squat");
  else demoTouch(event.clientX, event.clientY);
});

addEventListener("keydown", (event) => {
  if (!running || !demo || event.repeat || performance.now() < inputLockedUntil) return;
  if (selectedGame === "sequence" && (event.code === "Enter" || /^Key[A-Z]$/.test(event.code))) {
    const value = event.code === "Enter" ? gameState.targets[gameState.current - 1]?.value : event.key.toUpperCase();
    const target = event.code === "Enter"
      ? gameState.targets[gameState.current - 1]
      : gameState.targets.find((item) => item.order >= gameState.current && item.value === value);
    if (target) {
      if (target.order === gameState.current) completeSequenceTarget(target);
      else {
        inputLockedUntil = performance.now() + 110;
        const point = targetPoint(target);
        penalty(`${gameState.targets[gameState.current - 1]?.value || ""}부터 찾아봐요`, point.x, point.y, 0);
      }
    }
  } else if ((selectedGame === "math" || selectedGame === "color") && event.code === "Enter") {
    completeMathTarget(gameState.targets.find((item) => item.value === gameState.answer));
  } else if (event.key.toLowerCase() === "s") demoExercise("squat");
});

$("#startBtn").onclick = startCamera;
$("#demoBtn").onclick = startDemo;
$("#loadingRetry").onclick = startCamera;
$("#loadingDemo").onclick = startDemo;
$("#retryBtn").onclick = () => {
  hide(ui.result);
  if (demo) {
    startRenderLoop();
    startCountdown();
  } else {
    beginCalibration();
    startRenderLoop();
  }
};
$("#menuBtn").onclick = returnToMenu;
$("#homeBtn").onclick = returnToMenu;
$("#soundBtn").onclick = (event) => {
  sound = !sound;
  event.currentTarget.classList.toggle("off", !sound);
  event.currentTarget.setAttribute("aria-pressed", String(sound));
  if (!sound) try { speechSynthesis.cancel(); } catch {}
  else if (running) announceRound();
};
$("#listenBtn").onclick = () => {
  if (!sound) {
    sound = true;
    $("#soundBtn").classList.remove("off");
  }
  if ((selectedGame === "sequence" || selectedGame === "math" || selectedGame === "color") && gameState?.answerRevealed) {
    gameState.answerHoldUntil = performance.now() + 1100;
  }
  if (!announceRound()) {
    showToast("🔤 화면 안내를 함께 읽어봐요!");
    tone(540, .12, "triangle", .05);
  }
};

document.querySelectorAll(".game-card").forEach((card) => card.addEventListener("click", () => {
  document.querySelectorAll(".game-card").forEach((item) => {
    item.classList.remove("active");
    item.setAttribute("aria-pressed", "false");
  });
  card.classList.add("active");
  card.setAttribute("aria-pressed", "true");
  selectedGame = card.dataset.game;
  ui.motionArt.src = games[selectedGame].image;
  ui.motionArt.alt = `${games[selectedGame].name} 동작 안내`;
  $("#gameDescription").textContent = games[selectedGame].description;
  ui.time.textContent = "놀이 중";
  tone(330, .05, "triangle", .025);
}));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) wakeLock?.release?.().catch(() => {});
  else if (running) navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
});

addEventListener("pagehide", () => {
  const demoActive = demo && (running || countdownActive);
  resumeCameraAfterPageShow = cameraStartInProgress || demoActive
    || (!demo && !!stream && (running || calibrating || countdownActive));
  resumeCameraMode = cameraStartInProgress ? "starting" : demoActive ? "demo" : running ? "running" : "calibrating";
  clearTimeout(orientationTimer);
  orientationTimer = 0;
  cameraAttemptId += 1;
  if (countdownActive) {
    countdownAttemptId += 1;
    countdownActive = false;
    hide(ui.countdown);
  }
  if (renderFrameId) cancelAnimationFrame(renderFrameId);
  renderFrameId = 0;
  renderLoopActive = false;
  stopCamera();
});

addEventListener("pageshow", () => {
  if (!resumeCameraAfterPageShow) return;
  resumeCameraAfterPageShow = false;
  const resumeMode = resumeCameraMode;
  if (resumeMode === "starting") {
    cameraStartInProgress = false;
    void startCamera();
    return;
  }
  if (resumeMode === "demo") {
    if (!running) void startCountdown();
    startRenderLoop();
    return;
  }
  if (cameraStreamReady && stream?.getVideoTracks?.().some((track) => track.readyState === "live")) {
    if (resumeMode === "running") rearmGameInput();
    startRenderLoop();
    return;
  }
  const attemptId = ++cameraAttemptId;
  setTracking("카메라 다시 연결 중", "warn");
  void (async () => {
    try {
      if (!(await openCamera(attemptId))) return;
      await loadPose();
      if (attemptId !== cameraAttemptId) return;
      if (resumeMode === "running" && gameState) {
        running = true;
        calibrating = false;
        rearmGameInput();
        show(ui.cue, ui.motionArt, ui.listen, ui.home);
      } else beginCalibration();
      startRenderLoop();
    } catch (error) {
      running = calibrating = countdownActive = false;
      show(ui.loading);
      showCameraError(error);
    }
  })();
});

window.__MOTION_TEST__ = {
  start(game = "sequence") {
    selectedGame = games[game] ? game : "sequence";
    demo = true;
    hide(ui.intro, ui.result, ui.loading, ui.calibrate);
    beginGame();
    startRenderLoop();
    return this.snapshot();
  },
  hit() {
    if (selectedGame === "sequence") completeSequenceTarget(gameState.targets.find((target) => target.order === gameState.current));
    else if (selectedGame === "math" || selectedGame === "color") completeMathTarget(gameState.targets.find((target) => target.value === gameState.answer));
    else demoExercise(selectedGame);
    return this.snapshot();
  },
  snapshot() {
    return {
      game: selectedGame, score, combo, hits, misses, elapsed: gameElapsed,
      feedback: feedbacks.map(({ type, label, gain, detail }) => ({ type, label, gain, detail })),
      state: JSON.parse(JSON.stringify(gameState))
    };
  },
  finish() { endGame(); return this.snapshot(); }
};

function syntheticPose(preset) {
  const pose = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1, presence: 1 }));
  const set = (index, x, y) => Object.assign(pose[index], { x, y });
  // 얼굴은 실제 사람 비율에 맞춘다 — 눈↔입 간격이 얼굴 판정의 기준 단위라 대충 두면 테스트가 무의미해진다.
  set(LM.nose,.5,.10);set(LM.leye,.47,.09);set(LM.reye,.53,.09);set(LM.lear,.44,.10);set(LM.rear,.56,.10);
  set(LM.lmouth,.477,.119);set(LM.rmouth,.523,.119);
  set(LM.ls,.42,.27);set(LM.rs,.58,.27);set(LM.le,.40,.40);set(LM.re,.60,.40);
  set(LM.lh,.45,.51);set(LM.rh,.55,.51);set(LM.lk,.45,.70);set(LM.rk,.55,.70);set(LM.la,.45,.91);set(LM.ra,.55,.91);
  set(LM.lw,.42,.56);set(LM.rw,.58,.56);
  if (preset === "handsUp") {
    set(LM.le,.38,.17);set(LM.re,.62,.17);set(LM.lw,.40,.06);set(LM.rw,.60,.06);
  } else if (preset === "raiseOneHand") {
    set(LM.le,.38,.17);set(LM.lw,.40,.04);
  } else if (preset === "touchFace") {
    // 한 손을 볼에 얹은 자세(얼굴 어디든 닿으면 통과).
    set(LM.le,.36,.29);set(LM.lw,.4262,.1687);
  } else if (preset === "touchHead") {
    // 아래 얼굴 프리셋들의 손목 값은 손바닥(palm)이 목표 부위에 정확히 얹히도록 역산한 값이다.
    set(LM.le,.36,.17);set(LM.lw,.4489,.0935);
  } else if (preset === "touchEars") {
    set(LM.le,.40,.34);set(LM.re,.60,.34);set(LM.lw,.4289,.1666);set(LM.rw,.5711,.1666);
  } else if (preset === "touchNose") {
    set(LM.le,.37,.34);set(LM.lw,.4679,.1593);
  } else if (preset === "touchEyes") {
    set(LM.le,.36,.28);set(LM.re,.64,.28);set(LM.lw,.4362,.1484);set(LM.rw,.5638,.1484);
  } else if (preset === "touchMouth") {
    set(LM.le,.37,.30);set(LM.lw,.4606,.1738);
  } else if (preset === "tiltHead") {
    // 고개만 갸웃 — 어깨는 그대로 두고 눈·귀 높이만 어긋나게 한다.
    set(LM.leye,.47,.082);set(LM.reye,.53,.098);set(LM.lear,.44,.086);set(LM.rear,.56,.114);
  } else if (preset === "touchShoulders") {
    set(LM.le,.30,.36);set(LM.re,.70,.36);set(LM.lw,.40,.29);set(LM.rw,.60,.29);
  } else if (preset === "airplane") {
    set(LM.le,.31,.27);set(LM.re,.69,.27);set(LM.lw,.20,.28);set(LM.rw,.80,.28);
  } else if (preset === "clap") {
    set(LM.le,.35,.37);set(LM.re,.65,.37);set(LM.lw,.47,.38);set(LM.rw,.53,.38);
  } else if (preset === "clapHigh") {
    set(LM.le,.42,.16);set(LM.re,.58,.16);set(LM.lw,.485,.06);set(LM.rw,.515,.06);
  } else if (preset === "showMuscles") {
    set(LM.le,.32,.30);set(LM.re,.68,.30);set(LM.lw,.34,.20);set(LM.rw,.66,.20);
  } else if (preset === "touchTummy") {
    set(LM.le,.38,.42);set(LM.re,.62,.42);set(LM.lw,.48,.47);set(LM.rw,.52,.47);
  } else if (preset === "reachSide") {
    set(LM.le,.31,.27);set(LM.lw,.20,.28);
  } else if (preset === "touchElbow") {
    // 왼손으로 오른쪽 팔꿈치를 잡는다(오른팔은 굽혀 앞으로).
    set(LM.re,.68,.40);set(LM.rw,.56,.33);set(LM.le,.40,.46);set(LM.lw,.614,.4141);
  } else if (preset === "crossArmsHigh") {
    set(LM.le,.36,.20);set(LM.re,.64,.20);set(LM.lw,.56,.08);set(LM.rw,.44,.08);
  } else if (preset === "crossArms") {
    set(LM.le,.33,.40);set(LM.re,.67,.40);set(LM.lw,.60,.40);set(LM.rw,.40,.40);
  } else if (preset === "handsOnHips") {
    set(LM.le,.28,.42);set(LM.re,.72,.42);set(LM.lw,.44,.52);set(LM.rw,.56,.52);
  } else if (preset === "jackOpen") {
    set(LM.lw,.45,.07);set(LM.rw,.55,.07);set(LM.le,.33,.16);set(LM.re,.67,.16);set(LM.la,.25,.91);set(LM.ra,.75,.91);
  }
  // 손가락 관절은 팔꿈치→손목 방향 앞쪽에 둔다(palmPoint가 손바닥을 추정할 수 있게).
  const fingersFrom = (elbow, wrist, pinky, index) => {
    const dx = pose[wrist].x - pose[elbow].x;
    const dy = pose[wrist].y - pose[elbow].y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length * .05;
    const uy = dy / length * .05;
    set(pinky, pose[wrist].x + ux - uy * .25, pose[wrist].y + uy + ux * .25);
    set(index, pose[wrist].x + ux + uy * .25, pose[wrist].y + uy - ux * .25);
  };
  fingersFrom(LM.le, LM.lw, LM.lp, LM.li);
  fingersFrom(LM.re, LM.rw, LM.rp, LM.ri);
  return pose;
}

function feedSyntheticPose(preset, frames = 10, dt = 33) {
  let syntheticAt = Math.max(poseCaptureTimestamp || 0, performance.now());
  for (let i = 0; i < frames; i++) {
    lastPose = syntheticPose(preset);
    lastWorldPose = syntheticPose(preset);
    syntheticAt += dt;
    poseCaptureTimestamp = syntheticAt;
    poseTimestamp = syntheticAt;
    poseVersion++;
    updateGame(dt);
  }
}

function runEngineSelfTest() {
  const results = {};
  selfTesting = true;
  demo = true;
  selectedGame = "sequence";
  resetScore();
  const sequenceWords = [];
  for (let round = 1; round <= SPELLING_GOAL; round++) {
    const state = createSequenceRound(round);
    if (state) sequenceWords.push(state.prompt.word);
  }
  const sequenceStopsAtGoal = createSequenceRound(SPELLING_GOAL + 1) === null;
  const spellingDeckRemaining = wordDeck.length;
  const spellingUsedWords = new Set(sequenceWords);
  selectedGame = "math";
  resetScore();
  const pictureWords = [], pictureAnswers = [];
  for (let round = 0; round < PICTURE_GOAL; round++) {
    const state = createMathProblem();
    if (!state) break;
    pictureAnswers.push(state.answer);
    pictureWords.push(...state.targets.map((target) => target.value));
    completedWordCount++;
  }
  const mathStopsAtGoal = createMathProblem() === null;
  // 철자 게임에서 이미 쓴 단어는 다음 게임 덱에서 빠져야 한다(게임 간 중복 방지).
  const crossGameNoRepeat = pictureWords.every((word) => !spellingUsedWords.has(word));
  // 철자 톡톡을 연달아 여러 판 해도 은행을 한 바퀴 돌기 전에는 같은 단어가 다시 나오면 안 된다.
  usedWordOrder = [];usedWordSet = new Set();
  selectedGame = "sequence";
  const spellCycle = [];
  const spellRounds = Math.floor(WORDS.length / SPELLING_GOAL) - 2;
  for (let round = 0; round < spellRounds; round++) {
    resetScore();
    for (let i = 1; i <= SPELLING_GOAL; i++) {
      const state = createSequenceRound(i);
      if (state) spellCycle.push(state.prompt.word);
    }
  }
  const spellCycleNoRepeat = spellCycle.length === spellRounds * SPELLING_GOAL
    && new Set(spellCycle).size === spellCycle.length;
  results.noRepeat = {
    pass: WORDS.length >= 150 && new Set(WORDS.map((item) => item.word)).size === WORDS.length
      // 한국어·이모지가 겹치면 아이가 문제를 구분할 수 없다(한국어는 음성으로도 읽힌다).
      && new Set(WORDS.map((item) => item.ko)).size === WORDS.length
      && new Set(WORDS.map((item) => item.emoji)).size === WORDS.length
      && WORDS.every((item) => item.word.length >= 3 && item.word.length <= SPELLING_MAX_LETTERS)
      && sequenceWords.length === SPELLING_GOAL && new Set(sequenceWords).size === SPELLING_GOAL
      && sequenceStopsAtGoal
      && pictureWords.length === PICTURE_GOAL * 2 && new Set(pictureWords).size === PICTURE_GOAL * 2
      && pictureAnswers.length === PICTURE_GOAL && new Set(pictureAnswers).size === PICTURE_GOAL
      && mathStopsAtGoal && crossGameNoRepeat && spellCycleNoRepeat,
    wordCount: WORDS.length, spelling: sequenceWords, pictureAnswers, crossGameNoRepeat, mathStopsAtGoal,
    spellCycleRounds: spellRounds, spellCycleNoRepeat
  };
  selectedGame = "sequence";resetScore();gameState=createGameState("sequence");const spellWord=gameState.prompt.word;completeSequenceTarget(gameState.targets.find((target)=>target.order===1));
  results.sequence = { pass: gameState.current === 2 && hits === 1 && feedbacks.at(-1)?.type === "good" && WORDS.some((item)=>item.word===spellWord), word:spellWord, current: gameState.current, hits, feedback: feedbacks.at(-1)?.detail };
  selectedGame = "math";resetScore();gameState=createGameState("math");completeMathTarget(gameState.targets.find((target)=>target.value===gameState.answer));
  results.math = { pass: hits === 1 && score > 0 && WORDS.some((item)=>feedbacks.at(-1)?.detail?.includes(item.word)), answer:feedbacks.at(-1)?.detail, hits, score, feedback: feedbacks.at(-1)?.detail };
  selectedGame = "math";resetScore();gameState=createGameState("math");
  const outOfFrameTouch = syntheticPose("stand");
  outOfFrameTouch[LM.lw].x = -.04;
  outOfFrameTouch[LM.rw].visibility = outOfFrameTouch[LM.rw].presence = .1;
  lastPose = outOfFrameTouch;lastWorldPose = outOfFrameTouch;
  const trackingNow = performance.now();poseTimestamp = trackingNow;
  const outOfFrameTouchUsable = poseUsable(trackingNow);
  const outOfFrameHandCount = handPositions(posePoints()).length;
  lastPose = syntheticPose("stand");lastWorldPose = lastPose;
  poseTimestamp = trackingNow - POSE_FRESH_MS + 1;
  const freshBoundaryAccepted = poseUsable(trackingNow);
  poseTimestamp = trackingNow - POSE_FRESH_MS - 1;
  const staleBoundaryRejected = !poseUsable(trackingNow);
  running = true;gameState.advancing = true;
  const feedbackClockPaused = !shouldAdvanceGameClock(true);
  gameState.advancing = false;
  const activeClockRuns = shouldAdvanceGameClock(true);
  running = false;
  results.tracking = {
    pass: !outOfFrameTouchUsable && outOfFrameHandCount === 0 && freshBoundaryAccepted
      && staleBoundaryRejected && feedbackClockPaused && activeClockRuns,
    outOfFrameTouchUsable, outOfFrameHandCount, freshBoundaryAccepted,
    staleBoundaryRejected, feedbackClockPaused, activeClockRuns
  };

  // 터치 판정점이 손목이 아니라 그 앞(손바닥)에 있어야 한다 — 손가락이 잡힐 때와 안 잡힐 때 모두.
  selectedGame = "math";resetScore();
  lastPose = syntheticPose("handsUp");lastWorldPose = lastPose;poseTimestamp = performance.now();
  const fingerWrist = posePoint(LM.lw);
  const fingerPalm = handPoint(LM.lw);
  const fingerAhead = distance(fingerPalm, posePoint(LM.le)) > distance(fingerWrist, posePoint(LM.le));
  const noFingerPose = syntheticPose("handsUp");
  [LM.lp, LM.li].forEach((index) => { noFingerPose[index].visibility = noFingerPose[index].presence = .05; });
  lastPose = noFingerPose;lastWorldPose = noFingerPose;poseTimestamp = performance.now();
  const fallbackWrist = posePoint(LM.lw);
  const fallbackPalm = handPoint(LM.lw);
  const fallbackAhead = distance(fallbackPalm, posePoint(LM.le)) > distance(fallbackWrist, posePoint(LM.le));
  const fallbackNotWrist = distance(fallbackPalm, fallbackWrist) > 4;
  results.palmTouch = {
    pass: fingerAhead && fallbackAhead && fallbackNotWrist,
    fingerAhead, fallbackAhead, fallbackNotWrist,
    fingerOffset: Math.round(distance(fingerPalm, fingerWrist)),
    fallbackOffset: Math.round(distance(fallbackPalm, fallbackWrist))
  };
  // syntheticPose의 좌표는 세로 카메라(720x1280)를 전제로 만든 값이다.
  // 화면·카메라가 달라져도 updateCameraGeometry가 카메라 비율을 지키므로 실제 게임에서 몸의
  // 픽셀 비율은 그대로다. 반면 픽스처를 다른 비율에 얹으면 몸만 찌그러진 가짜 자세가 되므로,
  // 판정 검사 동안에는 카메라 영역을 픽스처 기준으로 고정한다(Node·브라우저 결과를 일치시킨다).
  const savedRect = cameraRect, savedPlay = playRect;
  cameraRect = { x: 8, y: 121.5556, w: 374, h: 664.8889 };
  playRect = cameraRect;
  selectedGame = "squat";resetScore();gameState=createGameState("squat");
  // 덱이 무작위라 판정 검사는 은행 전체를 덱으로 놓고 명령을 직접 지정한다.
  gameState.commands = ACTION_COMMANDS;
  const noHeadroom = syntheticPose("stand");
  POSE_JOINTS.forEach((index) => noHeadroom[index].y -= .07);
  lastPose = noHeadroom;lastWorldPose = noHeadroom;poseTimestamp = performance.now();
  const headroomRejected = !analyzeFit().good;
  activateActionCommand(gameState, ACTION_COMMANDS.findIndex((action) => action.id === "handsUp"));
  const offFrameHands = syntheticPose("handsUp");
  offFrameHands[LM.lw].y = offFrameHands[LM.rw].y = -.01;
  lastPose = offFrameHands;lastWorldPose = offFrameHands;poseTimestamp = performance.now();
  const offFramePoints = posePoints();
  const offFrameMetric = actionMetrics(offFramePoints);
  const offFramePoseUsable = poseUsable(poseTimestamp);
  const offFrameHandsMatch = staticActionMatches(gameState.currentAction, offFramePoints, offFrameMetric, gameState);
  // 판정 검사에서는 은행 전체를 덱으로 놓고 id로 명령을 지정한다(실제 판에서는 10개만 뽑힌다).
  const actionMatch = (actionId, preset) => {
    gameState.commands = ACTION_COMMANDS;
    activateActionCommand(gameState, ACTION_COMMANDS.findIndex((action) => action.id === actionId));
    // 손뼉류는 손을 벌리는 준비 동작을 거쳐야 인정된다.
    if (gameState.currentAction.armed) {
      const spread = syntheticPose("airplane");
      lastPose = spread;lastWorldPose = spread;poseTimestamp = performance.now();
      const spreadPoints = posePoints();
      staticActionMatches(gameState.currentAction, spreadPoints, actionMetrics(spreadPoints), gameState);
    }
    lastPose = syntheticPose(preset);lastWorldPose = syntheticPose(preset);poseTimestamp = performance.now();
    const points = posePoints();
    return staticActionMatches(gameState.currentAction, points, actionMetrics(points), gameState);
  };
  const overheadVTouchFaceMatch = actionMatch("touchFace", "jackOpen");
  const actionCrossMatches = {
    standAsShoulders: actionMatch("touchShoulders", "stand"),
    clapAsShoulders: actionMatch("touchShoulders", "clap"),
    standAsHips: actionMatch("handsOnHips", "stand"),
    standAsEars: actionMatch("touchEars", "stand"),
    standAsNose: actionMatch("touchNose", "stand"),
    standAsTummy: actionMatch("touchTummy", "stand"),
    standAsTilt: actionMatch("tiltHead", "stand"),
    handsUpAsRaiseOne: actionMatch("raiseOneHand", "handsUp"),
    handsUpAsEars: actionMatch("touchEars", "handsUp"),
    // 만세는 손을 머리에 얹은 게 아니다.
    handsUpAsHead: actionMatch("touchHead", "handsUp"),
    clapAsCross: actionMatch("crossArms", "clap"),
    clapAsTummy: actionMatch("touchTummy", "clap"),
    airplaneAsReachSide: actionMatch("reachSide", "airplane"),
    crossArmsAsHigh: actionMatch("crossArmsHigh", "crossArms"),
    highCrossAsLow: actionMatch("crossArms", "crossArmsHigh"),
    // 얼굴은 좌우(코-귀)와 위아래(눈-입)만 가른다. 이 둘은 손 위치 오차보다 충분히 멀다.
    // 코-입은 일부러 안 가른다(위 touchingNose 주석 참고) — 가르려다 인식률을 죽였던 적 있다.
    earsAsNose: actionMatch("touchNose", "touchEars"),
    noseAsEars: actionMatch("touchEars", "touchNose"),
    eyesAsMouth: actionMatch("touchMouth", "touchEyes"),
    faceAsHead: actionMatch("touchHead", "touchFace")
  };
  // 모든 미션이 자기 프리셋에서는 인식되어야 한다.
  const actionPositives = Object.fromEntries(
    ACTION_COMMANDS.map((action) => [action.id, actionMatch(action.id, action.id)])
  );
  // 가만히 서 있는 자세는 어떤 미션도 통과시키면 안 된다(가만히 있어도 넘어가는 미션 = 망가진 미션).
  const standMatchesAny = Object.fromEntries(
    ACTION_COMMANDS.map((action) => [action.id, actionMatch(action.id, "stand")]).filter(([, v]) => v)
  );
  const legFree = ACTION_COMMANDS.every((action) =>
    !action.required.some((index) => [LM.lk, LM.rk, LM.la, LM.ra].includes(index)));
  cameraRect = savedRect;playRect = savedPlay;
  results.actionNegatives = {
    pass: headroomRejected && !offFramePoseUsable && !offFrameHandsMatch && !overheadVTouchFaceMatch
      && Object.values(actionCrossMatches).every((value) => !value)
      && Object.values(actionPositives).every((value) => value)
      && Object.keys(standMatchesAny).length === 0
      && legFree,
    headroomRejected, offFramePoseUsable, offFrameHandsMatch, overheadVTouchFaceMatch, legFree,
    failedCrossMatches: Object.entries(actionCrossMatches).filter(([, v]) => v).map(([k]) => k),
    failedPositives: Object.entries(actionPositives).filter(([, v]) => !v).map(([k]) => k),
    standMatches: Object.keys(standMatchesAny)
  };
  // 미션 덱: 매판 무작위로 10개를 뽑고, 은행을 한 바퀴 돌기 전에는 같은 미션이 다시 나오지 않는다.
  const freshDeck = () => { usedActionOrder = []; usedActionSet = new Set(); return buildActionDeck().map((action) => action.id); };
  const deckA = freshDeck();
  const deckB = buildActionDeck().map((action) => action.id);
  const deckOverlap = deckA.filter((id) => deckB.includes(id));
  const deckOrders = new Set();
  for (let i = 0; i < 12; i++) deckOrders.add(freshDeck().join(","));
  results.actionDeck = {
    pass: ACTION_COMMANDS.length >= ACTION_ROUND_MISSIONS * 2
      && deckA.length === ACTION_ROUND_MISSIONS && deckB.length === ACTION_ROUND_MISSIONS
      && new Set(deckA).size === ACTION_ROUND_MISSIONS
      && deckOverlap.length === 0
      && deckOrders.size > 1
      && new Set(ACTION_COMMANDS.map((action) => action.id)).size === ACTION_COMMANDS.length,
    bank: ACTION_COMMANDS.length, deckOverlap, distinctOrders: deckOrders.size
  };

  usedActionOrder = [];usedActionSet = new Set();
  // 합성 자세를 먹이는 검사는 전부 픽스처 기준 카메라 영역에서 돌려야 한다(위 설명 참고).
  const savedRunRect = cameraRect, savedRunPlay = playRect;
  cameraRect = { x: 8, y: 121.5556, w: 374, h: 664.8889 };
  playRect = cameraRect;
  selectedGame = "squat";resetScore();gameState=createGameState("squat");const actionOrder=[];
  const deckSize = gameState.commands.length;
  while (!gameState.sessionComplete && actionOrder.length <= deckSize) {
    const action = gameState.currentAction;
    actionOrder.push(action.id);
    // 앞 동작을 풀고(가만히 섬) → 명령을 듣고 → 자세를 잡는 실제 흐름을 그대로 태운다.
    feedSyntheticPose("stand", 4);
    // 손뼉류는 손을 벌리는 준비 동작이 먼저다.
    if (action.armed) feedSyntheticPose("airplane", 6);
    feedSyntheticPose(action.id, 16);
  }
  cameraRect = savedRunRect;playRect = savedRunPlay;
  results.squat = {
    pass: deckSize === ACTION_ROUND_MISSIONS && gameState.completed === deckSize
      && gameState.sessionComplete && completedRun && new Set(actionOrder).size === deckSize,
    completed: gameState.completed, order: actionOrder, feedback: feedbacks.at(-1)?.label
  };

  selectedGame = "color";resetScore();running = true;gameState = createGameState("color");
  const colorAnswers = [];
  let colorRoundsValid = true;
  while (gameState && !gameState.sessionComplete && colorAnswers.length < COLOR_GOAL) {
    colorAnswers.push(gameState.answer);
    const answerTarget = gameState.targets.find((target) => target.value === gameState.answer);
    // 보기에 색을 칠하면 아이가 영어를 안 읽고 색만 보고 찍는다 — tint/ink가 없어야 한다.
    const twoDistinctChoices = gameState.targets.length === 2
      && gameState.targets[0].value !== gameState.targets[1].value
      && gameState.targets.every((target) => COLORS.some((item) => item.word === target.value));
    const noColorHint = gameState.targets.every((target) => target.tint === undefined && target.ink === undefined);
    const placedOnTop = gameState.targets.every((target) => target.y <= .35);
    if (!noColorHint) { colorRoundsValid = false; break; }
    if (!answerTarget || !twoDistinctChoices || !placedOnTop) { colorRoundsValid = false; break; }
    completeMathTarget(answerTarget);
  }
  results.color = {
    pass: colorRoundsValid && colorAnswers.length === COLOR_GOAL && new Set(colorAnswers).size === COLOR_GOAL
      && hits === COLOR_GOAL && completedWordCount === COLOR_GOAL
      && gameState?.sessionComplete === true && completedRun,
    answers: colorAnswers, hits, completedWordCount, sessionComplete: gameState?.sessionComplete, colorRoundsValid
  };

  // 답 버블 상단 배치 + 철자 위치 셔플 확인
  selectedGame = "sequence";resetScore();
  const layoutRounds = Array.from({ length: 6 }, (_, index) => createSequenceRound(index + 1)).filter(Boolean);
  const sequenceTargetsOnTopRow = layoutRounds.every((state) => state.targets.some((target) => target.y <= .30));
  const anyShuffledOrder = layoutRounds.some((state) => {
    const sorted = [...state.targets].sort((a, b) => a.y - b.y || a.x - b.x);
    return sorted.some((target, index) => target.order !== index + 1);
  });
  selectedGame = "math";resetScore();
  const mathState = createMathProblem();
  const mathTargetsOnTop = mathState.targets.every((target) => target.y <= .35);
  results.layout = {
    pass: sequenceTargetsOnTopRow && mathTargetsOnTop && anyShuffledOrder,
    sequenceTargetsOnTopRow, mathTargetsOnTop, anyShuffledOrder
  };

  running = false;demo = false;selectedGame = "math";gameState = null;resetScore();selfTesting = false;
  results.pass = Object.values(results).every((item) => item?.pass !== false);
  window.__MOTION_SELFTEST__ = results;
  document.documentElement.dataset.selftest = JSON.stringify(results);
}

if (new URLSearchParams(location.search).has("selftest")) {
  window.__MOTION_LIFECYCLE_TEST__ = {
    openCamera,
    stopCamera,
    waitForPoseCandidate,
    setCameraAttempt(value) { cameraAttemptId = value; },
    setPoseLoadGeneration(value) { poseLoadGeneration = value; },
    cameraState() {
      return { attemptId: cameraAttemptId, stream, ready: cameraStreamReady, srcObject: video.srcObject };
    }
  };
  runEngineSelfTest();
}

setTracking("카메라 대기");
drawBackground();
