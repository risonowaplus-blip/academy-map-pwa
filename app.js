var teachers = [];
var addressMaster = {};
var selectedPrefecture = '';
var selectedTeacherId = '';
var prefMode = 'active';

var tokenClient = null;
var accessToken = '';
var accessTokenExpiresAt = 0;
var pendingTokenResolve = null;
var pendingTokenReject = null;

var mapInstance = null;

var interactionFormSource = 'detail';
var pendingInteractions = [];
var deletedInteractionIds = [];
var editingPendingInteractionIndex = -1;

var pendingLinks = [];
var deletedLinkIds = [];
var editingPendingLinkIndex = -1;

var appSettings = {
  appName: 'Academy Map',
  personLabel: '先生',
  placeLabel: '店名',
  placeKanaLabel: '店名ふりがな'
};

var STORAGE_TOKEN = 'academyAccessToken';
var STORAGE_EXPIRES = 'academyAccessTokenExpiresAt';
var STORAGE_AUTHORIZED = 'academyGoogleAuthorized';


var prefectures = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県'
];


var gradeOptions = [
  '',
  '年少',
  '年中',
  '年長',
  '小1',
  '小2',
  '小3',
  '小4',
  '小5',
  '小6',
  '中1',
  '中2',
  '中3',
  '高1',
  '高2',
  '高3',
  '卒業'
];


/* ========================================
   起動
   ======================================== */

window.addEventListener(
  'load',
  function() {

    restoreCachedUiSettings();

    registerServiceWorker();

    waitForGoogleIdentity(
      function() {

        if (!configReady()) {

          document.getElementById(
            'authMessage'
          ).textContent =
            'config.js の設定が完了していません。';

          document.getElementById(
            'loginButton'
          ).disabled = true;

          return;
        }

        initializeGoogleTokenClient();

        restoreOrLogin();

      }
    );

  }
);


function registerServiceWorker() {

  if ('serviceWorker' in navigator) {

    navigator.serviceWorker
      .register('./sw.js')
      .then(
        function(registration) {
          registration.update();
        }
      )
      .catch(
        function() {}
      );

  }

}


function waitForGoogleIdentity(callback) {

  var attempts = 0;

  var timer = setInterval(
    function() {

      attempts++;

      if (
        window.google &&
        google.accounts &&
        google.accounts.oauth2
      ) {

        clearInterval(timer);

        callback();

        return;
      }

      if (attempts > 100) {

        clearInterval(timer);

        document.getElementById(
          'authMessage'
        ).textContent =
          'Googleログインを読み込めませんでした。画面を再読み込みしてください。';

      }

    },
    100
  );

}


function initializeGoogleTokenClient() {

  tokenClient =
    google.accounts.oauth2.initTokenClient({

      client_id: CONFIG.GOOGLE_CLIENT_ID,

      scope: CONFIG.SCOPES,

      callback:
        function(resp) {

          if (resp.error) {

            if (pendingTokenReject) {

              pendingTokenReject(
                new Error(
                  resp.error_description ||
                  resp.error
                )
              );

            }

            clearPendingTokenPromise();

            return;
          }

          accessToken =
            resp.access_token ||
            '';

          var expiresIn =
            Number(
              resp.expires_in ||
              3600
            );

          accessTokenExpiresAt =
            Date.now() +
            expiresIn * 1000 -
            60000;

          try {

            localStorage.setItem(
              STORAGE_TOKEN,
              accessToken
            );

            localStorage.setItem(
              STORAGE_EXPIRES,
              String(
                accessTokenExpiresAt
              )
            );

            localStorage.setItem(
              STORAGE_AUTHORIZED,
              '1'
            );

          } catch (e) {}

          if (pendingTokenResolve) {

            pendingTokenResolve(
              accessToken
            );

          }

          clearPendingTokenPromise();

        }

    });

}


function clearPendingTokenPromise() {

  pendingTokenResolve = null;
  pendingTokenReject = null;

}


function configReady() {

  return (
    CONFIG.GOOGLE_CLIENT_ID &&
    CONFIG.SCRIPT_DEPLOYMENT_ID &&
    CONFIG.GOOGLE_CLIENT_ID.indexOf(
      'ここに'
    ) === -1 &&
    CONFIG.SCRIPT_DEPLOYMENT_ID.indexOf(
      'ここに'
    ) === -1
  );

}


async function restoreOrLogin() {

  var savedToken = '';
  var savedExpiresAt = 0;

  try {

    savedToken =
      localStorage.getItem(
        STORAGE_TOKEN
      ) || '';

    savedExpiresAt =
      Number(
        localStorage.getItem(
          STORAGE_EXPIRES
        ) || 0
      );

  } catch (e) {}

  if (
    savedToken &&
    savedExpiresAt > Date.now()
  ) {

    accessToken =
      savedToken;

    accessTokenExpiresAt =
      savedExpiresAt;

    await startApp();

    return;

  }

  /*
   * 有効なトークンがない場合は、
   * 起動時にGoogle認証を自動で開かない。
   *
   * 必ずログイン画面を表示し、
   * ユーザーが「Googleでログイン」を押した時だけ
   * 認証を開始する。
   */
  clearAccessToken();

  showLoginScreen();

}


function requestGoogleToken(promptMode) {

  return new Promise(
    function(resolve, reject) {

      if (!tokenClient) {

        reject(
          new Error(
            'Googleログインの準備ができていません。'
          )
        );

        return;
      }

      pendingTokenResolve = resolve;
      pendingTokenReject = reject;

      try {

        tokenClient.requestAccessToken({
          prompt: promptMode
        });

      } catch (e) {

        clearPendingTokenPromise();

        reject(e);

      }

    }
  );

}


async function login() {

  setLoading(true);

  try {

    await requestGoogleToken(
      'select_account'
    );

    await startApp();

  } catch (e) {

    showLoginScreen();

  } finally {

    setLoading(false);

  }

}


function showLoginScreen() {

  document.getElementById(
    'appShell'
  ).classList.add(
    'hidden'
  );

  document.getElementById(
    'authScreen'
  ).classList.remove(
    'hidden'
  );

}


function showAppScreen() {

  document.getElementById(
    'authScreen'
  ).classList.add(
    'hidden'
  );

  document.getElementById(
    'appShell'
  ).classList.remove(
    'hidden'
  );

}


function clearAccessToken() {

  accessToken = '';
  accessTokenExpiresAt = 0;

  try {

    localStorage.removeItem(
      STORAGE_TOKEN
    );

    localStorage.removeItem(
      STORAGE_EXPIRES
    );

  } catch (e) {}

}


/* ========================================
   Apps Script API
   ======================================== */

async function runScript(
  functionName,
  parameters,
  retried
) {

  if (!accessToken) {

    throw new Error(
      'Googleログインが必要です。'
    );

  }

  var response =
    await fetch(

      'https://script.googleapis.com/v1/scripts/' +

      encodeURIComponent(
        CONFIG.SCRIPT_DEPLOYMENT_ID
      ) +

      ':run',

      {

        method: 'POST',

        headers: {

          'Authorization':
            'Bearer ' +
            accessToken,

          'Content-Type':
            'application/json'

        },

        body:
          JSON.stringify({

            function: functionName,

            parameters:
              parameters ||
              []

          })

      }

    );

  if (
    response.status === 401 &&
    !retried
  ) {

    clearAccessToken();

    try {

      await requestGoogleToken('');

      return await runScript(
        functionName,
        parameters,
        true
      );

    } catch (e) {

      showLoginScreen();

      throw new Error(
        'Googleログインの有効期限が切れました。再度ログインしてください。'
      );

    }

  }

  var data =
    await response.json();

  if (
    !response.ok ||
    data.error
  ) {

    var msg =
      'Apps Scriptの実行に失敗しました。';

    if (
      data.error &&
      data.error.message
    ) {

      msg =
        data.error.message;

    }

    if (
      data.error &&
      data.error.details &&
      data.error.details[0] &&
      data.error.details[0].errorMessage
    ) {

      msg =
        data.error
          .details[0]
          .errorMessage;

    }

    throw new Error(msg);

  }

  return data.response
    ? data.response.result
    : null;

}


/* ========================================
   初期読込
   ======================================== */

async function startApp() {

  setLoading(true);

  try {

    var data =
      await runScript(
        'getInitialData'
      );

    teachers =
      (
        data &&
        data.teachers
      ) ||
      [];

    appSettings =
      Object.assign(
        {},
        appSettings,
        (
          data &&
          data.settings
        ) ||
        {}
      );

    cacheUiSettings();

    applySettingsToUi();

    showAppScreen();

    renderAll();

    renderJapanMap();

    loadAddressMaster();

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


function restoreCachedUiSettings() {

  try {

    var cached =
      localStorage.getItem(
        'academyUiSettings'
      );

    if (cached) {

      appSettings =
        Object.assign(
          {},
          appSettings,
          JSON.parse(cached)
        );

      applySettingsToUi();

    }

  } catch (e) {}

}


function cacheUiSettings() {

  try {

    localStorage.setItem(
      'academyUiSettings',
      JSON.stringify(
        appSettings
      )
    );

  } catch (e) {}

}


/* ========================================
   地方
   ======================================== */

function getRegionName(pref) {

  if (pref === '北海道') {
    return '北海道';
  }

  if (
    [
      '青森県',
      '岩手県',
      '宮城県',
      '秋田県',
      '山形県',
      '福島県'
    ].indexOf(pref) !== -1
  ) {
    return '東北';
  }

  if (
    [
      '茨城県',
      '栃木県',
      '群馬県',
      '埼玉県',
      '千葉県',
      '東京都',
      '神奈川県'
    ].indexOf(pref) !== -1
  ) {
    return '関東';
  }

  if (
    [
      '新潟県',
      '富山県',
      '石川県',
      '福井県',
      '山梨県',
      '長野県',
      '岐阜県',
      '静岡県',
      '愛知県'
    ].indexOf(pref) !== -1
  ) {
    return '中部';
  }

  if (
    [
      '三重県',
      '滋賀県',
      '京都府',
      '大阪府',
      '兵庫県',
      '奈良県',
      '和歌山県'
    ].indexOf(pref) !== -1
  ) {
    return '近畿';
  }

  if (
    [
      '鳥取県',
      '島根県',
      '岡山県',
      '広島県',
      '山口県'
    ].indexOf(pref) !== -1
  ) {
    return '中国';
  }

  if (
    [
      '徳島県',
      '香川県',
      '愛媛県',
      '高知県'
    ].indexOf(pref) !== -1
  ) {
    return '四国';
  }

  if (
    [
      '福岡県',
      '佐賀県',
      '長崎県',
      '熊本県',
      '大分県',
      '宮崎県',
      '鹿児島県'
    ].indexOf(pref) !== -1
  ) {
    return '九州';
  }

  if (pref === '沖縄県') {
    return '沖縄';
  }

  return '';

}


function getRegionBaseColor(region) {

  var colors = {

    '北海道': '#D9ECF8',
    '東北': '#D8EFF4',
    '関東': '#FFF1C9',
    '中部': '#DDEFD8',
    '近畿': '#FBE4C9',
    '中国': '#F9DCD6',
    '四国': '#F5D9E8',
    '九州': '#E9DDF3',
    '沖縄': '#E5D8F0'

  };

  return colors[region] ||
    '#EEF1F3';

}


function getRegionTeacherColor(region) {

  var colors = {

    '北海道': '#8DC8EB',
    '東北': '#8FD0DB',
    '関東': '#F4CF70',
    '中部': '#9FCD91',
    '近畿': '#F2B978',
    '中国': '#EF9E91',
    '四国': '#DB94BB',
    '九州': '#B697D2',
    '沖縄': '#AE8BCB'

  };

  return colors[region] ||
    '#FF9A8B';

}


/* ========================================
   日本地図
   ======================================== */

function renderJapanMap() {

  var el =
    document.getElementById(
      'japanMap'
    );

  if (
    !window.jpmap ||
    !window.jpmap.japanMap
  ) {

    el.innerHTML =
      '<div class="empty">日本地図を読み込めませんでした。</div>';

    return;
  }

  el.innerHTML = '';

  var counts =
    getPrefCounts();

  var areas = [];

  for (
    var i = 0;
    i < prefectures.length;
    i++
  ) {

    var pref =
      prefectures[i];

    var count =
      counts[pref] ||
      0;

    var region =
      getRegionName(pref);

    var color =
      getRegionBaseColor(
        region
      );

    var hoverColor =
      getRegionTeacherColor(
        region
      );

    if (count > 0) {

      color =
        getRegionTeacherColor(
          region
        );

    }

    if (
      selectedPrefecture ===
      pref
    ) {

      color =
        '#D95770';

      hoverColor =
        '#C84660';

    }

    areas.push({

      code:
        i + 1,

      color:
        color,

      hoverColor:
        hoverColor

    });

  }

  var containerWidth =
    Math.floor(

      el.getBoundingClientRect()
        .width ||

      el.clientWidth ||

      620

    );

  var mapWidth;

  if (
    window.innerWidth <=
    560
  ) {

    mapWidth =
      Math.max(

        420,

        Math.min(

          620,

          containerWidth *
          1.28

        )

      );

  } else {

    mapWidth =
      Math.max(

        620,

        Math.min(

          1000,

          containerWidth *
          1.22

        )

      );

  }

  mapInstance =
    new jpmap.japanMap(

      el,

      {

        areas:
          areas,

        width:
          mapWidth,

        showsPrefectureName:
          false,

        movesIslands:
          true,

        backgroundColor:
          '#FFFFFF',

        lineColor:
          '#FFFFFF',

        lineWidth:
          1,

        borderLineColor:
          '#FFFFFF',

        borderLineWidth:
          1.4,

        onSelect:
          function(data) {

            var code =
              Number(
                data.code
              );

            var pref =
              prefectures[
                code - 1
              ] ||
              data.name;

            selectPrefecture(
              pref
            );

          }

      }

    );

  enableMobileMapTouch();

updateSelectedPrefHeading();

}

/* ========================================
   スマホ地図タップ対応
   ======================================== */

function enableMobileMapTouch() {

  if (
    window.innerWidth > 560
  ) {
    return;
  }

  var map =
    document.getElementById(
      'japanMap'
    );

  if (!map) {
    return;
  }

  var canvas =
    map.querySelector(
      'canvas'
    );

  if (!canvas) {
    return;
  }

  if (
    canvas.dataset.mobileTouchReady ===
    '1'
  ) {
    return;
  }

  canvas.dataset.mobileTouchReady =
    '1';

  var startX = 0;
  var startY = 0;
  var moved = false;

  var TAP_MOVE_LIMIT = 24;


  canvas.addEventListener(
    'touchstart',
    function(event) {

      if (
        event.touches.length !== 1
      ) {

        moved = true;
        return;
      }

      var touch =
        event.touches[0];

      startX =
        touch.clientX;

      startY =
        touch.clientY;

      moved =
        false;

    },
    {
      passive: true
    }
  );


  canvas.addEventListener(
    'touchmove',
    function(event) {

      if (
        event.touches.length !== 1
      ) {

        moved = true;
        return;
      }

      var touch =
        event.touches[0];

      var diffX =
        Math.abs(
          touch.clientX - startX
        );

      var diffY =
        Math.abs(
          touch.clientY - startY
        );

      if (
        diffX > TAP_MOVE_LIMIT ||
        diffY > TAP_MOVE_LIMIT
      ) {

        moved =
          true;
      }

    },
    {
      passive: true
    }
  );


  canvas.addEventListener(
    'touchend',
    function(event) {

      if (moved) {
        return;
      }

      if (
        !event.changedTouches ||
        !event.changedTouches.length
      ) {
        return;
      }

      var touch =
        event.changedTouches[0];

      event.preventDefault();


      canvas.dispatchEvent(
        new MouseEvent(
          'mousemove',
          {
            bubbles: true,
            cancelable: true,
            view: window,

            clientX:
              touch.clientX,

            clientY:
              touch.clientY,

            screenX:
              touch.screenX,

            screenY:
              touch.screenY
          }
        )
      );


      canvas.dispatchEvent(
        new MouseEvent(
          'mousedown',
          {
            bubbles: true,
            cancelable: true,
            view: window,

            clientX:
              touch.clientX,

            clientY:
              touch.clientY,

            screenX:
              touch.screenX,

            screenY:
              touch.screenY,

            button: 0
          }
        )
      );

    },
    {
      passive: false
    }
  );

}


/* ========================================
   住所
   ======================================== */

async function loadAddressMaster() {

  try {

    var cached =
      localStorage.getItem(
        'academyAddressMasterV1'
      );

    if (cached) {

      addressMaster =
        JSON.parse(cached);

    }

  } catch (e) {}

  try {

    var response =
      await fetch(

        'https://geolonia.github.io/japanese-addresses/api/ja.json',

        {
          cache: 'force-cache'
        }

      );

    if (response.ok) {

      addressMaster =
        await response.json();

      try {

        localStorage.setItem(
          'academyAddressMasterV1',
          JSON.stringify(
            addressMaster
          )
        );

      } catch (e) {}

    }

  } catch (e) {}

}


/* ========================================
   描画
   ======================================== */

function renderAll() {

  renderStats();
  renderPrefList();
  renderMapTeacherPreview();
  renderFullTeacherList();
  renderSearchResults();
  updateSelectedPrefHeading();

}


function renderStats() {

  var unknown =
    getUnknownCount();

  document.getElementById(
    'stats'
  ).innerHTML =

    '<div class="stat">全国 ' +
    teachers.length +
    '名</div>' +

    '<div class="stat">所在地不明 ' +
    unknown +
    '名</div>';

}


function getPrefCounts() {

  var result = {};

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    var pref =
      teachers[i].prefecture;

    if (!pref) {
      continue;
    }

    result[pref] =
      (
        result[pref] ||
        0
      ) +
      1;

  }

  return result;

}


function getUnknownCount() {

  var count = 0;

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    if (
      !teachers[i].prefecture
    ) {

      count++;

    }

  }

  return count;

}


