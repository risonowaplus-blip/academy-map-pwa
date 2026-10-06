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

var interactionFormSource =
  'detail';

var pendingInteractions =
  [];

var deletedInteractionIds =
  [];

var editingPendingInteractionIndex =
  -1;


var STORAGE_TOKEN =
  'academyAccessToken';

var STORAGE_EXPIRES =
  'academyAccessTokenExpiresAt';

var STORAGE_AUTHORIZED =
  'academyGoogleAuthorized';


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

    registerServiceWorker();

    waitForGoogleIdentity(
      function() {

        if (
          !configReady()
        ) {

          document.getElementById(
            'authMessage'
          ).textContent =
            'config.js の設定が完了していません。';

          document.getElementById(
            'loginButton'
          ).disabled =
            true;

          return;

        }

        initializeGoogleTokenClient();

        restoreOrLogin();

      }
    );

  }
);


function registerServiceWorker() {

  if (
    'serviceWorker' in navigator
  ) {

    navigator.serviceWorker
      .register(
        './sw.js'
      )
      .catch(
        function() {}
      );

  }

}


function waitForGoogleIdentity(
  callback
) {

  var attempts = 0;


  var timer =
    setInterval(
      function() {

        attempts++;


        if (
          window.google &&
          google.accounts &&
          google.accounts.oauth2
        ) {

          clearInterval(
            timer
          );

          callback();

          return;

        }


        if (
          attempts > 100
        ) {

          clearInterval(
            timer
          );

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
    google.accounts.oauth2
      .initTokenClient({

        client_id:
          CONFIG.GOOGLE_CLIENT_ID,

        scope:
          CONFIG.SCOPES,

        callback:
          function(resp) {

            if (
              resp.error
            ) {

              if (
                pendingTokenReject
              ) {

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


            if (
              pendingTokenResolve
            ) {

              pendingTokenResolve(
                accessToken
              );

            }


            clearPendingTokenPromise();

          }

      });

}


function clearPendingTokenPromise() {

  pendingTokenResolve =
    null;

  pendingTokenReject =
    null;

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

  var savedToken =
    '';

  var savedExpiresAt =
    0;

  var wasAuthorized =
    false;


  try {

    savedToken =
      localStorage.getItem(
        STORAGE_TOKEN
      ) ||
      '';


    savedExpiresAt =
      Number(
        localStorage.getItem(
          STORAGE_EXPIRES
        ) ||
        0
      );


    wasAuthorized =
      localStorage.getItem(
        STORAGE_AUTHORIZED
      ) ===
      '1';

  } catch (e) {}


  if (
    savedToken &&
    savedExpiresAt >
      Date.now()
  ) {

    accessToken =
      savedToken;

    accessTokenExpiresAt =
      savedExpiresAt;

    await startApp();

    return;

  }


  if (
    wasAuthorized
  ) {

    try {

      await requestGoogleToken(
        ''
      );

      await startApp();

      return;

    } catch (e) {

      showLoginScreen();

      return;

    }

  }


  showLoginScreen();

}


function requestGoogleToken(
  promptMode
) {

  return new Promise(
    function(
      resolve,
      reject
    ) {

      if (
        !tokenClient
      ) {

        reject(
          new Error(
            'Googleログインの準備ができていません。'
          )
        );

        return;

      }


      pendingTokenResolve =
        resolve;

      pendingTokenReject =
        reject;


      try {

        tokenClient
          .requestAccessToken({

            prompt:
              promptMode

          });


      } catch (e) {

        clearPendingTokenPromise();

        reject(
          e
        );

      }

    }
  );

}


async function login() {

  setLoading(
    true
  );


  try {

    await requestGoogleToken(
      'select_account'
    );

    await startApp();


  } catch (e) {

    showLoginScreen();


  } finally {

    setLoading(
      false
    );

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

  accessToken =
    '';


  accessTokenExpiresAt =
    0;


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

  if (
    !accessToken
  ) {

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

        method:
          'POST',

        headers: {

          'Authorization':
            'Bearer ' +
            accessToken,

          'Content-Type':
            'application/json'

        },

        body:
          JSON.stringify({

            function:
              functionName,

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

      await requestGoogleToken(
        ''
      );


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


    throw new Error(
      msg
    );

  }


  return data.response
    ? data.response.result
    : null;

}


/* ========================================
   初期読込
   ======================================== */

async function startApp() {

  setLoading(
    true
  );


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


    showAppScreen();


    renderAll();

    renderJapanMap();

    loadAddressMaster();


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


/* ========================================
   地方
   ======================================== */

function getRegionName(
  pref
) {

  if (
    pref ===
    '北海道'
  ) {

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
    ].indexOf(
      pref
    ) !== -1
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
    ].indexOf(
      pref
    ) !== -1
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
    ].indexOf(
      pref
    ) !== -1
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
    ].indexOf(
      pref
    ) !== -1
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
    ].indexOf(
      pref
    ) !== -1
  ) {

    return '中国';

  }


  if (
    [
      '徳島県',
      '香川県',
      '愛媛県',
      '高知県'
    ].indexOf(
      pref
    ) !== -1
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
    ].indexOf(
      pref
    ) !== -1
  ) {

    return '九州';

  }


  if (
    pref ===
    '沖縄県'
  ) {

    return '沖縄';

  }


  return '';

}


function getRegionBaseColor(
  region
) {

  var colors = {

    '北海道':
      '#D9ECF8',

    '東北':
      '#D8EFF4',

    '関東':
      '#FFF1C9',

    '中部':
      '#DDEFD8',

    '近畿':
      '#FBE4C9',

    '中国':
      '#F9DCD6',

    '四国':
      '#F5D9E8',

    '九州':
      '#E9DDF3',

    '沖縄':
      '#E5D8F0'

  };


  return colors[
    region
  ] ||
    '#EEF1F3';

}


function getRegionTeacherColor(
  region
) {

  var colors = {

    '北海道':
      '#8DC8EB',

    '東北':
      '#8FD0DB',

    '関東':
      '#F4CF70',

    '中部':
      '#9FCD91',

    '近畿':
      '#F2B978',

    '中国':
      '#EF9E91',

    '四国':
      '#DB94BB',

    '九州':
      '#B697D2',

    '沖縄':
      '#AE8BCB'

  };


  return colors[
    region
  ] ||
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


  el.innerHTML =
    '';


  var counts =
    getPrefCounts();


  var areas =
    [];


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
      getRegionName(
        pref
      );


    var color =
      getRegionBaseColor(
        region
      );


    var hoverColor =
      getRegionTeacherColor(
        region
      );


    if (
      count > 0
    ) {

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

        820,

        containerWidth *
        1.22

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


  updateSelectedPrefHeading();

}


/* ========================================
   住所データ
   ======================================== */

async function loadAddressMaster() {

  try {

    var cached =
      localStorage.getItem(
        'academyAddressMasterV1'
      );


    if (
      cached
    ) {

      addressMaster =
        JSON.parse(
          cached
        );

    }

  } catch (e) {}


  try {

    var response =
      await fetch(

        'https://geolonia.github.io/japanese-addresses/api/ja.json',

        {

          cache:
            'force-cache'

        }

      );


    if (
      response.ok
    ) {

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
    0;


  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    if (
      !teachers[i].prefecture
    ) {

      unknown++;

    }

  }


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

  var result =
    {};


  for (
    var i = 0;
    i < teachers.length;
    i++
  ) {

    var pref =
      teachers[i].prefecture;


    if (
      !pref
    ) {

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

  var count =
    0;


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


  if (
    selectedPrefecture ===
    '__UNKNOWN__'
  ) {

    el.textContent =

      '所在地不明｜先生 ' +

      getUnknownCount() +

      '名';


    return;

  }


  if (
    selectedPrefecture
  ) {

    var count =
      getPrefCounts()[
        selectedPrefecture
      ] ||
      0;


    el.textContent =

      selectedPrefecture +

      '｜先生 ' +

      count +

      '名';


    return;

  }


  el.textContent =
    '都道府県を選択';

}


/* ========================================
   都道府県一覧
   ======================================== */

function setPrefMode(
  mode
) {

  prefMode =
    mode;


  document.getElementById(
    'activePrefBtn'
  ).classList.toggle(

    'active',

    mode ===
      'active'

  );


  document.getElementById(
    'allPrefBtn'
  ).classList.toggle(

    'active',

    mode ===
      'all'

  );


  renderPrefList();

}


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


  var grouped =
    {};


  for (
    var r = 0;
    r < regionOrder.length;
    r++
  ) {

    grouped[
      regionOrder[r]
    ] =
      [];

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
      prefMode ===
        'active' &&
      count === 0
    ) {

      continue;

    }


    var region =
      getRegionName(
        pref
      );


    if (
      !grouped[
        region
      ]
    ) {

      grouped[
        region
      ] =
        [];

    }


    grouped[
      region
    ].push({

      prefecture:
        pref,

      count:
        count

    });

  }


  var html =
    '';


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
      regionPrefs.length ===
      0
    ) {

      continue;

    }


    var baseColor =
      getRegionBaseColor(
        regionName
      );


    var teacherColor =
      getRegionTeacherColor(
        regionName
      );


    html +=

      '<div class="pref-region-group"' +

      ' style="' +

      '--region-base:' +
      baseColor +
      ';' +

      '--region-active:' +
      teacherColor +
      ';">';


    html +=

      '<div class="pref-region-title">' +

      escapeHtml(
        regionName
      ) +

      '</div>';


    html +=

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


  if (
    unknown > 0
  ) {

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


function selectPrefecture(
  pref
) {

  selectedPrefecture =
    pref;


  selectedTeacherId =
    '';


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

  if (
    !query
  ) {

    return true;

  }


  var text = [

    teacher.name,

    teacher.kana,

    teacher.nickname,

    teacher.salonName,

    teacher.salonKana,

    teacher.instagram,

    teacher.prefecture,

    teacher.city,

    teacher.address1,

    teacher.address2,

    teacher.memo

  ]
    .join(
      ' '
    )
    .toLowerCase();


  return text.indexOf(
    query.toLowerCase()
  ) !==
    -1;

}


function teacherCard(
  teacher
) {

  var location =

    [
      teacher.prefecture,
      teacher.city
    ]

      .filter(
        Boolean
      )

      .join(
        ' '
      );


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

  var query =
    (
      document.getElementById(
        'mapSearch'
      ).value ||
      ''
    ).trim();


  var list =
    [];


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
    '先生一覧';


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
    list.length ===
    0
  ) {

    html +=
      '<div class="empty">該当する先生はいません。</div>';

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


  document.getElementById(
    'mapSide'
  ).innerHTML =
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


  var html =
    '';


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

    '<div class="empty">該当する先生はいません。</div>';

}


function renderSearchResults() {

  var query =
    (
      document.getElementById(
        'globalSearch'
      ).value ||
      ''
    ).trim();


  if (
    !query
  ) {

    document.getElementById(
      'searchResults'
    ).innerHTML =
      '<div class="empty">検索語を入力してください。</div>';


    return;

  }


  var html =
    '';


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

    '<div class="empty">該当する先生はいません。</div>';

}


/* ========================================
   ページ
   ======================================== */

function showPage(
  name
) {

  var pages = {

    map:
      'pageMap',

    list:
      'pageList',

    search:
      'pageSearch',

    detail:
      'pageDetail'

  };


  for (
    var key in pages
  ) {

    document.getElementById(
      pages[key]
    ).classList.toggle(

      'active',

      key ===
        name

    );

  }


  [
    'Map',
    'List',
    'Search'
  ].forEach(
    function(navName) {

      document.getElementById(
        'nav' +
        navName
      ).classList.toggle(

        'active',

        navName.toLowerCase() ===
          name

      );

    }
  );


  if (
    name ===
    'list'
  ) {

    renderFullTeacherList();

  }


  if (
    name ===
    'search'
  ) {

    renderSearchResults();

  }


  window.scrollTo(
    0,
    0
  );

}


/* ========================================
   先生 Detail
   ======================================== */

function findTeacher(
  id
) {

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


function openTeacherDetail(
  id
) {

  var teacher =
    findTeacher(
      id
    );


  if (
    !teacher
  ) {

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


function birthdayText(
  obj
) {

  var result =
    '';


  if (
    obj.birthYear
  ) {

    result +=
      obj.birthYear +
      '年';

  }


  if (
    obj.birthMonth
  ) {

    result +=
      obj.birthMonth +
      '月';

  }


  if (
    obj.birthDay
  ) {

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

    escapeHtml(
      label
    ) +

    '</div>' +

    '<div class="value">' +

    escapeHtml(
      String(
        value
      )
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


    '<button class="secondary" onclick="openTeacherForm(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">編集</button>' +


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
      'サロン名',
      teacher.salonName
    );


  html +=
    detailRow(
      'サロン名ふりがな',
      teacher.salonKana
    );


  html +=
    detailRow(
      '住所',
      teacher.fullAddress
    );


  html +=
    detailRow(
      'Instagram',
      teacher.instagram
        ? '@' +
          teacher.instagram
        : ''
    );


  html +=
    detailRow(
      'メモ',
      teacher.memo
    );


  html +=
    '<div class="actions">';


  if (
    teacher.instagram
  ) {

    html +=

      '<button class="secondary" onclick="openInstagram(\'' +

      escapeJs(
        teacher.instagram
      ) +

      '\')">Instagram</button>';

  }


  if (
    teacher.fullAddress
  ) {

    html +=

      '<button class="secondary" onclick="openGoogleMap(\'' +

      escapeJs(
        teacher.fullAddress
      ) +

      '\')">Google Maps</button>';

  }




  html +=
    '</div></div>';


  /* ==============================
     交流履歴
     ============================== */

  html +=

    '<div class="card">' +

    '<div class="detail-head">' +

    '<div class="section-title">交流履歴 ' +

    (
      teacher.interactions
        ? teacher.interactions.length
        : 0
    ) +

    '件</div>' +

    '<button class="primary" onclick="openInteractionForm()">＋ 追加</button>' +

    '</div>';


  var interactions =
    teacher.interactions ||
    [];


  if (
    interactions.length ===
    0
  ) {

    html +=
      '<div class="empty">交流記録はまだありません。</div>';

  } else {

    for (
      var interactionIndex = 0;
      interactionIndex < interactions.length;
      interactionIndex++
    ) {

      var interaction =
        interactions[
          interactionIndex
        ];


      html +=
        renderInteractionCard(
          interaction
        );

    }

  }


  html +=
    '</div>';


  /* ==============================
     子ども
     ============================== */

    html +=

    '<div class="card">' +

    '<div class="detail-head">' +

    '<div class="section-title">' +

    '子ども情報 ' +

    (
      teacher.children
        ? teacher.children.length
        : 0
    ) +

    '人</div>' +

    '<button class="primary" onclick="openTeacherFormForNewChild(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">＋ 追加</button>' +

    '</div>';

  if (
    !teacher.children ||
    teacher.children.length ===
      0
  ) {

    html +=
      '<div class="empty">登録なし</div>';

  } else {

    for (
      var i = 0;
      i < teacher.children.length;
      i++
    ) {

      var child =
        teacher.children[i];


      html +=
        '<div class="child">';


      html +=

        '<strong>' +

        escapeHtml(
          child.name ||
          child.nickname ||
          '名前未登録'
        ) +

        '</strong>';


      if (
        child.nickname
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

    '<strong>' +

    escapeHtml(
      dateText
    ) +

    '</strong>' +

    '<div class="meta">' +

    escapeHtml(
      typeText
    ) +

    '</div>' +

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

'\')">削除</button>' +

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

    '<div class="actions">' +

    '<button class="danger" onclick="deleteInteractionAction(\'' +

    escapeJs(
      interaction.interactionId
    ) +

    '\')">削除</button>' +

    '</div>' +

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


  if (
    !teacher
  ) {

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


  /* 先生フォーム内からの追加 */

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


  /* Detailから直接追加 */

  if (
    !selectedTeacherId
  ) {

    return;

  }


  payload.teacherId =
    selectedTeacherId;


  setLoading(
    true
  );


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

    handleError(
      e
    );


  } finally {

    setLoading(
      false
    );

  }

}


async function deleteInteractionAction(
  interactionId
) {

  if (
    !confirm(
      'この交流記録を削除しますか？'
    )
  ) {

    return;

  }


  setLoading(
    true
  );


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

    handleError(
      e
    );


  } finally {

    setLoading(
      false
    );

  }

}


function todayYmd() {

  var now =
    new Date();


  var year =
    now.getFullYear();


  var month =
    String(
      now.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );


  var day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  return (
    year +
    '-' +
    month +
    '-' +
    day
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


  document.getElementById(
    'modalTitle'
  ).textContent =

    teacher
      ? '先生情報を編集'
      : '先生を追加';


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
      'instagram',
      teacher.instagram
    );


    setValue(
      'memo',
      teacher.memo
    );


  } else {

    setValue(
      'gender',
      '女'
    );

  }


  renderChildrenEditor(

    teacher
      ? teacher.children ||
        []
      : []

  );


  renderTeacherFormInteractions();


  document.getElementById(
    'teacherModal'
  ).classList.add(
    'show'
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

    'instagram',

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
      valueOf(
        'instagram'
      ),

    memo:
      valueOf(
        'memo'
      )

  };


  setLoading(
    true
  );


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


    await saveInteractionsAfterTeacher(
      saved.teacherId
    );


    await refreshAfterSave(
      saved.teacherId
    );


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


/* ========================================
   子ども
   ======================================== */

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


  if (
    !area
  ) {

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

      '<strong>' +

      escapeHtml(
        interaction.date ||
        '日付未登録'
      ) +

      '</strong>' +

      '<div class="meta">' +

      escapeHtml(
        interaction.interactionType ||
        '種別未登録'
      ) +

      '</div>' +

      '</div>' +

      '<button type="button" class="secondary" onclick="openTeacherFormInteraction(' +

      i +

      ')">' +

      '編集' +

      '</button>' +

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

      '<div class="actions">' +

      '<button type="button" class="danger" onclick="removeTeacherFormInteraction(' +

      i +

      ')">' +

      '削除' +

      '</button>' +

      '</div>' +

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


function removeTeacherFormInteraction(
  index
) {

  var interaction =
    pendingInteractions[
      index
    ];


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

function renderChildrenEditor(
  children
) {

  document.getElementById(
    'childrenEditArea'
  ).innerHTML =

    '<div class="section-title">子ども情報</div>' +

    '<div id="childRows"></div>' +

    '<button type="button" class="secondary" onclick="addChildRow()">＋ 子どもを追加</button>';


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


    '<button type="button" class="danger" onclick="removeChildRow(this)">' +

    'この子ども情報を削除' +

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


  if (
    teacher
  ) {

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


  if (
    !childId
  ) {

    row.remove();

    return;

  }


  if (
    !confirm(
      'この子ども情報を削除しますか？'
    )
  ) {

    return;

  }


  setLoading(
    true
  );


  try {

    await runScript(
      'deleteChild',
      [
        childId
      ]
    );


    row.remove();


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


/* ========================================
   先生削除
   ======================================== */

async function deleteTeacherAction(
  id
) {

  if (
    !confirm(
      'この先生と紐づく子ども情報・交流履歴も削除します。\n本当に削除しますか？'
    )
  ) {

    return;

  }


  setLoading(
    true
  );


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


    selectedTeacherId =
      '';


    renderAll();

    renderJapanMap();


    showPage(
      'map'
    );


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


  box.innerHTML =
    '';


  for (
    var i = 0;
    i < prefectures.length;
    i++
  ) {

    var pref =
      prefectures[i];


    if (
      query &&
      pref.indexOf(
        query
      ) ===
        -1
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


function makePrefSelector(
  pref
) {

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


  var results =
    [];


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
      pref !==
        selectedPref
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
        city.indexOf(
          query
        ) ===
          -1
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
        results.length >=
        100
      ) {

        break;

      }

    }


    if (
      results.length >=
      100
    ) {

      break;

    }

  }


  var box =
    document.getElementById(
      'cityResults'
    );


  box.innerHTML =
    '';


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


function makeCitySelector(
  row
) {

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

  }
);


/* ========================================
   外部リンク
   ======================================== */

function openInstagram(
  account
) {

  if (
    !account
  ) {

    return;

  }


  window.open(

    'https://www.instagram.com/' +

    encodeURIComponent(
      account
    ),

    '_blank'

  );

}


function openGoogleMap(
  address
) {

  if (
    !address
  ) {

    return;

  }


  window.open(

    'https://www.google.com/maps/search/?api=1&query=' +

    encodeURIComponent(
      address
    ),

    '_blank'

  );

}


/* ========================================
   共通
   ======================================== */

function valueOf(
  id
) {

  return document
    .getElementById(
      id
    )
    .value
    .trim();

}


function setValue(
  id,
  value
) {

  document.getElementById(
    id
  ).value =

    value === null ||
    value === undefined
      ? ''
      : value;

}


function setLoading(
  show
) {

  document.getElementById(
    'loading'
  ).classList.toggle(
    'show',
    show
  );

}


function handleError(
  error
) {

  setLoading(
    false
  );


  alert(

    error &&
    error.message
      ? error.message
      : String(
          error
        )

  );

}


function escapeHtml(
  str
) {

  return String(
    str ||
    ''
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


function escapeAttr(
  str
) {

  return escapeHtml(
    str
  );

}


function escapeJs(
  str
) {

  return String(
    str ||
    ''
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