function updateSelectedPrefHeading() {

  var el =
    document.getElementById(
      'selectedPrefName'
    );

  var person =
    personLabel();

  if (
    selectedPrefecture ===
    '__UNKNOWN__'
  ) {

    el.textContent =

      '所在地不明｜' +

      person +

      ' ' +

      getUnknownCount() +

      '名';

    return;

  }

  if (selectedPrefecture) {

    var count =
      getPrefCounts()[
        selectedPrefecture
      ] ||
      0;

    el.textContent =

      selectedPrefecture +

      '｜' +

      person +

      ' ' +

      count +

      '名';

    return;

  }

  el.textContent =
    '都道府県を選択';

}


function setPrefMode(mode) {

  prefMode = mode;

  document.getElementById(
    'activePrefBtn'
  ).classList.toggle(
    'active',
    mode === 'active'
  );

  document.getElementById(
    'allPrefBtn'
  ).classList.toggle(
    'active',
    mode === 'all'
  );

  renderPrefList();

}


/* ========================================
   都道府県一覧
   ======================================== */

function renderPrefList() {

  var counts =
    getPrefCounts();

  var regionOrder = [
    '北海道',
    '東北',
    '関東',
    '中部',
    '近畿',
    '中国',
    '四国',
    '九州',
    '沖縄'
  ];

  var grouped = {};

  for (
    var r = 0;
    r < regionOrder.length;
    r++
  ) {

    grouped[
      regionOrder[r]
    ] = [];

  }

  for (
    var i = 0;
    i < prefectures.length;
    i++
  ) {

    var pref =
      prefectures[i];

    var count =
      counts[pref] ||
      0;

    if (
      prefMode === 'active' &&
      count === 0
    ) {
      continue;
    }

    var region =
      getRegionName(pref);

    if (!grouped[region]) {
      grouped[region] = [];
    }

    grouped[region].push({

      prefecture:
        pref,

      count:
        count

    });

  }

  var html = '';

  for (
    var regionIndex = 0;
    regionIndex < regionOrder.length;
    regionIndex++
  ) {

    var regionName =
      regionOrder[
        regionIndex
      ];

    var regionPrefs =
      grouped[
        regionName
      ] ||
      [];

    if (
      regionPrefs.length === 0
    ) {
      continue;
    }

    html +=
      '<div class="pref-region-group"' +

      ' style="' +

      '--region-base:' +
      getRegionBaseColor(
        regionName
      ) +
      ';' +

      '--region-active:' +
      getRegionTeacherColor(
        regionName
      ) +
      ';">';

    html +=

      '<div class="pref-region-title">' +

      escapeHtml(
        regionName
      ) +

      '</div>' +

      '<div class="pref-region-chips">';

    for (
      var prefIndex = 0;
      prefIndex < regionPrefs.length;
      prefIndex++
    ) {

      var row =
        regionPrefs[
          prefIndex
        ];

      var cls =
        'chip';

      if (
        row.count > 0
      ) {

        cls +=
          ' has';

      }

      if (
        selectedPrefecture ===
        row.prefecture
      ) {

        cls +=
          ' selected';

      }

      html +=

        '<button class="' +

        cls +

        '" onclick="selectPrefecture(\'' +

        escapeJs(
          row.prefecture
        ) +

        '\')">' +

        escapeHtml(
          row.prefecture
        ) +

        (
          row.count
            ? ' ' +
              row.count +
              '名'
            : ''
        ) +

        '</button>';

    }

    html +=

      '</div>' +

      '</div>';

  }

  var unknown =
    getUnknownCount();

  if (unknown > 0) {

    html +=

      '<div class="pref-region-group unknown-region">' +

      '<div class="pref-region-title">所在地不明</div>' +

      '<div class="pref-region-chips">' +

      '<button class="chip' +

      (
        selectedPrefecture ===
          '__UNKNOWN__'
          ? ' selected'
          : ''
      ) +

      '" onclick="selectUnknown()">' +

      '所在地不明 ' +

      unknown +

      '名' +

      '</button>' +

      '</div>' +

      '</div>';

  }

  document.getElementById(
    'prefList'
  ).innerHTML =
    html;

}


function selectPrefecture(pref) {

  selectedPrefecture = pref;
  selectedTeacherId = '';

  updateSelectedPrefHeading();
  renderPrefList();
  renderMapTeacherPreview();
  renderJapanMap();

}


function selectUnknown() {

  selectedPrefecture =
    '__UNKNOWN__';

  selectedTeacherId =
    '';

  updateSelectedPrefHeading();
  renderPrefList();
  renderMapTeacherPreview();
  renderJapanMap();

}


/* ========================================
   検索
   ======================================== */

function teacherMatches(
  teacher,
  query
) {

  if (!query) {
    return true;
  }

  var linkText = '';

  var links =
    teacher.links ||
    [];

  for (
    var i = 0;
    i < links.length;
    i++
  ) {

    linkText +=

      ' ' +

      (
        links[i].type ||
        ''
      ) +

      ' ' +

      (
        links[i].displayName ||
        ''
      ) +

      ' ' +

      (
        links[i].value ||
        ''
      );

  }

  var text = [

    teacher.name,
    teacher.kana,
    teacher.nickname,
    teacher.salonName,
    teacher.salonKana,
    teacher.prefecture,
    teacher.city,
    teacher.address1,
    teacher.address2,
    teacher.memo,
    linkText

  ]
    .join(' ')
    .toLowerCase();

  return text.indexOf(
    query.toLowerCase()
  ) !== -1;

}


function teacherCard(teacher) {

  var location =

    [
      teacher.prefecture,
      teacher.city
    ]

      .filter(Boolean)

      .join(' ');

  return (

    '<div class="teacher" onclick="openTeacherDetail(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">' +

    '<div class="teacher-name">' +

    escapeHtml(
      teacher.name ||
      '名前未登録'
    ) +

    '</div>' +

    (
      teacher.nickname
        ? '<div class="meta">' +
          escapeHtml(
            teacher.nickname
          ) +
          '</div>'
        : ''
    ) +

    (
      teacher.salonName
        ? '<div class="meta">' +
          escapeHtml(
            teacher.salonName
          ) +
          '</div>'
        : ''
    ) +

    (
      location
        ? '<div class="meta">' +
          escapeHtml(
            location
          ) +
          '</div>'
        : '<div class="meta">所在地不明</div>'
    ) +

    '</div>'

  );

}


function renderMapTeacherPreview() {

  var mapSide =
    document.getElementById(
      'mapSide'
    );

  if (
    !mapSide
  ) {

    return;

  }

  var query =
    (
      document.getElementById(
        'mapSearch'
      ).value ||
      ''
    ).trim();


  if (
    !selectedPrefecture &&
    !query
  ) {

    mapSide.innerHTML =
      '';

    return;

  }


  var list = [];

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    var teacher =
      teachers[i];

    if (
      selectedPrefecture ===
        '__UNKNOWN__' &&
      teacher.prefecture
    ) {
      continue;
    }

    if (
      selectedPrefecture &&
      selectedPrefecture !==
        '__UNKNOWN__' &&
      teacher.prefecture !==
        selectedPrefecture
    ) {
      continue;
    }

    if (
      !teacherMatches(
        teacher,
        query
      )
    ) {
      continue;
    }

    list.push(
      teacher
    );

  }

  var title =
    personLabel() +
    '一覧';

  if (
    selectedPrefecture ===
    '__UNKNOWN__'
  ) {

    title =
      '所在地不明';

  } else if (
    selectedPrefecture
  ) {

    title =
      selectedPrefecture;

  } else if (
    query
  ) {

    title =
      '検索結果';

  }

  var html =

    '<div class="section-title">' +

    escapeHtml(
      title
    ) +

    '　' +

    list.length +

    '名</div>';

  if (
    list.length === 0
  ) {

    html +=

      '<div class="empty">該当する' +

      escapeHtml(
        personLabel()
      ) +

      'はいません。</div>';

  } else {

    html +=
      '<div class="teacher-list">';

    for (
      var j = 0;
      j < list.length;
      j++
    ) {

      html +=
        teacherCard(
          list[j]
        );

    }

    html +=
      '</div>';

  }

  mapSide.innerHTML =
    html;

}


function renderFullTeacherList() {

  var query =
    (
      document.getElementById(
        'listSearch'
      ).value ||
      ''
    ).trim();

  var html = '';

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    if (
      teacherMatches(
        teachers[i],
        query
      )
    ) {

      html +=
        teacherCard(
          teachers[i]
        );

    }

  }

  document.getElementById(
    'fullTeacherList'
  ).innerHTML =

    html ||

    (
      '<div class="empty">該当する' +

      escapeHtml(
        personLabel()
      ) +

      'はいません。</div>'
    );

}


function renderSearchResults() {

  var query =
    (
      document.getElementById(
        'globalSearch'
      ).value ||
      ''
    ).trim();

  if (!query) {

    document.getElementById(
      'searchResults'
    ).innerHTML =
      '<div class="empty">検索語を入力してください。</div>';

    return;
  }

  var html = '';

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    if (
      teacherMatches(
        teachers[i],
        query
      )
    ) {

      html +=
        teacherCard(
          teachers[i]
        );

    }

  }

  document.getElementById(
    'searchResults'
  ).innerHTML =

    html ||

    (
      '<div class="empty">該当する' +

      escapeHtml(
        personLabel()
      ) +

      'はいません。</div>'
    );

}


/* ========================================
   ページ
   ======================================== */

function showPage(name) {

  var pages = {

    map:
      'pageMap',

    list:
      'pageList',

    search:
      'pageSearch',

    detail:
      'pageDetail',

    settings:
      'pageSettings'

  };

  for (
    var key in pages
  ) {

    document.getElementById(
      pages[key]
    ).classList.toggle(

      'active',

      key === name

    );

  }

  document.getElementById(
    'navMap'
  ).classList.toggle(
    'active',
    name === 'map'
  );

  document.getElementById(
    'navList'
  ).classList.toggle(
    'active',
    name === 'list'
  );

  document.getElementById(
    'navSearch'
  ).classList.toggle(
    'active',
    name === 'search'
  );

  document.getElementById(
    'navSettings'
  ).classList.toggle(
    'active',
    name === 'settings'
  );

  if (name === 'list') {
    renderFullTeacherList();
  }

  if (name === 'search') {
    renderSearchResults();
  }

  if (name === 'settings') {
    fillSettingsForm();
  }

  window.scrollTo(
    0,
    0
  );

}


/* ========================================
   先生 Detail
   ======================================== */

function findTeacher(id) {

  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    if (
      teachers[i].teacherId ===
      id
    ) {

      return teachers[i];

    }

  }

  return null;

}


function openTeacherDetail(id) {

  var teacher =
    findTeacher(id);

  if (!teacher) {
    return;
  }

  selectedTeacherId =
    id;

  if (
    teacher.prefecture
  ) {

    selectedPrefecture =
      teacher.prefecture;

  }

  renderPrefList();

  renderJapanMap();

  renderTeacherDetail(
    teacher
  );

  showPage(
    'detail'
  );

}


function birthdayText(obj) {

  var result = '';

  if (obj.birthYear) {

    result +=
      obj.birthYear +
      '年';

  }

  if (obj.birthMonth) {

    result +=
      obj.birthMonth +
      '月';

  }

  if (obj.birthDay) {

    result +=
      obj.birthDay +
      '日';

  }

  return result;

}


function detailRow(
  label,
  value
) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return '';
  }

  return (

    '<div class="detail-row">' +

    '<div class="label">' +

    escapeHtml(label) +

    '</div>' +

    '<div class="value">' +

    escapeHtml(
      String(value)
    ) +

    '</div>' +

    '</div>'

  );

}


function renderTeacherDetail(
  teacher
) {

  var html =

    '<div class="card">' +

    '<div class="detail-head">' +

    '<div>' +

    '<div class="detail-name">' +

    escapeHtml(
      teacher.name ||
      '名前未登録'
    ) +

    '</div>' +

    (
      teacher.kana
        ? '<div class="meta">' +
          escapeHtml(
            teacher.kana
          ) +
          '</div>'
        : ''
    ) +

    '</div>' +

    '<div class="detail-head-actions">' +

    '<button class="secondary" onclick="openTeacherForm(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">編集</button>' +

    '<button class="detail-delete-button" onclick="deleteTeacherAction(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">🗑 削除</button>' +

    '</div>' +

    '</div>';

  html +=
    detailRow(
      '呼び名',
      teacher.nickname
    );

  html +=
    detailRow(
      '性別',
      teacher.gender
    );

  html +=
    detailRow(
      '誕生日',
      birthdayText(
        teacher
      )
    );

  html +=
    detailRow(
      '年齢',
      teacher.ageDisplay
    );

  html +=
    detailRow(
      placeLabel(),
      teacher.salonName
    );

  html +=
    detailRow(
      placeKanaLabel(),
      teacher.salonKana
    );

  html +=
    detailRow(
      '住所',
      teacher.fullAddress
    );

  html +=
    detailRow(
      'メモ',
      teacher.memo
    );

  var links =
    teacher.links ||
    [];

  if (
    links.length
  ) {

    html +=

      '<div class="detail-row">' +

      '<div class="label">リンク・SNS</div>' +

      '<div class="link-list">';

    for (
      var linkIndex = 0;
      linkIndex < links.length;
      linkIndex++
    ) {

      html +=
        renderDetailLink(
          links[
            linkIndex
          ]
        );

    }

    html +=

      '</div>' +

      '</div>';

  }

  if (
    teacher.fullAddress
  ) {

    html +=

      '<div class="actions">' +

      '<button class="secondary" onclick="openGoogleMap(\'' +

      escapeJs(
        teacher.fullAddress
      ) +

      '\')">Google Maps</button>' +

      '</div>';

  }

  html +=
    '</div>';


  var interactions =
    teacher.interactions ||
    [];

  html +=

    '<div class="card">' +

    '<div class="detail-head">' +

    '<div class="section-title">交流履歴 ' +

    interactions.length +

    '件</div>' +

    '<button class="primary" onclick="openInteractionForm()">＋ 追加</button>' +

    '</div>';

  if (
    interactions.length === 0
  ) {

    html +=
      '<div class="empty">交流記録はまだありません。</div>';

  } else {

    for (
      var interactionIndex = 0;
      interactionIndex < interactions.length;
      interactionIndex++
    ) {

      html +=
        renderInteractionCard(
          interactions[
            interactionIndex
          ]
        );

    }

  }

  html +=
    '</div>';


  var children =
    teacher.children ||
    [];

  html +=

    '<div class="card">' +

    '<div class="detail-head">' +

    '<div class="section-title">' +

    '子ども情報 ' +

    children.length +

    '人</div>' +

    '<button class="primary" onclick="openTeacherFormForNewChild(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">＋ 追加</button>' +

    '</div>';

  if (
    children.length === 0
  ) {

    html +=
      '<div class="empty">登録なし</div>';

  } else {

    for (
      var childIndex = 0;
      childIndex < children.length;
      childIndex++
    ) {

      var child =
        children[
          childIndex
        ];

      html +=

        '<div class="child">' +

        '<div class="child-name-text">' +

        escapeHtml(
          child.name ||
          child.nickname ||
          '名前未登録'
        ) +

        '</div>';

      if (
        child.nickname &&
        child.nickname !==
          child.name
      ) {

        html +=

          '<div class="meta">' +

          escapeHtml(
            child.nickname
          ) +

          '</div>';

      }

      if (
        child.gender
      ) {

        html +=

          '<div class="meta">性別：' +

          escapeHtml(
            child.gender
          ) +

          '</div>';

      }

      if (
        child.gradeDisplay
      ) {

        html +=

          '<div class="meta">学年：' +

          escapeHtml(
            child.gradeDisplay
          ) +

          '</div>';

      }

      if (
        child.ageDisplay
      ) {

        html +=

          '<div class="meta">年齢：' +

          escapeHtml(
            child.ageDisplay
          ) +

          '</div>';

      }

      if (
        birthdayText(
          child
        )
      ) {

        html +=

          '<div class="meta">誕生日：' +

          escapeHtml(
            birthdayText(
              child
            )
          ) +

          '</div>';

      }

      if (
        child.memo
      ) {

        html +=

          '<div class="meta">' +

          escapeHtml(
            child.memo
          ) +

          '</div>';

      }

      html +=
        '</div>';

    }

  }

  html +=
    '</div>';

  document.getElementById(
    'detailContent'
  ).innerHTML =
    html;

}


/* ========================================
   交流履歴
   ======================================== */

function renderInteractionCard(
  interaction
) {

  var dateText =
    interaction.date ||
    '日付未登録';

  var typeText =
    interaction.interactionType ||
    '種別未登録';

  var html =

    '<div class="child">' +

    '<div class="detail-head">' +

    '<div>' +

    '<div class="interaction-date">' +

    escapeHtml(
      dateText
    ) +

    '</div>' +

    '<span class="interaction-type-label">' +

    escapeHtml(
      typeText
    ) +

    '</span>' +

    '</div>' +

    '<div class="detail-head-actions">' +

    '<button class="secondary" onclick="openInteractionForm(\'' +

    escapeJs(
      interaction.interactionId
    ) +

    '\')">編集</button>' +

    '<button class="detail-delete-button" onclick="deleteInteractionAction(\'' +

    escapeJs(
      interaction.interactionId
    ) +

    '\')">🗑 削除</button>' +

    '</div>' +

    '</div>';

  if (
    interaction.memo
  ) {

    html +=

      '<div style="margin-top:10px;white-space:pre-wrap;line-height:1.7">' +

      escapeHtml(
        interaction.memo
      ) +

      '</div>';

  }

  html +=
    '</div>';

  return html;

}


function findInteraction(
  interactionId
) {

  var teacher =
    findTeacher(
      selectedTeacherId
    );

  if (!teacher) {
    return null;
  }

  var interactions =
    teacher.interactions ||
    [];

  for (
    var i = 0;
    i < interactions.length;
    i++
  ) {

    if (
      interactions[i].interactionId ===
      interactionId
    ) {

      return interactions[i];

    }

  }

  return null;

}


function openInteractionForm(
  interactionId
) {

  interactionFormSource =
    'detail';

  editingPendingInteractionIndex =
    -1;

  if (
    !selectedTeacherId
  ) {

    return;
  }

  setValue(
    'interactionId',
    ''
  );

  setValue(
    'interactionDate',
    todayYmd()
  );

  setValue(
    'interactionType',
    ''
  );

  setValue(
    'interactionMemo',
    ''
  );

  var interaction =
    interactionId
      ? findInteraction(
          interactionId
        )
      : null;

  if (
    interaction
  ) {

    document.getElementById(
      'interactionModalTitle'
    ).textContent =
      '交流記録を編集';

    setValue(
      'interactionId',
      interaction.interactionId
    );

    setValue(
      'interactionDate',
      interaction.date
    );

    setValue(
      'interactionType',
      interaction.interactionType
    );

    setValue(
      'interactionMemo',
      interaction.memo
    );

  } else {

    document.getElementById(
      'interactionModalTitle'
    ).textContent =
      '交流記録を追加';

  }

  document.getElementById(
    'interactionModal'
  ).classList.add(
    'show'
  );

}


function closeInteractionForm() {

  document.getElementById(
    'interactionModal'
  ).classList.remove(
    'show'
  );

}


async function saveInteractionForm() {

  var payload = {

    interactionId:
      valueOf(
        'interactionId'
      ),

    date:
      valueOf(
        'interactionDate'
      ),

    interactionType:
      valueOf(
        'interactionType'
      ),

    memo:
      valueOf(
        'interactionMemo'
      )

  };

  if (
    interactionFormSource ===
    'teacherForm'
  ) {

    if (
      editingPendingInteractionIndex >=
      0
    ) {

      pendingInteractions[
        editingPendingInteractionIndex
      ] =
        payload;

    } else {

      pendingInteractions.push(
        payload
      );

    }

    closeInteractionForm();

    renderTeacherFormInteractions();

    editingPendingInteractionIndex =
      -1;

    return;
  }

  if (
    !selectedTeacherId
  ) {

    return;
  }

  payload.teacherId =
    selectedTeacherId;

  setLoading(true);

  try {

    await runScript(
      'saveInteraction',
      [
        payload
      ]
    );

    closeInteractionForm();

    await refreshTeacherData(
      selectedTeacherId
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


async function deleteInteractionAction(
  interactionId
) {

  if (
    !(await appConfirm(
      '交流記録を削除しますか？',
      'この交流記録を削除します。\nこの操作は元に戻せません。'
    ))
  ) {

    return;
  }

  setLoading(true);

  try {

    await runScript(
      'deleteInteraction',
      [
        interactionId
      ]
    );

    await refreshTeacherData(
      selectedTeacherId
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


function todayYmd() {

  var now =
    new Date();

  return (

    now.getFullYear() +

    '-' +

    String(
      now.getMonth() +
      1
    ).padStart(
      2,
      '0'
    ) +

    '-' +

    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    )

  );

}


async function refreshTeacherData(
  teacherId
) {

  teachers =
    (
      await runScript(
        'getTeachers'
      )
    ) ||
    [];

  renderAll();

  renderJapanMap();

  var teacher =
    findTeacher(
      teacherId
    );

  if (
    teacher
  ) {

    selectedTeacherId =
      teacherId;

    renderTeacherDetail(
      teacher
    );

    showPage(
      'detail'
    );

  }

}


/* ========================================
   先生フォーム
   ======================================== */

function openTeacherForm(
  id
) {

  clearTeacherForm();

  var teacher =
    id
      ? findTeacher(
          id
        )
      : null;

  pendingInteractions =
    teacher &&
    teacher.interactions
      ? JSON.parse(
          JSON.stringify(
            teacher.interactions
          )
        )
      : [];

  deletedInteractionIds =
    [];

  editingPendingInteractionIndex =
    -1;

  pendingLinks =
    teacher &&
    teacher.links
      ? JSON.parse(
          JSON.stringify(
            teacher.links
          )
        )
      : [];

  deletedLinkIds =
    [];

  editingPendingLinkIndex =
    -1;

  document.getElementById(
    'modalTitle'
  ).textContent =

    teacher
      ? personLabel() +
        '情報を編集'
      : personLabel() +
        'を追加';

  if (
    teacher
  ) {

    setValue(
      'teacherId',
      teacher.teacherId
    );

    setValue(
      'name',
      teacher.name
    );

    setValue(
      'kana',
      teacher.kana
    );

    setValue(
      'nickname',
      teacher.nickname
    );

    setValue(
      'gender',
      teacher.gender ||
      ''
    );

    setValue(
      'birthYear',
      teacher.birthYear
    );

    setValue(
      'birthMonth',
      teacher.birthMonth
    );

    setValue(
      'birthDay',
      teacher.birthDay
    );

    setValue(
      'ageManual',
      teacher.ageManual
    );

    setValue(
      'salonName',
      teacher.salonName
    );

    setValue(
      'salonKana',
      teacher.salonKana
    );

    setValue(
      'prefecture',
      teacher.prefecture
    );

    setValue(
      'city',
      teacher.city
    );

    setValue(
      'address1',
      teacher.address1
    );

    setValue(
      'address2',
      teacher.address2
    );

    setValue(
      'memo',
      teacher.memo
    );

  } else {

    setValue(
      'gender',
      ''
    );

  }

  var placeNameLabelEl =
    document.getElementById(
      'placeNameLabel'
    );

  if (
    placeNameLabelEl
  ) {

    placeNameLabelEl.textContent =
      placeLabel();

  }

  var placeKanaLabelEl =
    document.getElementById(
      'placeKanaLabel'
    );

  if (
    placeKanaLabelEl
  ) {

    placeKanaLabelEl.textContent =
      placeKanaLabel();

  }

  renderLinksEditor();

  renderChildrenEditor(

    teacher
      ? teacher.children ||
        []
      : []

  );

  renderTeacherFormInteractions();

  var teacherModal =
  document.getElementById(
    'teacherModal'
  );


teacherModal.classList.add(
  'show'
);


/* フォームを開くたびに最上部へ戻す */
requestAnimationFrame(
  function() {

    var modalBody =
      teacherModal.querySelector(
        '.modal'
      );


    if (
      modalBody
    ) {

      modalBody.scrollTop =
        0;

    }

  }
);

}


function closeTeacherForm() {

  document.getElementById(
    'teacherModal'
  ).classList.remove(
    'show'
  );

  hideCombos();

  pendingInteractions =
    [];

  deletedInteractionIds =
    [];

  editingPendingInteractionIndex =
    -1;

  pendingLinks =
    [];

  deletedLinkIds =
    [];

  editingPendingLinkIndex =
    -1;

}


function clearTeacherForm() {

  var ids = [

    'teacherId',
    'name',
    'kana',
    'nickname',
    'birthYear',
    'birthMonth',
    'birthDay',
    'ageManual',
    'salonName',
    'salonKana',
    'prefecture',
    'city',
    'address1',
    'address2',
    'memo'

  ];

  for (
    var i = 0;
    i < ids.length;
    i++
  ) {

    setValue(
      ids[i],
      ''
    );

  }

  setValue(
    'gender',
    '女'
  );

}


async function saveTeacherForm() {

  var instagramLegacy =
    firstInstagramAccountFromPendingLinks();

  var payload = {

    teacherId:
      valueOf(
        'teacherId'
      ),

    name:
      valueOf(
        'name'
      ),

    kana:
      valueOf(
        'kana'
      ),

    nickname:
      valueOf(
        'nickname'
      ),

    gender:
      valueOf(
        'gender'
      ),

    birthYear:
      valueOf(
        'birthYear'
      ),

    birthMonth:
      valueOf(
        'birthMonth'
      ),

    birthDay:
      valueOf(
        'birthDay'
      ),

    ageManual:
      valueOf(
        'ageManual'
      ),

    salonName:
      valueOf(
        'salonName'
      ),

    salonKana:
      valueOf(
        'salonKana'
      ),

    prefecture:
      valueOf(
        'prefecture'
      ),

    city:
      valueOf(
        'city'
      ),

    address1:
      valueOf(
        'address1'
      ),

    address2:
      valueOf(
        'address2'
      ),

    instagram:
      instagramLegacy,

    memo:
      valueOf(
        'memo'
      )

  };

  setLoading(true);

  try {

    var saved =
      await runScript(
        'saveTeacher',
        [
          payload
        ]
      );

    await saveChildrenAfterTeacher(
      saved
    );

    await saveLinksAfterTeacher(
      saved.teacherId
    );

    await saveInteractionsAfterTeacher(
      saved.teacherId
    );

    await refreshAfterSave(
      saved.teacherId
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


function openTeacherFormForNewChild(
  teacherId
) {

  openTeacherForm(
    teacherId
  );

  addChildRow();

  setTimeout(
    function() {

      var area =
        document.getElementById(
          'childrenEditArea'
        );

      if (
        area
      ) {

        area.scrollIntoView({

          behavior:
            'smooth',

          block:
            'start'

        });

      }

    },
    100
  );

}


/* ========================================
   先生フォーム内 交流履歴
   ======================================== */

function renderTeacherFormInteractions() {

  var area =
    document.getElementById(
      'interactionEditArea'
    );

  if (!area) {
    return;
  }

  var html =

    '<div class="detail-head">' +

    '<div class="section-title">' +

    '交流履歴 ' +

    pendingInteractions.length +

    '件' +

    '</div>' +

    '<button type="button" class="secondary" onclick="openTeacherFormInteraction()">' +

    '＋ 交流記録' +

    '</button>' +

    '</div>';

  if (
    pendingInteractions.length ===
    0
  ) {

    html +=

      '<div class="empty">' +

      '交流記録はまだありません。' +

      '</div>';

  }

  for (
    var i = 0;
    i < pendingInteractions.length;
    i++
  ) {

    var interaction =
      pendingInteractions[i];

    html +=

      '<div class="child">' +

      '<div class="detail-head">' +

      '<div>' +

      '<div class="interaction-date">' +

      escapeHtml(
        interaction.date ||
        '日付未登録'
      ) +

      '</div>' +

      '<span class="interaction-type-label">' +

      escapeHtml(
        interaction.interactionType ||
        '種別未登録'
      ) +

      '</span>' +

      '</div>' +

      '<div class="detail-head-actions">' +

      '<button type="button" class="secondary" onclick="openTeacherFormInteraction(' +

      i +

      ')">編集</button>' +

      '<button type="button" class="detail-delete-button" onclick="removeTeacherFormInteraction(' +

      i +

      ')">🗑 削除</button>' +

      '</div>' +

      '</div>';

    if (
      interaction.memo
    ) {

      html +=

        '<div style="margin-top:8px;white-space:pre-wrap;line-height:1.7">' +

        escapeHtml(
          interaction.memo
        ) +

        '</div>';

    }

    html +=
      '</div>';

  }

  area.innerHTML =
    html;

}


function openTeacherFormInteraction(
  index
) {

  interactionFormSource =
    'teacherForm';

  editingPendingInteractionIndex =

    typeof index ===
      'number'
      ? index
      : -1;

  setValue(
    'interactionId',
    ''
  );

  setValue(
    'interactionDate',
    todayYmd()
  );

  setValue(
    'interactionType',
    ''
  );

  setValue(
    'interactionMemo',
    ''
  );

  if (
    editingPendingInteractionIndex >=
    0
  ) {

    var interaction =
      pendingInteractions[
        editingPendingInteractionIndex
      ];

    document.getElementById(
      'interactionModalTitle'
    ).textContent =
      '交流記録を編集';

    setValue(
      'interactionId',
      interaction.interactionId ||
      ''
    );

    setValue(
      'interactionDate',
      interaction.date ||
      ''
    );

    setValue(
      'interactionType',
      interaction.interactionType ||
      ''
    );

    setValue(
      'interactionMemo',
      interaction.memo ||
      ''
    );

  } else {

    document.getElementById(
      'interactionModalTitle'
    ).textContent =
      '交流記録を追加';

  }

  document.getElementById(
    'interactionModal'
  ).classList.add(
    'show'
  );

}


async function removeTeacherFormInteraction(
  index
) {

  var interaction =
    pendingInteractions[
      index
    ];

  if (
    !(await appConfirm(
      '交流記録を削除しますか？',
      'この交流記録を削除します。\nこの操作は元に戻せません。'
    ))
  ) {

    return;
  }

  if (
    interaction &&
    interaction.interactionId
  ) {

    deletedInteractionIds.push(
      interaction.interactionId
    );

  }

  pendingInteractions.splice(
    index,
    1
  );

  renderTeacherFormInteractions();

}


/* ========================================
   リンク・SNS
   ======================================== */

function renderLinksEditor() {

  var area =
    document.getElementById(
      'linkEditArea'
    );

  if (!area) {
    return;
  }

  var html =

    '<div class="detail-head">' +

    '<div class="section-title">' +

    'リンク・SNS ' +

    pendingLinks.length +

    '件</div>' +

    '<button type="button" class="secondary" onclick="openTeacherFormLink()">' +

    '＋ リンクを追加' +

    '</button>' +

    '</div>';

  if (
    pendingLinks.length === 0
  ) {

    html +=

      '<div class="empty">' +

      'リンク・SNSはまだありません。' +

      '</div>';

  }

  for (
    var i = 0;
    i < pendingLinks.length;
    i++
  ) {

    var link =
      pendingLinks[i];

    var label =

      link.displayName ||

      link.type ||

      'リンク';

    html +=

      '<div class="link-edit">' +

      '<div class="detail-head">' +

      '<div class="link-row-main">' +

      '<div class="link-label">' +

      escapeHtml(
        label
      ) +

      '</div>' +

      '<div class="link-value">' +

      escapeHtml(
        displayLinkValue(
          link
        )
      ) +

      '</div>' +

      '</div>' +

      '<div class="detail-head-actions">' +

      '<button type="button" class="secondary" onclick="openTeacherFormLink(' +

      i +

      ')">編集</button>' +

      '<button type="button" class="detail-delete-button" onclick="removeTeacherFormLink(' +

      i +

      ')">🗑 削除</button>' +

      '</div>' +

      '</div>' +

      '</div>';

  }

  area.innerHTML =
    html;

}


function openTeacherFormLink(
  index
) {

  editingPendingLinkIndex =

    typeof index ===
      'number'
      ? index
      : -1;

  setValue(
    'linkId',
    ''
  );

  setValue(
    'linkType',
    'Instagram'
  );

  setValue(
    'linkDisplayName',
    ''
  );

  setValue(
    'linkValue',
    ''
  );

  if (
    editingPendingLinkIndex >=
    0
  ) {

    var link =
      pendingLinks[
        editingPendingLinkIndex
      ];

    document.getElementById(
      'linkModalTitle'
    ).textContent =
      'リンク・SNSを編集';

    setValue(
      'linkId',
      link.linkId ||
      ''
    );

    setValue(
      'linkType',
      link.type ||
      ''
    );

    setValue(
      'linkDisplayName',
      link.displayName ||
      ''
    );

    setValue(
      'linkValue',
      link.value ||
      ''
    );

  } else {

    document.getElementById(
      'linkModalTitle'
    ).textContent =
      'リンク・SNSを追加';

  }

  updateLinkInputGuide();

  document.getElementById(
    'linkModal'
  ).classList.add(
    'show'
  );

}


function closeLinkForm() {

  document.getElementById(
    'linkModal'
  ).classList.remove(
    'show'
  );

  editingPendingLinkIndex =
    -1;

}


/* SNSごとに入力案内を切り替える */

function updateLinkInputGuide() {

  var type =
    normalizeLinkType(
      valueOf(
        'linkType'
      )
    );

  var label =
    document.getElementById(
      'linkValueLabel'
    );

  var input =
    document.getElementById(
      'linkValue'
    );

  var note =
    document.getElementById(
      'linkValueNote'
    );

  if (
    type === 'instagram'
  ) {

    label.textContent =
      'アカウント名またはURL';

    input.placeholder =
      '例：ユーザー名 / @ユーザー名 / Instagram URL';

    note.textContent =
      'ユーザー名・@付きユーザー名・URLのどれでも登録できます。';

    return;
  }


  if (
    type === 'facebook'
  ) {

    label.textContent =
      'ユーザー名・ページ名またはURL';

    input.placeholder =
      '例：ユーザー名 / Facebook URL';

    note.textContent =
      'ユーザー名・ページ名・URLのどれでも登録できます。';

    return;
  }


  if (
    type === 'x'
  ) {

    label.textContent =
      'アカウント名またはURL';

    input.placeholder =
      '例：ユーザー名 / @ユーザー名 / X URL';

    note.textContent =
      'ユーザー名・@付きユーザー名・URLのどれでも登録できます。';

    return;
  }


  if (
    type === 'threads'
  ) {

    label.textContent =
      'アカウント名またはURL';

    input.placeholder =
      '例：ユーザー名 / @ユーザー名 / Threads URL';

    note.textContent =
      'ユーザー名・@付きユーザー名・URLのどれでも登録できます。';

    return;
  }


  if (
    type === 'tiktok'
  ) {

    label.textContent =
      'アカウント名またはURL';

    input.placeholder =
      '例：ユーザー名 / @ユーザー名 / TikTok URL';

    note.textContent =
      'ユーザー名・@付きユーザー名・URLのどれでも登録できます。';

    return;
  }


  if (
    type === 'youtube'
  ) {

    label.textContent =
      'ハンドル名またはURL';

    input.placeholder =
      '例：@ハンドル名 / YouTube URL';

    note.textContent =
      '@ハンドル名またはチャンネルURLを登録できます。';

    return;
  }


  if (
    type === 'line'
  ) {

    label.textContent =
      'LINE公式アカウントIDまたはURL';

    input.placeholder =
      '例：@アカウントID / LINE URL';

    note.textContent =
      'LINE公式アカウントIDまたはURLを登録できます。';

    return;
  }


  label.textContent =
    'URL';

  input.placeholder =
    'https://...';

  note.textContent =
    'URLを入力してください。';

}


function saveLinkForm() {

  var payload = {

    linkId:
      valueOf(
        'linkId'
      ),

    type:
      valueOf(
        'linkType'
      ),

    displayName:
      valueOf(
        'linkDisplayName'
      ),

    value:
      valueOf(
        'linkValue'
      )

  };

  if (
    editingPendingLinkIndex >=
    0
  ) {

    pendingLinks[
      editingPendingLinkIndex
    ] =
      payload;

  } else {

    pendingLinks.push(
      payload
    );

  }

  closeLinkForm();

  renderLinksEditor();

}


async function removeTeacherFormLink(
  index
) {

  var link =
    pendingLinks[
      index
    ];

  if (
    !(await appConfirm(
      'リンクを削除しますか？',
      'このリンクを削除します。\nこの操作は元に戻せません。'
    ))
  ) {

    return;
  }

  if (
    link &&
    link.linkId
  ) {

    deletedLinkIds.push(
      link.linkId
    );

  }

  pendingLinks.splice(
    index,
    1
  );

  renderLinksEditor();

}


function renderDetailLink(
  link
) {

  var label =

    link.displayName ||

    link.type ||

    'リンク';

  return (

    '<div class="link-row">' +

    '<div class="link-row-main">' +

    '<div class="link-label">' +

    escapeHtml(
      label
    ) +

    '</div>' +

    '<div class="link-value">' +

    escapeHtml(
      displayLinkValue(
        link
      )
    ) +

    '</div>' +

    '</div>' +

    '<button class="secondary link-open" onclick="openLink(\'' +

    escapeJs(
      link.type ||
      ''
    ) +

    '\',\'' +

    escapeJs(
      link.value ||
      ''
    ) +

    '\')">開く</button>' +

    '</div>'

  );

}


/* 登録値を画面上で見やすく表示 */

function displayLinkValue(
  link
) {

  var type =
    normalizeLinkType(
      link.type
    );

  var value =
    String(
      link.value ||
      ''
    ).trim();

  if (!value) {
    return '';
  }

  if (
    isHttpUrl(value)
  ) {

    return value;
  }

  if (
    type === 'facebook'
  ) {

    return stripLeadingAt(
      value
    );
  }

  if (
    type === 'line'
  ) {

    return value.charAt(0) === '@'
      ? value
      : '@' + value;
  }

  if (
    isAccountBasedSocial(
      type
    )
  ) {

    return '@' +
      stripLeadingAt(
        value
      );
  }

  return value;

}


/* SNS種別を統一 */

function normalizeLinkType(
  type
) {

  var value =
    String(
      type ||
      ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ''
      );

  if (
    value === 'twitter'
  ) {
    return 'x';
  }

  if (
    value === 'tik tok'
  ) {
    return 'tiktok';
  }

  return value;

}


function isAccountBasedSocial(
  type
) {

  return [
    'instagram',
    'facebook',
    'x',
    'threads',
    'tiktok',
    'youtube',
    'line'
  ].indexOf(
    type
  ) !== -1;

}


function isHttpUrl(
  value
) {

  return /^https?:\/\//i.test(
    String(
      value ||
      ''
    ).trim()
  );

}


function stripLeadingAt(
  value
) {

  return String(
    value ||
    ''
  )
    .trim()
    .replace(
      /^@+/,
      ''
    );

}


/* SNS URLからアカウント名を拾える場合は拾う */

function extractAccountFromSocialUrl(
  type,
  value
) {

  var v =
    String(
      value ||
      ''
    ).trim();

  if (
    !isHttpUrl(v)
  ) {

    return stripLeadingAt(v);
  }

  try {

    var url =
      new URL(v);

    var path =
      url.pathname
        .replace(
          /^\/+/,
          ''
        )
        .replace(
          /\/+$/,
          ''
        );

    if (
      type === 'instagram'
    ) {

      return path
        .split('/')[0]
        .replace(
          /^@/,
          ''
        );

    }

    if (
      type === 'facebook'
    ) {

      if (
        path === 'profile.php'
      ) {

        return v;
      }

      return path
        .split('/')[0]
        .replace(
          /^@/,
          ''
        );

    }

    if (
      type === 'x'
    ) {

      return path
        .split('/')[0]
        .replace(
          /^@/,
          ''
        );

    }

    if (
      type === 'threads'
    ) {

      return path
        .split('/')[0]
        .replace(
          /^@/,
          ''
        );

    }

    if (
      type === 'tiktok'
    ) {

      return path
        .split('/')[0]
        .replace(
          /^@/,
          ''
        );

    }

    if (
      type === 'youtube'
    ) {

      var first =
        path.split('/')[0];

      if (
        first &&
        first.charAt(0) === '@'
      ) {

        return first.replace(
          /^@/,
          ''
        );

      }

      return v;

    }

    if (
      type === 'line'
    ) {

      return path
        .split('/')
        .pop()
        .replace(
          /^@/,
          ''
        );

    }

  } catch (e) {}

  return v;

}


/* SNSアカウント名 → 開けるURLへ変換 */

function socialUrlFromValue(
  type,
  value
) {

  var v =
    String(
      value ||
      ''
    ).trim();

  if (!v) {
    return '';
  }

  if (
    isHttpUrl(v)
  ) {

    return v;
  }

  var account =
    stripLeadingAt(v);

  if (!account) {
    return '';
  }

  if (
    type === 'instagram'
  ) {

    return (
      'https://www.instagram.com/' +
      encodeURIComponent(
        account
      ) +
      '/'
    );

  }

  if (
    type === 'facebook'
  ) {

    return (
      'https://www.facebook.com/' +
      encodeURIComponent(
        account
      )
    );

  }

  if (
    type === 'x'
  ) {

    return (
      'https://x.com/' +
      encodeURIComponent(
        account
      )
    );

  }

  if (
    type === 'threads'
  ) {

    return (
      'https://www.threads.net/@' +
      encodeURIComponent(
        account
      )
    );

  }

  if (
    type === 'tiktok'
  ) {

    return (
      'https://www.tiktok.com/@' +
      encodeURIComponent(
        account
      )
    );

  }

  if (
    type === 'youtube'
  ) {

    return (
      'https://www.youtube.com/@' +
      encodeURIComponent(
        account
      )
    );

  }

  if (
    type === 'line'
  ) {

    return (
      'https://page.line.me/' +
      encodeURIComponent(
        account
      )
    );

  }

  return '';

}


/* Instagram旧列との互換 */

function firstInstagramAccountFromPendingLinks() {

  for (
    var i = 0;
    i < pendingLinks.length;
    i++
  ) {

    if (
      normalizeLinkType(
        pendingLinks[i].type
      ) ===
      'instagram'
    ) {

      var value =
        pendingLinks[i].value ||
        '';

      var account =
        extractAccountFromSocialUrl(
          'instagram',
          value
        );

      if (
        account &&
        !isHttpUrl(account)
      ) {

        return account;
      }

      return '';

    }

  }

  return '';

}


/* リンクを開く */

function openLink(
  type,
  value
) {

  if (!value) {
    return;
  }

  var normalizedType =
    normalizeLinkType(
      type
    );

  var url = '';

  if (
    isAccountBasedSocial(
      normalizedType
    )
  ) {

    url =
      socialUrlFromValue(
        normalizedType,
        value
      );

  } else {

    url =
      String(
        value
      ).trim();

    if (
      !/^https?:\/\//i.test(
        url
      )
    ) {

      url =
        'https://' +
        url;

    }

  }

  if (!url) {
    return;
  }

  window.open(
    url,
    '_blank',
    'noopener'
  );

}


/* ========================================
   子ども
   ======================================== */

function renderChildrenEditor(
  children
) {

  document.getElementById(
    'childrenEditArea'
  ).innerHTML =

    '<div class="detail-head">' +

    '<div class="section-title">子ども情報</div>' +

    '<button type="button" class="secondary" onclick="addChildRow()">' +

    '＋ 子どもを追加' +

    '</button>' +

    '</div>' +

    '<div id="childRows"></div>';

  for (
    var i = 0;
    i < children.length;
    i++
  ) {

    addChildRow(
      children[i]
    );

  }

}


function addChildRow(
  child
) {

  child =
    child ||
    {};

  var div =
    document.createElement(
      'div'
    );

  div.className =
    'child-edit';

  div.setAttribute(
    'data-child-id',
    child.childId ||
    ''
  );

  var gradeSelect =
    '<select class="child-grade">';

  for (
    var i = 0;
    i < gradeOptions.length;
    i++
  ) {

    var grade =
      gradeOptions[i];

    gradeSelect +=

      '<option value="' +

      escapeAttr(
        grade
      ) +

      '"' +

      (
        child.grade ===
          grade
          ? ' selected'
          : ''
      ) +

      '>' +

      escapeHtml(
        grade ||
        '未設定'
      ) +

      '</option>';

  }

  gradeSelect +=
    '</select>';

  div.innerHTML =

    '<div class="grid2">' +

    '<div class="field">' +

    '<label>名前</label>' +

    '<input class="child-name" value="' +

    escapeAttr(
      child.name ||
      ''
    ) +

    '">' +

    '</div>' +

    '<div class="field">' +

    '<label>ふりがな</label>' +

    '<input class="child-kana" value="' +

    escapeAttr(
      child.kana ||
      ''
    ) +

    '">' +

    '</div>' +

    '</div>' +

    '<div class="grid2">' +

    '<div class="field">' +

    '<label>呼び名</label>' +

    '<input class="child-nickname" value="' +

    escapeAttr(
      child.nickname ||
      ''
    ) +

    '">' +

    '</div>' +

    '<div class="field">' +

    '<label>性別</label>' +

    '<select class="child-gender">' +

    '<option value=""' +

    (
      !child.gender
        ? ' selected'
        : ''
    ) +

    '>未設定</option>' +

    '<option value="女"' +

    (
      child.gender ===
        '女'
        ? ' selected'
        : ''
    ) +

    '>女</option>' +

    '<option value="男"' +

    (
      child.gender ===
        '男'
        ? ' selected'
        : ''
    ) +

    '>男</option>' +

    '</select>' +

    '</div>' +

    '</div>' +

    '<div class="grid2">' +

    '<div class="field">' +

    '<label>学年</label>' +

    gradeSelect +

    '</div>' +

    '<div class="field">' +

    '<label>年齢</label>' +

    '<input type="number" class="child-age" value="' +

    escapeAttr(
      child.ageManual ||
      ''
    ) +

    '">' +

    '</div>' +

    '</div>' +

    '<div class="field">' +

    '<label>生まれ年</label>' +

    '<input type="number" class="child-year" value="' +

    escapeAttr(
      child.birthYear ||
      ''
    ) +

    '">' +

    '</div>' +

    '<div class="grid2">' +

    '<div class="field">' +

    '<label>誕生月</label>' +

    '<input type="number" min="1" max="12" class="child-month" value="' +

    escapeAttr(
      child.birthMonth ||
      ''
    ) +

    '">' +

    '</div>' +

    '<div class="field">' +

    '<label>誕生日</label>' +

    '<input type="number" min="1" max="31" class="child-day" value="' +

    escapeAttr(
      child.birthDay ||
      ''
    ) +

    '">' +

    '</div>' +

    '</div>' +

    '<div class="field">' +

    '<label>メモ</label>' +

    '<textarea class="child-memo">' +

    escapeHtml(
      child.memo ||
      ''
    ) +

    '</textarea>' +

    '</div>' +

    '<button type="button" class="detail-delete-button" onclick="removeChildRow(this)">' +

    '🗑 この子ども情報を削除' +

    '</button>';

  document.getElementById(
    'childRows'
  ).appendChild(
    div
  );

}


async function saveChildrenAfterTeacher(
  teacher
) {

  var rows =
    document.querySelectorAll(
      '.child-edit'
    );

  for (
    var i = 0;
    i < rows.length;
    i++
  ) {

    var row =
      rows[i];

    var payload = {

      childId:
        row.getAttribute(
          'data-child-id'
        ) ||
        '',

      teacherId:
        teacher.teacherId,

      name:
        row.querySelector(
          '.child-name'
        ).value,

      kana:
        row.querySelector(
          '.child-kana'
        ).value,

      nickname:
        row.querySelector(
          '.child-nickname'
        ).value,

      gender:
        row.querySelector(
          '.child-gender'
        ).value,

      grade:
        row.querySelector(
          '.child-grade'
        ).value,

      birthYear:
        row.querySelector(
          '.child-year'
        ).value,

      birthMonth:
        row.querySelector(
          '.child-month'
        ).value,

      birthDay:
        row.querySelector(
          '.child-day'
        ).value,

      ageManual:
        row.querySelector(
          '.child-age'
        ).value,

      memo:
        row.querySelector(
          '.child-memo'
        ).value

    };

    await runScript(
      'saveChild',
      [
        payload
      ]
    );

  }

}


async function saveLinksAfterTeacher(
  teacherId
) {

  for (
    var deleteIndex = 0;
    deleteIndex < deletedLinkIds.length;
    deleteIndex++
  ) {

    await runScript(
      'deleteLink',
      [
        deletedLinkIds[
          deleteIndex
        ]
      ]
    );

  }

  for (
    var i = 0;
    i < pendingLinks.length;
    i++
  ) {

    var link =
      pendingLinks[i];

    await runScript(
      'saveLink',
      [
        {

          linkId:
            link.linkId ||
            '',

          teacherId:
            teacherId,

          type:
            link.type ||
            '',

          displayName:
            link.displayName ||
            '',

          value:
            link.value ||
            '',

          sortOrder:
            i + 1

        }
      ]
    );

  }

}


async function saveInteractionsAfterTeacher(
  teacherId
) {

  for (
    var deleteIndex = 0;
    deleteIndex < deletedInteractionIds.length;
    deleteIndex++
  ) {

    await runScript(
      'deleteInteraction',
      [
        deletedInteractionIds[
          deleteIndex
        ]
      ]
    );

  }

  for (
    var i = 0;
    i < pendingInteractions.length;
    i++
  ) {

    var interaction =
      pendingInteractions[i];

    await runScript(
      'saveInteraction',
      [
        {

          interactionId:
            interaction.interactionId ||
            '',

          teacherId:
            teacherId,

          date:
            interaction.date ||
            '',

          interactionType:
            interaction.interactionType ||
            '',

          memo:
            interaction.memo ||
            ''

        }
      ]
    );

  }

}


async function refreshAfterSave(
  teacherId
) {

  teachers =
    (
      await runScript(
        'getTeachers'
      )
    ) ||
    [];

  closeTeacherForm();

  renderAll();

  renderJapanMap();

  var teacher =
    findTeacher(
      teacherId
    );

  if (teacher) {

    openTeacherDetail(
      teacherId
    );

  }

}


async function removeChildRow(
  button
) {

  var row =
    button.closest(
      '.child-edit'
    );

  var childId =
    row.getAttribute(
      'data-child-id'
    );

  if (!childId) {

    row.remove();

    return;
  }

  if (
    !(await appConfirm(
      '子ども情報を削除しますか？',
      'この子ども情報を削除します。\nこの操作は元に戻せません。'
    ))
  ) {

    return;
  }

  setLoading(true);

  try {

    await runScript(
      'deleteChild',
      [
        childId
      ]
    );

    row.remove();

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


/* ========================================
   先生削除
   ======================================== */

async function deleteTeacherAction(
  id
) {

  if (
    !(await appConfirm(
      personLabel() +
      'を削除しますか？',
      '紐づく子ども情報・交流履歴・リンクも削除されます。\nこの操作は元に戻せません。'
    ))
  ) {

    return;
  }

  setLoading(true);

  try {

    await runScript(
      'deleteTeacher',
      [
        id
      ]
    );

    teachers =
      (
        await runScript(
          'getTeachers'
        )
      ) ||
      [];

    selectedTeacherId = '';

    renderAll();

    renderJapanMap();

    showPage(
      'map'
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


/* ========================================
   住所候補
   ======================================== */

function showPrefectureResults() {

  var query =
    valueOf(
      'prefecture'
    );

  var box =
    document.getElementById(
      'prefResults'
    );

  box.innerHTML = '';

  for (
    var i = 0;
    i < prefectures.length;
    i++
  ) {

    var pref =
      prefectures[i];

    if (
      query &&
      pref.indexOf(query) === -1
    ) {

      continue;
    }

    var item =
      document.createElement(
        'div'
      );

    item.className =
      'combo-option';

    item.textContent =
      pref;

    item.onclick =
      makePrefSelector(
        pref
      );

    box.appendChild(
      item
    );

  }

  box.classList.add(
    'show'
  );

}


function makePrefSelector(pref) {

  return function() {

    setValue(
      'prefecture',
      pref
    );

    setValue(
      'city',
      ''
    );

    document.getElementById(
      'prefResults'
    ).classList.remove(
      'show'
    );

  };

}


function showCityResults() {

  var query =
    valueOf(
      'city'
    );

  var selectedPref =
    valueOf(
      'prefecture'
    );

  var results = [];

  for (
    var pref in addressMaster
  ) {

    if (
      !addressMaster.hasOwnProperty(
        pref
      )
    ) {
      continue;
    }

    if (
      selectedPref &&
      pref !== selectedPref
    ) {
      continue;
    }

    var cities =
      addressMaster[pref] ||
      [];

    for (
      var i = 0;
      i < cities.length;
      i++
    ) {

      var city =
        cities[i];

      if (
        query &&
        city.indexOf(query) === -1
      ) {
        continue;
      }

      results.push({

        prefecture:
          pref,

        city:
          city

      });

      if (
        results.length >= 100
      ) {
        break;
      }

    }

    if (
      results.length >= 100
    ) {
      break;
    }

  }

  var box =
    document.getElementById(
      'cityResults'
    );

  box.innerHTML = '';

  for (
    var j = 0;
    j < results.length;
    j++
  ) {

    var result =
      results[j];

    var item =
      document.createElement(
        'div'
      );

    item.className =
      'combo-option';

    item.textContent =

      result.city +

      '｜' +

      result.prefecture;

    item.onclick =
      makeCitySelector(
        result
      );

    box.appendChild(
      item
    );

  }

  box.classList.add(
    'show'
  );

}


function makeCitySelector(row) {

  return function() {

    setValue(
      'city',
      row.city
    );

    setValue(
      'prefecture',
      row.prefecture
    );

    document.getElementById(
      'cityResults'
    ).classList.remove(
      'show'
    );

  };

}


function hideCombos() {

  document.getElementById(
    'prefResults'
  ).classList.remove(
    'show'
  );

  document.getElementById(
    'cityResults'
  ).classList.remove(
    'show'
  );

}


document.addEventListener(
  'click',
  function(e) {

    if (
      !e.target.closest(
        '.combo'
      )
    ) {

      hideCombos();

    }

    if (
      !e.target.closest(
        '.setting-combo'
      )
    ) {

      hideSettingSuggestions();

    }

  }
);


/* ========================================
   外部リンク
   ======================================== */

function openGoogleMap(
  address
) {

  if (!address) {
    return;
  }

  window.open(

    'https://www.google.com/maps/search/?api=1&query=' +

    encodeURIComponent(
      address
    ),

    '_blank',

    'noopener'

  );

}


/* ========================================
   設定
   ======================================== */

var settingCandidates = {

  appName: [
    'つながりマップ',
    'メンバーマップ',
    '先生マップ',
    '講師マップ',
    '仲間マップ',
    'スタッフマップ',
    'コミュニティマップ',
    'Academy Map',
    'Member Map',
    'Teacher Map'
  ],

  personLabel: [
    '先生',
    '講師',
    'メンバー',
    'スタッフ',
    '仲間',
    '担当者',
    '受講生'
  ],

  placeLabel: [
    '店名',
    'サロン名',
    '店舗名',
    '教室名',
    '所属先',
    '勤務先',
    '会社名',
    '施設名'
  ],

  placeKanaLabel: [
    '店名ふりがな',
    'サロン名ふりがな',
    '店舗名ふりがな',
    '教室名ふりがな',
    '所属先ふりがな',
    '勤務先ふりがな',
    '会社名ふりがな',
    '施設名ふりがな'
  ]

};


function showSettingSuggestions(
  inputId,
  resultId,
  candidateType,
  showAll
) {

  var input =
    document.getElementById(
      inputId
    );

  var box =
    document.getElementById(
      resultId
    );

  if (
    !input ||
    !box
  ) {
    return;
  }

  hideSettingSuggestions();

  var query =
    String(
      input.value ||
      ''
    ).trim();

  var candidates =
    settingCandidates[
      candidateType
    ] ||
    [];

  box.innerHTML = '';

  var matched;

  if (showAll) {

    matched =
      candidates.slice();

  } else {

    matched =
      candidates.filter(
        function(candidate) {

          if (!query) {
            return true;
          }

          return candidate.indexOf(
            query
          ) !== -1;

        }
      );

  }

  matched.forEach(
    function(candidate) {

      var item =
        document.createElement(
          'button'
        );

      item.type =
        'button';

      item.className =
        'setting-option';

      item.textContent =
        candidate;

      item.onclick =
        function(event) {

          event.preventDefault();
          event.stopPropagation();

          input.value =
            candidate;

          hideSettingSuggestions();

        };

      box.appendChild(
        item
      );

    }
  );

  if (
    matched.length === 0
  ) {

    var note =
      document.createElement(
        'div'
      );

    note.className =
      'setting-no-result';

    note.textContent =
      '候補にない名称もそのまま入力できます。';

    box.appendChild(
      note
    );

  }

  box.classList.add(
    'show'
  );

}


function hideSettingSuggestions() {

  document
    .querySelectorAll(
      '.setting-results'
    )
    .forEach(
      function(box) {

        box.classList.remove(
          'show'
        );

      }
    );

}


function personLabel() {

  return String(
    appSettings.personLabel ||
    '先生'
  ).trim() ||
    '先生';

}


function placeLabel() {

  return String(
    appSettings.placeLabel ||
    '店名'
  ).trim() ||
    '店名';

}


function placeKanaLabel() {

  return String(
    appSettings.placeKanaLabel ||
    '店名ふりがな'
  ).trim() ||
    '店名ふりがな';

}


function appName() {

  return String(
    appSettings.appName ||
    'Academy Map'
  ).trim() ||
    'Academy Map';

}


function fillSettingsForm() {

  setValue(
    'settingAppName',
    appName()
  );

  setValue(
    'settingPersonLabel',
    personLabel()
  );

  setValue(
    'settingPlaceLabel',
    placeLabel()
  );

  setValue(
    'settingPlaceKanaLabel',
    placeKanaLabel()
  );

}


async function saveSettingsForm() {

  var payload = {

    appName:
      valueOf(
        'settingAppName'
      ) ||
      'Academy Map',

    personLabel:
      valueOf(
        'settingPersonLabel'
      ) ||
      '先生',

    placeLabel:
      valueOf(
        'settingPlaceLabel'
      ) ||
      '店名',

    placeKanaLabel:
      valueOf(
        'settingPlaceKanaLabel'
      ) ||
      '店名ふりがな'

  };

  setLoading(true);

  try {

    appSettings =
      await runScript(
        'saveAppSettings',
        [
          payload
        ]
      );

    cacheUiSettings();

    applySettingsToUi();

    renderAll();

    renderJapanMap();

    alert(
      '設定を保存しました。'
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


function applySettingsToUi() {

  var app =
    appName();

  var person =
    personLabel();

  var brandName =
    document.getElementById(
      'brandName'
    );

  if (brandName) {

    brandName.textContent =
      app;

  }

  var brandSub =
    document.getElementById(
      'brandSub'
    );

  if (brandSub) {

    brandSub.textContent =

      '全国の' +

      person +

      '管理';

  }

  var authAppName =
    document.getElementById(
      'authAppName'
    );

  if (authAppName) {

    authAppName.textContent =
      app;

  }

  var authDescription =
    document.getElementById(
      'authDescription'
    );

  if (authDescription) {

    authDescription.textContent =

      'Googleアカウントでログインして' +

      person +

      '情報を開きます。';

  }

  document.title =
    app;

  var appleAppTitle =
    document.getElementById(
      'appleAppTitle'
    );

  if (appleAppTitle) {

    appleAppTitle.setAttribute(
      'content',
      app
    );

  }

  var listPageTitle =
    document.getElementById(
      'listPageTitle'
    );

  if (listPageTitle) {

    listPageTitle.textContent =

      person +

      '一覧';

  }

  var navListText =
    document.getElementById(
      'navListText'
    );

  if (navListText) {

    navListText.textContent =

      person +

      '一覧';

  }

  var mapLegendActive =
    document.getElementById(
      'mapLegendActive'
    );

  if (mapLegendActive) {

    mapLegendActive.textContent =

      person +

      'あり';

  }

  var activePrefBtn =
    document.getElementById(
      'activePrefBtn'
    );

  if (activePrefBtn) {

    activePrefBtn.textContent =

      person +

      'がいる県のみ';

  }

  var mapSearch =
    document.getElementById(
      'mapSearch'
    );

  if (mapSearch) {

    mapSearch.placeholder =

      '名前・' +

      placeLabel() +

      '・地域を検索';

  }

  var listSearch =
    document.getElementById(
      'listSearch'
    );

  if (listSearch) {

    listSearch.placeholder =

      '名前・呼び名・' +

      placeLabel() +

      '・地域で検索';

  }

  var globalSearch =
    document.getElementById(
      'globalSearch'
    );

  if (globalSearch) {

    globalSearch.placeholder =

      '名前・ふりがな・呼び名・' +

      placeLabel() +

      '・SNS・住所';

  }

  var placeNameLabel =
    document.getElementById(
      'placeNameLabel'
    );

  if (placeNameLabel) {

    placeNameLabel.textContent =
      placeLabel();

  }

  var placeKanaLabelEl =
    document.getElementById(
      'placeKanaLabel'
    );

  if (placeKanaLabelEl) {

    placeKanaLabelEl.textContent =
      placeKanaLabel();

  }

  updateDynamicManifest();

}


function updateDynamicManifest() {

  var manifestLink =
    document.getElementById(
      'appManifest'
    );

  if (!manifestLink) {
    return;
  }

  try {

    var manifest = {

      name:
        appName(),

      short_name:
        appName(),

      start_url:
        './',

      display:
        'standalone',

      background_color:
        '#faf7f6',

      theme_color:
        '#d95b72',

      icons: [

        {
          src:
            './icon-192.png',
          sizes:
            '192x192',
          type:
            'image/png'
        },

        {
          src:
            './icon-512.png',
          sizes:
            '512x512',
          type:
            'image/png'
        }

      ]

    };

    var blob =
      new Blob(

        [
          JSON.stringify(
            manifest
          )
        ],

        {
          type:
            'application/manifest+json'
        }

      );

    var url =
      URL.createObjectURL(
        blob
      );

    manifestLink.setAttribute(
      'href',
      url
    );

  } catch (e) {}

}


/* ========================================
   アプリ内確認ダイアログ
   ======================================== */

function appConfirm(
  title,
  message,
  okText
) {

  return new Promise(
    function(resolve) {

      var modal =
        document.getElementById(
          'confirmModal'
        );

      var titleEl =
        document.getElementById(
          'confirmTitle'
        );

      var messageEl =
        document.getElementById(
          'confirmMessage'
        );

      var cancel =
        document.getElementById(
          'confirmCancel'
        );

      var ok =
        document.getElementById(
          'confirmOk'
        );

      titleEl.textContent =
        title ||
        '確認';

      messageEl.textContent =
        message ||
        '';

      ok.textContent =
        okText ||
        '削除する';

      function finish(result) {

        modal.classList.remove(
          'show'
        );

        cancel.onclick = null;
        ok.onclick = null;

        resolve(result);

      }

      cancel.onclick =
        function() {
          finish(false);
        };

      ok.onclick =
        function() {
          finish(true);
        };

      modal.classList.add(
        'show'
      );

    }
  );

}


/* ========================================
   共通
   ======================================== */

function valueOf(id) {

  var el =
    document.getElementById(
      id
    );

  return el
    ? String(
        el.value ||
        ''
      ).trim()
    : '';

}


function setValue(
  id,
  value
) {

  var el =
    document.getElementById(
      id
    );

  if (!el) {
    return;
  }

  el.value =

    value === null ||
    value === undefined
      ? ''
      : value;

}


function setLoading(show) {

  document.getElementById(
    'loading'
  ).classList.toggle(
    'show',
    show
  );

}


function handleError(error) {

  setLoading(false);

  alert(

    error &&
    error.message
      ? error.message
      : String(error)

  );

}


function escapeHtml(str) {

  return String(

    str === null ||
    str === undefined
      ? ''
      : str

  )

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );

}


function escapeAttr(str) {

  return escapeHtml(str);

}


function escapeJs(str) {

  return String(

    str === null ||
    str === undefined
      ? ''
      : str

  )

    .replace(
      /\\/g,
      '\\\\'
    )

    .replace(
      /'/g,
      "\\'"
    )

    .replace(
      /\r/g,
      ''
    )

    .replace(
      /\n/g,
      '\\n'
    );

}

/* =========================================================
   Mirel Map
   汎用化UI拡張
   2026-10-08
   ========================================================= */

var mirelAffiliations =
  [];

var mirelTeacherAffiliations =
  {};

var mirelProfiles =
  {};

var mirelFeatureSettings =
  {};


var MIREL_FEATURE_DEFAULTS = {

  gender: true,
  birthday: true,
  age: true,
  grade: true,
  affiliation: true,
  place: true,
  address: true,
  sns: true,
  interactions: true,
  children: true

};


/* =========================================================
   学年候補
   ========================================================= */

gradeOptions = [

  '',

  '年少',
  '年中',
  '年長',

  '小1',
  '小2',
  '小3',
  '小4',
  '小5',
  '小6',

  '中1',
  '中2',
  '中3',

  '高1',
  '高2',
  '高3',

  '短大1',
  '短大2',

  '大学1',
  '大学2',
  '大学3',
  '大学4',

  '大学6年制1',
  '大学6年制2',
  '大学6年制3',
  '大学6年制4',
  '大学6年制5',
  '大学6年制6',

  '専門1',
  '専門2',
  '専門3',
  '専門4',

  '修士1',
  '修士2',

  '博士1',
  '博士2',
  '博士3',

  'その他'

];


/* =========================================================
   ON / OFF
   ========================================================= */

function mirelFeatureOn(
  key
) {

  var value =
    mirelFeatureSettings[
      key
    ];


  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {

    return (
      MIREL_FEATURE_DEFAULTS[
        key
      ] !== false
    );

  }


  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  );

}


/* =========================================================
   拡張データ読込
   ========================================================= */

async function mirelLoadExtraData() {

  var data =
    await runScript(
      'getMirelExtraData'
    );


  data =
    data ||
    {};


  mirelAffiliations =
    data.affiliations ||
    [];


  mirelTeacherAffiliations =
    data.teacherAffiliations ||
    {};


  mirelProfiles =
    data.profiles ||
    {};


  mirelFeatureSettings =
    data.featureSettings ||
    {};

}


/* =========================================================
   startApp 拡張
   ========================================================= */

var mirelBaseStartApp =
  startApp;


startApp =
  async function() {

    await mirelBaseStartApp();


    try {

      await mirelLoadExtraData();


      mirelInstallExtraStyles();

      mirelInstallSettingsUi();

      mirelInstallSearchFilters();

      mirelApplyCurrentVisibility();

      mirelMaybeShowInitialSetup();


      renderAll();

      renderJapanMap();

    } catch (e) {

      console.error(
        e
      );

    }

  };


/* =========================================================
   CSS
   ========================================================= */

function mirelInstallExtraStyles() {

  if (
    document.getElementById(
      'mirel-extra-style'
    )
  ) {

    return;

  }


  var style =
    document.createElement(
      'style'
    );


  style.id =
    'mirel-extra-style';


  style.textContent = `

    .mirel-extra-section {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid #eee3e1;
    }

    .mirel-feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }

    .mirel-feature-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 12px;
      border: 1px solid #eee2df;
      border-radius: 14px;
      background: #fffafa;
      font-size: 14px;
    }

    .mirel-feature-toggle input {
      width: 18px;
      height: 18px;
      accent-color: #df607f;
    }

    .mirel-aff-master-row {
      display: grid;
      grid-template-columns: 42px 1fr auto auto;
      gap: 8px;
      align-items: center;
      margin-top: 9px;
    }

    .mirel-aff-master-row input[type="text"] {
      min-width: 0;
    }

    .mirel-aff-master-row input[type="color"] {
      width: 42px;
      height: 40px;
      border: 0;
      padding: 2px;
      background: transparent;
    }

    .mirel-aff-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .mirel-aff-choice {
      position: relative;
      cursor: pointer;
    }

    .mirel-aff-choice input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .mirel-aff-choice span {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 2px solid transparent;
      font-size: 13px;
      font-weight: 600;
    }

    .mirel-aff-choice input:checked + span {
      border-color: #444;
      box-shadow: 0 0 0 2px #fff inset;
    }

    .mirel-aff-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 5px;
    }

    .mirel-aff-tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .mirel-filter-select {
      width: 100%;
      margin-top: 10px;
      min-height: 44px;
      border-radius: 12px;
      border: 1px solid #ddd;
      background: #fff;
      padding: 0 12px;
      font-size: 15px;
    }

    .mirel-hidden {
      display: none !important;
    }

    .mirel-setup-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(255,255,255,.96);
      overflow-y: auto;
      padding: 24px 16px 60px;
    }

    .mirel-setup-card {
      max-width: 560px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #f1e3e2;
      border-radius: 24px;
      padding: 24px 18px;
      box-shadow: 0 10px 40px rgba(80,50,50,.08);
    }

    .mirel-setup-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .mirel-setup-note {
      color: #777;
      font-size: 13px;
      line-height: 1.7;
      margin-bottom: 18px;
    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   所属
   ========================================================= */

function mirelAffiliationById(
  id
) {

  for (
    var i = 0;
    i < mirelAffiliations.length;
    i++
  ) {

    if (
      mirelAffiliations[i]
        .affiliationId ===
      id
    ) {

      return mirelAffiliations[
        i
      ];

    }

  }


  return null;

}


function mirelAffiliationIds(
  teacherId
) {

  return (
    mirelTeacherAffiliations[
      teacherId
    ] ||
    []
  );

}


function mirelAffiliationNames(
  teacherId
) {

  return mirelAffiliationIds(
    teacherId
  )
    .map(
      function(id) {

        var row =
          mirelAffiliationById(
            id
          );


        return row
          ? row.name
          : '';

      }
    )
    .filter(Boolean);

}


function mirelTeacherHasAffiliation(
  teacherId,
  affiliationId
) {

  if (!affiliationId) {
    return true;
  }


  return (
    mirelAffiliationIds(
      teacherId
    ).indexOf(
      affiliationId
    ) !== -1
  );

}


/* =========================================================
   学年
   ========================================================= */

function mirelCurrentFiscalYear() {

  var now =
    new Date();


  return (
    now.getMonth() + 1 >= 4
      ? now.getFullYear()
      : now.getFullYear() - 1
  );

}


function mirelGradeGroups() {

  return [

    [
      '年少',
      '年中',
      '年長'
    ],

    [
      '小1',
      '小2',
      '小3',
      '小4',
      '小5',
      '小6'
    ],

    [
      '中1',
      '中2',
      '中3'
    ],

    [
      '高1',
      '高2',
      '高3'
    ],

    [
      '短大1',
      '短大2'
    ],

    [
      '大学1',
      '大学2',
      '大学3',
      '大学4'
    ],

    [
      '大学6年制1',
      '大学6年制2',
      '大学6年制3',
      '大学6年制4',
      '大学6年制5',
      '大学6年制6'
    ],

    [
      '専門1',
      '専門2',
      '専門3',
      '専門4'
    ],

    [
      '修士1',
      '修士2'
    ],

    [
      '博士1',
      '博士2',
      '博士3'
    ]

  ];

}


function mirelGradeDisplay(
  grade,
  baseYear
) {

  if (!grade) {
    return '';
  }


  if (
    grade ===
    'その他'
  ) {

    return grade;

  }


  var diff =
    mirelCurrentFiscalYear() -
    Number(
      baseYear ||
      mirelCurrentFiscalYear()
    );


  if (diff < 0) {
    diff = 0;
  }


  var groups =
    mirelGradeGroups();


  for (
    var i = 0;
    i < groups.length;
    i++
  ) {

    var index =
      groups[i].indexOf(
        grade
      );


    if (
      index !== -1
    ) {

      var next =
        index +
        diff;


      if (
        next >=
        groups[i].length
      ) {

        return '卒業・修了';

      }


      return groups[i][
        next
      ];

    }

  }


  return grade;

}


/* =========================================================
   人物フォームへ
   学年・所属を追加
   ========================================================= */

function mirelInstallTeacherExtraFields() {

  var salon =
    document.getElementById(
      'salonName'
    );


  if (!salon) {
    return;
  }


  var salonField =
    salon.closest(
      '.field'
    );


  if (!salonField) {
    return;
  }


  if (
    !document.getElementById(
      'mirelGradeField'
    )
  ) {

    var gradeField =
      document.createElement(
        'div'
      );


    gradeField.className =
      'field';

    gradeField.id =
      'mirelGradeField';


    var options =
      '<option value=""></option>';


    gradeOptions.forEach(
      function(value) {

        if (!value) {
          return;
        }


        options +=

          '<option value="' +
          escapeHtml(
            value
          ) +
          '">' +

          escapeHtml(
            value
          ) +

          '</option>';

      }
    );


    gradeField.innerHTML =

      '<label>学年</label>' +

      '<select id="mirelGrade">' +

      options +

      '</select>';


    salonField.parentNode.insertBefore(
      gradeField,
      salonField
    );

  }


  if (
    !document.getElementById(
      'mirelAffiliationField'
    )
  ) {

    var affField =
      document.createElement(
        'div'
      );


    affField.className =
      'field';

    affField.id =
      'mirelAffiliationField';


    affField.innerHTML =

      '<label>所属</label>' +

      '<div id="mirelAffiliationPicker" class="mirel-aff-picker"></div>';


    salonField.parentNode.insertBefore(
      affField,
      salonField
    );

  }

}


function mirelRenderAffiliationPicker(
  teacherId
) {

  var box =
    document.getElementById(
      'mirelAffiliationPicker'
    );


  if (!box) {
    return;
  }


  var selected =
    mirelAffiliationIds(
      teacherId
    );


  if (
    !mirelAffiliations.length
  ) {

    box.innerHTML =

      '<div class="form-note">' +
      '所属は設定画面から追加できます。' +
      '</div>';

    return;

  }


  var html =
    '';


  mirelAffiliations.forEach(
    function(row) {

      var checked =
        selected.indexOf(
          row.affiliationId
        ) !== -1;


      html +=

        '<label class="mirel-aff-choice">' +

        '<input type="checkbox" ' +
        'class="mirel-aff-checkbox" ' +
        'value="' +
        escapeHtml(
          row.affiliationId
        ) +
        '"' +
        (
          checked
            ? ' checked'
            : ''
        ) +
        '>' +

        '<span style="' +
        'background:' +
        escapeHtml(
          row.color ||
          '#f4b8c4'
        ) +
        '33;' +
        'color:#444;' +
        '">' +

        escapeHtml(
          row.name
        ) +

        '</span>' +

        '</label>';

    }
  );


  box.innerHTML =
    html;

}


function mirelSelectedAffiliationIds() {

  return Array
    .from(
      document.querySelectorAll(
        '.mirel-aff-checkbox:checked'
      )
    )
    .map(
      function(input) {

        return input.value;

      }
    );

}


/* =========================================================
   openTeacherForm 拡張
   ========================================================= */

var mirelBaseOpenTeacherForm =
  openTeacherForm;


openTeacherForm =
  function(id) {

    mirelBaseOpenTeacherForm(
      id
    );


    mirelInstallTeacherExtraFields();


    var profile =
      id
        ? (
            mirelProfiles[
              id
            ] ||
            {}
          )
        : {};


    var grade =
      document.getElementById(
        'mirelGrade'
      );


    if (grade) {

      grade.value =
        profile.grade ||
        '';

    }


    mirelRenderAffiliationPicker(
      id ||
      ''
    );


    mirelApplyFormVisibility();

  };


/* =========================================================
   saveTeacherForm 拡張
   ========================================================= */

var mirelBaseSaveTeacherForm =
  saveTeacherForm;


saveTeacherForm =
  async function() {

    var originalTeacherId =
      valueOf(
        'teacherId'
      );


    var gradeInput =
      document.getElementById(
        'mirelGrade'
      );


    var grade =
      gradeInput
        ? gradeInput.value
        : '';


    var affiliationIds =
      mirelSelectedAffiliationIds();


    await mirelBaseSaveTeacherForm();


    var teacherId =
      originalTeacherId ||
      selectedTeacherId;


    if (!teacherId) {
      return;
    }


    try {

      var result =
        await runScript(

          'saveMirelTeacherExtras',

          [{

            teacherId:
              teacherId,

            grade:
              grade,

            affiliationIds:
              affiliationIds

          }]

        );


      result =
        result ||
        {};


      mirelAffiliations =
        result.affiliations ||
        mirelAffiliations;


      mirelTeacherAffiliations =
        result.teacherAffiliations ||
        mirelTeacherAffiliations;


      mirelProfiles =
        result.profiles ||
        mirelProfiles;


      if (
        selectedTeacherId ===
        teacherId
      ) {

        var teacher =
          findTeacher(
            teacherId
          );


        if (teacher) {

          renderTeacherDetail(
            teacher
          );

        }

      }


      mirelRefreshAffiliationFilters();

    } catch (e) {

      handleError(
        e
      );

    }

  };


/* =========================================================
   詳細へ学年・所属を表示
   ========================================================= */

var mirelBaseRenderTeacherDetail =
  renderTeacherDetail;


renderTeacherDetail =
  function(teacher) {

    mirelBaseRenderTeacherDetail(
      teacher
    );


    mirelInjectDetailExtras(
      teacher
    );


    mirelApplyDetailVisibility();

  };


function mirelInjectDetailExtras(
  teacher
) {

  var detail =
    document.getElementById(
      'detailContent'
    );


  if (!detail) {
    return;
  }


  var firstCard =
    detail.querySelector(
      '.card'
    );


  if (!firstCard) {
    return;
  }


  firstCard
    .querySelectorAll(
      '.mirel-extra-detail-row'
    )
    .forEach(
      function(row) {

        row.remove();

      }
    );


  var beforeRow =
    null;


  firstCard
    .querySelectorAll(
      '.detail-row'
    )
    .forEach(
      function(row) {

        var label =
          row.querySelector(
            '.label'
          );


        if (
          !beforeRow &&
          label &&
          (
            label.textContent.trim() ===
              placeLabel() ||
            label.textContent.trim() ===
              placeKanaLabel()
          )
        ) {

          beforeRow =
            row;

        }

      }
    );


  var profile =
    mirelProfiles[
      teacher.teacherId
    ] ||
    {};


  if (
    mirelFeatureOn(
      'grade'
    )
  ) {

    var gradeText =
      mirelGradeDisplay(
        profile.grade,
        profile.gradeBaseYear
      );


    if (gradeText) {

      var gradeRow =
        document.createElement(
          'div'
        );


      gradeRow.className =
        'detail-row mirel-extra-detail-row';


      gradeRow.innerHTML =

        '<div class="label">学年</div>' +

        '<div class="value">' +
        escapeHtml(
          gradeText
        ) +
        '</div>';


      firstCard.insertBefore(
        gradeRow,
        beforeRow
      );

    }

  }


  if (
    mirelFeatureOn(
      'affiliation'
    )
  ) {

    var ids =
      mirelAffiliationIds(
        teacher.teacherId
      );


    if (ids.length) {

      var affRow =
        document.createElement(
          'div'
        );


      affRow.className =
        'detail-row mirel-extra-detail-row';


      var tags =
        '';


      ids.forEach(
        function(id) {

          var row =
            mirelAffiliationById(
              id
            );


          if (!row) {
            return;
          }


          tags +=

            '<span class="mirel-aff-tag" ' +
            'style="background:' +
            escapeHtml(
              row.color ||
              '#f4b8c4'
            ) +
            '33;">' +

            escapeHtml(
              row.name
            ) +

            '</span>';

        }
      );


      affRow.innerHTML =

        '<div class="label">所属</div>' +

        '<div class="value mirel-aff-tags">' +
        tags +
        '</div>';


      firstCard.insertBefore(
        affRow,
        beforeRow
      );

    }

  }

}


/* =========================================================
   検索に所属を追加
   ========================================================= */

var mirelBaseTeacherMatches =
  teacherMatches;


teacherMatches =
  function(
    teacher,
    query
  ) {

    if (
      mirelBaseTeacherMatches(
        teacher,
        query
      )
    ) {

      return true;

    }


    if (!query) {
      return true;
    }


    var affText =
      mirelAffiliationNames(
        teacher.teacherId
      )
        .join(
          ' '
        )
        .toLowerCase();


    return (
      affText.indexOf(
        query.toLowerCase()
      ) !== -1
    );

  };


/* =========================================================
   所属絞り込み
   ========================================================= */

function mirelInstallSearchFilters() {

  mirelInstallOneFilter(
    'listSearch',
    'mirelListAffiliationFilter',
    renderFullTeacherList
  );


  mirelInstallOneFilter(
    'globalSearch',
    'mirelSearchAffiliationFilter',
    renderSearchResults
  );


  mirelRefreshAffiliationFilters();

}


function mirelInstallOneFilter(
  searchId,
  filterId,
  callback
) {

  var search =
    document.getElementById(
      searchId
    );


  if (
    !search ||
    document.getElementById(
      filterId
    )
  ) {

    return;

  }


  var select =
    document.createElement(
      'select'
    );


  select.id =
    filterId;

  select.className =
    'mirel-filter-select';


  select.onchange =
    callback;


  search.insertAdjacentElement(
    'afterend',
    select
  );

}


function mirelRefreshAffiliationFilters() {

  [
    'mirelListAffiliationFilter',
    'mirelSearchAffiliationFilter'
  ]
    .forEach(
      function(id) {

        var select =
          document.getElementById(
            id
          );


        if (!select) {
          return;
        }


        var current =
          select.value;


        var html =

          '<option value="">' +
          '所属：すべて' +
          '</option>';


        mirelAffiliations.forEach(
          function(row) {

            html +=

              '<option value="' +
              escapeHtml(
                row.affiliationId
              ) +
              '">' +

              escapeHtml(
                row.name
              ) +

              '</option>';

          }
        );


        select.innerHTML =
          html;


        if (
          Array
            .from(
              select.options
            )
            .some(
              function(option) {

                return (
                  option.value ===
                  current
                );

              }
            )
        ) {

          select.value =
            current;

        }

      }
    );

}


/* =========================================================
   一覧絞り込み
   ========================================================= */

var mirelBaseRenderFullTeacherList =
  renderFullTeacherList;


renderFullTeacherList =
  function() {

    var filter =
      document.getElementById(
        'mirelListAffiliationFilter'
      );


    var affiliationId =
      filter
        ? filter.value
        : '';


    if (!affiliationId) {

      mirelBaseRenderFullTeacherList();

      return;

    }


    var original =
      teachers;


    teachers =
      original.filter(
        function(teacher) {

          return mirelTeacherHasAffiliation(
            teacher.teacherId,
            affiliationId
          );

        }
      );


    try {

      mirelBaseRenderFullTeacherList();

    } finally {

      teachers =
        original;

    }

  };


/* =========================================================
   検索画面
   ========================================================= */

renderSearchResults =
  function() {

    var search =
      document.getElementById(
        'globalSearch'
      );


    var query =
      search
        ? (
            search.value ||
            ''
          ).trim()
        : '';


    var filter =
      document.getElementById(
        'mirelSearchAffiliationFilter'
      );


    var affiliationId =
      filter
        ? filter.value
        : '';


    var resultBox =
      document.getElementById(
        'searchResults'
      );


    if (!resultBox) {
      return;
    }


    if (
      !query &&
      !affiliationId
    ) {

      resultBox.innerHTML =

        '<div class="empty">' +
        '検索語を入力するか、所属を選択してください。' +
        '</div>';

      return;

    }


    var html =
      '';


    teachers.forEach(
      function(teacher) {

        if (
          !teacherMatches(
            teacher,
            query
          )
        ) {

          return;

        }


        if (
          !mirelTeacherHasAffiliation(
            teacher.teacherId,
            affiliationId
          )
        ) {

          return;

        }


        html +=
          teacherCard(
            teacher
          );

      }
    );


    resultBox.innerHTML =

      html ||

      (
        '<div class="empty">' +
        '該当する' +
        escapeHtml(
          personLabel()
        ) +
        'はいません。</div>'
      );

  };


/* =========================================================
   設定画面
   ========================================================= */

function mirelInstallSettingsUi() {

  var page =
    document.getElementById(
      'pageSettings'
    );


  if (!page) {
    return;
  }


  var card =
    page.querySelector(
      '.card'
    );


  if (
    !card ||
    document.getElementById(
      'mirelExtraSettings'
    )
  ) {

    return;

  }


  var actions =
    card.querySelector(
      '.form-actions'
    );


  var area =
    document.createElement(
      'div'
    );


  area.id =
    'mirelExtraSettings';

  area.className =
    'mirel-extra-section';


  area.innerHTML =

    '<div class="section-title">使用する項目</div>' +

    '<div class="form-note">' +
    'OFFにしても登録済みデータは削除されません。再度ONにすると元のデータが表示されます。' +
    '</div>' +

    '<div id="mirelFeatureGrid" class="mirel-feature-grid"></div>' +

    '<div class="mirel-extra-section">' +

      '<div class="section-title">所属ラベル</div>' +

      '<div class="form-note">' +
      '所属はいくつでも作成できます。色も自由に変更できます。' +
      '</div>' +

      '<div id="mirelAffiliationMaster"></div>' +

      '<div class="mirel-aff-master-row">' +

        '<input id="mirelNewAffColor" type="color" value="#f4b8c4">' +

        '<input id="mirelNewAffName" type="text" placeholder="新しい所属名">' +

        '<button class="primary" type="button" onclick="mirelAddAffiliation()">追加</button>' +

        '<span></span>' +

      '</div>' +

    '</div>';


  if (actions) {

    card.insertBefore(
      area,
      actions
    );

  } else {

    card.appendChild(
      area
    );

  }


  mirelRenderFeatureSettings();

  mirelRenderAffiliationMaster();

}


/* =========================================================
   使用項目
   ========================================================= */

function mirelFeatureDefinitions() {

  return [

    ['gender', '性別'],
    ['birthday', '誕生日'],
    ['age', '年齢'],
    ['grade', '学年'],
    ['affiliation', '所属'],
    ['place', placeLabel()],
    ['address', '住所'],
    ['sns', 'SNSリンク'],
    ['interactions', '交流履歴'],
    ['children', '子ども情報']

  ];

}


function mirelRenderFeatureSettings() {

  var grid =
    document.getElementById(
      'mirelFeatureGrid'
    );


  if (!grid) {
    return;
  }


  var html =
    '';


  mirelFeatureDefinitions()
    .forEach(
      function(row) {

        html +=

          '<label class="mirel-feature-toggle">' +

          '<input type="checkbox" ' +
          'class="mirel-feature-setting" ' +
          'data-feature="' +
          row[0] +
          '"' +
          (
            mirelFeatureOn(
              row[0]
            )
              ? ' checked'
              : ''
          ) +
          '>' +

          '<span>' +
          escapeHtml(
            row[1]
          ) +
          '</span>' +

          '</label>';

      }
    );


  grid.innerHTML =
    html;

}


/* =========================================================
   設定保存を拡張
   ========================================================= */

var mirelBaseSaveSettingsForm =
  saveSettingsForm;


saveSettingsForm =
  async function() {

    await mirelBaseSaveSettingsForm();


    var payload =
      {};


    document
      .querySelectorAll(
        '.mirel-feature-setting'
      )
      .forEach(
        function(input) {

          payload[
            input.dataset.feature
          ] =
            input.checked;

        }
      );


    try {

      var result =
        await runScript(

          'saveMirelFeatureSettings',

          [
            payload
          ]

        );


      mirelFeatureSettings =
        (
          result &&
          result.featureSettings
        ) ||
        mirelFeatureSettings;


      mirelApplyCurrentVisibility();

      renderAll();

      renderJapanMap();

    } catch (e) {

      handleError(
        e
      );

    }

  };


/* =========================================================
   所属マスター
   ========================================================= */

function mirelRenderAffiliationMaster() {

  var box =
    document.getElementById(
      'mirelAffiliationMaster'
    );


  if (!box) {
    return;
  }


  if (
    !mirelAffiliations.length
  ) {

    box.innerHTML =

      '<div class="empty">' +
      '所属はまだありません。' +
      '</div>';

    return;

  }


  var html =
    '';


  mirelAffiliations.forEach(
    function(row) {

      html +=

        '<div class="mirel-aff-master-row">' +

          '<input ' +
          'type="color" ' +
          'id="mirelAffColor_' +
          row.affiliationId +
          '" ' +
          'value="' +
          escapeHtml(
            row.color ||
            '#f4b8c4'
          ) +
          '">' +

          '<input ' +
          'type="text" ' +
          'id="mirelAffName_' +
          row.affiliationId +
          '" ' +
          'value="' +
          escapeHtml(
            row.name
          ) +
          '">' +

          '<button ' +
          'type="button" ' +
          'class="secondary" ' +
          '<button ' +
'type="button" ' +
'class="secondary" ' +
'onclick="mirelUpdateAffiliation(\'' +
escapeJs(
  row.affiliationId
) +
'\')">' +
'保存' +
'</button>' +

'<button ' +
'type="button" ' +
'class="secondary" ' +
'onclick="mirelDeleteAffiliation(\'' +
escapeJs(
  row.affiliationId
) +
'\')">' +
'削除' +
'</button>' +

        '</div>';

    }
  );


  box.innerHTML =
    html;

}


async function mirelAddAffiliation() {

  var name =
    valueOf(
      'mirelNewAffName'
    );


  var colorInput =
    document.getElementById(
      'mirelNewAffColor'
    );


  var color =
    colorInput
      ? colorInput.value
      : '#f4b8c4';


  if (!name) {

    alert(
      '所属名を入力してください。'
    );

    return;

  }


  await mirelSaveAffiliation({
    name: name,
    color: color
  });


  setValue(
    'mirelNewAffName',
    ''
  );

}


async function mirelUpdateAffiliation(
  id
) {

  var name =
    valueOf(
      'mirelAffName_' +
      id
    );


  var colorInput =
    document.getElementById(
      'mirelAffColor_' +
      id
    );


  await mirelSaveAffiliation({

    affiliationId:
      id,

    name:
      name,

    color:
      colorInput
        ? colorInput.value
        : '#f4b8c4'

  });

}


async function mirelSaveAffiliation(
  payload
) {

  try {

    setLoading(
      true
    );


    var result =
      await runScript(

        'saveMirelAffiliation',

        [
          payload
        ]

      );


    mirelAffiliations =
      result.affiliations ||
      [];


    mirelTeacherAffiliations =
      result.teacherAffiliations ||
      {};


    mirelRenderAffiliationMaster();

    mirelRefreshAffiliationFilters();


    if (
      document.getElementById(
        'mirelAffiliationPicker'
      )
    ) {

      mirelRenderAffiliationPicker(
        valueOf(
          'teacherId'
        )
      );

    }

  } catch (e) {

    handleError(
      e
    );

  } finally {

    setLoading(
      false
    );

  }

}


async function mirelDeleteAffiliation(
  id
) {

  if (
    !confirm(
      'この所属を削除しますか？\n人物との紐付けも解除されます。'
    )
  ) {

    return;

  }


  try {

    setLoading(
      true
    );


    var result =
      await runScript(

        'deleteMirelAffiliation',

        [
          id
        ]

      );


    mirelAffiliations =
      result.affiliations ||
      [];


    mirelTeacherAffiliations =
      result.teacherAffiliations ||
      {};


    mirelRenderAffiliationMaster();

    mirelRefreshAffiliationFilters();

    renderAll();

  } catch (e) {

    handleError(
      e
    );

  } finally {

    setLoading(
      false
    );

  }

}


/* =========================================================
   フォーム表示 ON/OFF
   ========================================================= */

function mirelToggleField(
  id,
  visible
) {

  var element =
    document.getElementById(
      id
    );


  if (!element) {
    return;
  }


  var field =
    element.closest(
      '.field'
    ) ||
    element;


  field.classList.toggle(
    'mirel-hidden',
    !visible
  );

}


function mirelApplyFormVisibility() {

  mirelToggleField(
    'gender',
    mirelFeatureOn(
      'gender'
    )
  );


  [
    'birthYear',
    'birthMonth',
    'birthDay'
  ]
    .forEach(
      function(id) {

        mirelToggleField(
          id,
          mirelFeatureOn(
            'birthday'
          )
        );

      }
    );


  mirelToggleField(
    'ageManual',
    mirelFeatureOn(
      'age'
    )
  );


  mirelToggleField(
    'mirelGrade',
    mirelFeatureOn(
      'grade'
    )
  );


  var aff =
    document.getElementById(
      'mirelAffiliationField'
    );


  if (aff) {

    aff.classList.toggle(
      'mirel-hidden',
      !mirelFeatureOn(
        'affiliation'
      )
    );

  }


  mirelToggleField(
    'salonName',
    mirelFeatureOn(
      'place'
    )
  );


  mirelToggleField(
    'salonKana',
    mirelFeatureOn(
      'place'
    )
  );


  [
    'prefecture',
    'city',
    'address1',
    'address2'
  ]
    .forEach(
      function(id) {

        mirelToggleField(
          id,
          mirelFeatureOn(
            'address'
          )
        );

      }
    );


  var links =
    document.getElementById(
      'linkEditArea'
    );


  if (links) {

    links.classList.toggle(
      'mirel-hidden',
      !mirelFeatureOn(
        'sns'
      )
    );

  }


  var interactions =
    document.getElementById(
      'interactionEditArea'
    );


  if (interactions) {

    interactions.classList.toggle(
      'mirel-hidden',
      !mirelFeatureOn(
        'interactions'
      )
    );

  }


  var children =
    document.getElementById(
      'childrenEditArea'
    );


  if (children) {

    children.classList.toggle(
      'mirel-hidden',
      !mirelFeatureOn(
        'children'
      )
    );

  }

}


/* =========================================================
   Detail表示 ON/OFF
   ========================================================= */

function mirelApplyDetailVisibility() {

  var detail =
    document.getElementById(
      'detailContent'
    );


  if (!detail) {
    return;
  }


  detail
    .querySelectorAll(
      '.detail-row'
    )
    .forEach(
      function(row) {

        var label =
          row.querySelector(
            '.label'
          );


        if (!label) {
          return;
        }


        var text =
          label.textContent.trim();


        var visible =
          true;


        if (
          text ===
          '性別'
        ) {

          visible =
            mirelFeatureOn(
              'gender'
            );

        }


        if (
          text ===
          '誕生日'
        ) {

          visible =
            mirelFeatureOn(
              'birthday'
            );

        }


        if (
          text ===
          '年齢'
        ) {

          visible =
            mirelFeatureOn(
              'age'
            );

        }


        if (
          text ===
          '学年'
        ) {

          visible =
            mirelFeatureOn(
              'grade'
            );

        }


        if (
          text ===
          '所属'
        ) {

          visible =
            mirelFeatureOn(
              'affiliation'
            );

        }


        if (
          text ===
            placeLabel() ||
          text ===
            placeKanaLabel()
        ) {

          visible =
            mirelFeatureOn(
              'place'
            );

        }


        if (
          text ===
          '住所'
        ) {

          visible =
            mirelFeatureOn(
              'address'
            );

        }


        if (
          text ===
          'リンク・SNS'
        ) {

          visible =
            mirelFeatureOn(
              'sns'
            );

        }


        row.classList.toggle(
          'mirel-hidden',
          !visible
        );

      }
    );


  detail
    .querySelectorAll(
      '.card'
    )
    .forEach(
      function(card) {

        var title =
          card.querySelector(
            '.section-title'
          );


        if (!title) {
          return;
        }


        var text =
          title.textContent.trim();


        if (
          text.indexOf(
            '交流履歴'
          ) === 0
        ) {

          card.classList.toggle(
            'mirel-hidden',
            !mirelFeatureOn(
              'interactions'
            )
          );

        }


        if (
          text.indexOf(
            '子ども情報'
          ) === 0
        ) {

          card.classList.toggle(
            'mirel-hidden',
            !mirelFeatureOn(
              'children'
            )
          );

        }

      }
    );


  if (
    !mirelFeatureOn(
      'address'
    )
  ) {

    detail
      .querySelectorAll(
        '.actions button'
      )
      .forEach(
        function(button) {

          if (
            button.textContent.indexOf(
              'Google Maps'
            ) !== -1
          ) {

            button
              .closest(
                '.actions'
              )
              .classList.add(
                'mirel-hidden'
              );

          }

        }
      );

  }

}


/* =========================================================
   現在画面へ設定反映
   ========================================================= */

function mirelApplyCurrentVisibility() {

  mirelApplyFormVisibility();


  if (
    selectedTeacherId
  ) {

    var teacher =
      findTeacher(
        selectedTeacherId
      );


    if (teacher) {

      renderTeacherDetail(
        teacher
      );

    }

  }

}


/* =========================================================
   初回セットアップ
   ========================================================= */

function mirelMaybeShowInitialSetup() {

  if (
    mirelFeatureSettings
      .setupCompleted ===
      '1'
  ) {

    return;

  }


  if (
    document.getElementById(
      'mirelSetupOverlay'
    )
  ) {

    return;

  }


  var overlay =
    document.createElement(
      'div'
    );


  overlay.id =
    'mirelSetupOverlay';

  overlay.className =
    'mirel-setup-overlay';


  var checks =
    '';


  mirelFeatureDefinitions()
    .forEach(
      function(row) {

        checks +=

          '<label class="mirel-feature-toggle">' +

          '<input ' +
          'type="checkbox" ' +
          'class="mirel-setup-feature" ' +
          'data-feature="' +
          row[0] +
          '" checked>' +

          '<span>' +
          escapeHtml(
            row[1]
          ) +
          '</span>' +

          '</label>';

      }
    );


  overlay.innerHTML =

    '<div class="mirel-setup-card">' +

      '<div class="mirel-setup-title">' +
      '使用する項目を選択' +
      '</div>' +

      '<div class="mirel-setup-note">' +
      '後から設定画面でいつでも変更できます。OFFにしてもデータは削除されません。' +
      '</div>' +

      '<div class="mirel-feature-grid">' +
      checks +
      '</div>' +

      '<div class="form-actions" style="margin-top:22px;">' +

        '<button class="primary" type="button" onclick="mirelFinishSetup()">' +
        'この内容で始める' +
        '</button>' +

      '</div>' +

    '</div>';


  document.body.appendChild(
    overlay
  );

}


async function mirelFinishSetup() {

  var payload = {

    setupCompleted:
      true

  };


  document
    .querySelectorAll(
      '.mirel-setup-feature'
    )
    .forEach(
      function(input) {

        payload[
          input.dataset.feature
        ] =
          input.checked;

      }
    );


  try {

    setLoading(
      true
    );


    var result =
      await runScript(

        'saveMirelFeatureSettings',

        [
          payload
        ]

      );


    mirelFeatureSettings =
      result.featureSettings ||
      {};


    var overlay =
      document.getElementById(
        'mirelSetupOverlay'
      );


    if (overlay) {

      overlay.remove();

    }


    mirelRenderFeatureSettings();

    mirelApplyCurrentVisibility();

  } catch (e) {

    handleError(
      e
    );

  } finally {

    setLoading(
      false
    );

  }

}
