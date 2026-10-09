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
  appName: 'Mirel Map',
  personLabel: '人物',
  placeLabel: '店名',
  placeKanaLabel: '店名ふりがな',
  fontSize: 'standard',
  lineSpacing: 'standard',
  fontScale: 100,
  lineHeight: 1.50,
  itemGap: 9
};

var STORAGE_TOKEN = 'academyAccessToken';
var STORAGE_EXPIRES = 'academyAccessTokenExpiresAt';
var STORAGE_AUTHORIZED = 'academyGoogleAuthorized';
var STORAGE_APP_SNAPSHOT = 'mirelAppSnapshotV2';
var APP_SNAPSHOT_VERSION = 2;

/* ========================================
   速度診断
   ======================================== */

var MIREL_PERF_STORAGE = 'mirelPerformanceHistoryV1';
var mirelLastApiTimings = {};

function mirelPerfNow() {
  if (
    window.performance &&
    typeof window.performance.now === 'function'
  ) {
    return window.performance.now();
  }
  return Date.now();
}

function mirelPerfMs(value) {
  var n = Number(value || 0);
  if (!isFinite(n)) {
    return 0;
  }
  return Math.round(n);
}

function mirelSavePerformance(type, values) {
  var entry = Object.assign(
    {
      type: type,
      at: new Date().toISOString()
    },
    values || {}
  );

  try {
    var history = JSON.parse(
      localStorage.getItem(MIREL_PERF_STORAGE) || '[]'
    );
    if (!Array.isArray(history)) {
      history = [];
    }
    history.push(entry);
    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }
    localStorage.setItem(
      MIREL_PERF_STORAGE,
      JSON.stringify(history)
    );
  } catch (e) {}

  try {
    console.log('[Mirel速度診断]', entry);
  } catch (e) {}

  mirelRenderPerformancePanel();
  return entry;
}

function mirelPerformanceHistory() {
  try {
    var history = JSON.parse(
      localStorage.getItem(MIREL_PERF_STORAGE) || '[]'
    );
    return Array.isArray(history) ? history : [];
  } catch (e) {
    return [];
  }
}

function mirelLastPerformance(type) {
  var history = mirelPerformanceHistory();
  for (var i = history.length - 1; i >= 0; i--) {
    if (history[i] && history[i].type === type) {
      return history[i];
    }
  }
  return null;
}

function mirelFormatPerfMs(ms) {
  var n = mirelPerfMs(ms);
  if (n >= 1000) {
    return (n / 1000).toFixed(n >= 10000 ? 1 : 2) + '秒';
  }
  return n + 'ms';
}

function mirelPerformanceServerLines(server) {
  if (!server || typeof server !== 'object') {
    return '';
  }
  var order = [
    ['ensureStructureMs', '構造確認'],
    ['teachersMs', '人物一覧'],
    ['settingsMs', '設定'],
    ['extraMs', '所属等'],
    ['teacherSaveMs', '人物保存'],
    ['childrenMs', '子ども'],
    ['linksMs', 'SNS'],
    ['interactionsMs', '交流履歴'],
    ['extrasMs', '学年・所属'],
    ['detailMs', '保存後詳細'],
    ['resultExtraMs', '保存後所属等']
  ];
  var parts = [];
  order.forEach(function(item) {
    if (server[item[0]] !== undefined) {
      parts.push(
        item[1] + ' ' + mirelFormatPerfMs(server[item[0]])
      );
    }
  });
  return parts.join(' / ');
}

function mirelPerfEntryHtml(title, entry) {
  if (!entry) {
    return (
      '<div class="mirel-perf-row">' +
      '<strong>' + title + '</strong>' +
      '<span>まだ計測データがありません</span>' +
      '</div>'
    );
  }

  var main = [];
  if (entry.totalMs !== undefined) {
    main.push('合計 ' + mirelFormatPerfMs(entry.totalMs));
  }
  if (entry.cacheVisibleMs !== undefined && entry.cacheVisibleMs !== null) {
    main.push('キャッシュ表示 ' + mirelFormatPerfMs(entry.cacheVisibleMs));
  }
  if (entry.apiMs !== undefined) {
    main.push('API ' + mirelFormatPerfMs(entry.apiMs));
  }
  if (entry.uiMs !== undefined) {
    main.push('画面更新 ' + mirelFormatPerfMs(entry.uiMs));
  }

  var serverLine = mirelPerformanceServerLines(entry.server);

  return (
    '<div class="mirel-perf-row">' +
      '<strong>' + title + '</strong>' +
      '<span>' + main.join(' / ') + '</span>' +
      (serverLine
        ? '<small>サーバー内：' + serverLine + '</small>'
        : '') +
    '</div>'
  );
}

function mirelRenderPerformancePanel() {
  var el = document.getElementById('mirelPerformancePanel');
  if (!el) {
    return;
  }
  var startup = mirelLastPerformance('startup');
  var save = mirelLastPerformance('save');
  el.innerHTML =
    mirelPerfEntryHtml('直近の起動', startup) +
    mirelPerfEntryHtml('直近の保存', save) +
    '<button type="button" class="secondary mirel-perf-copy" onclick="mirelCopyPerformanceReport()">計測結果をコピー</button>';
}

function mirelBuildPerformanceReport() {
  var startup = mirelLastPerformance('startup');
  var save = mirelLastPerformance('save');
  function line(title, entry) {
    if (!entry) return title + '：未計測';
    var parts = [];
    if (entry.totalMs !== undefined) parts.push('合計=' + mirelPerfMs(entry.totalMs) + 'ms');
    if (entry.cacheVisibleMs !== undefined && entry.cacheVisibleMs !== null) parts.push('キャッシュ表示=' + mirelPerfMs(entry.cacheVisibleMs) + 'ms');
    if (entry.apiMs !== undefined) parts.push('API=' + mirelPerfMs(entry.apiMs) + 'ms');
    if (entry.uiMs !== undefined) parts.push('画面更新=' + mirelPerfMs(entry.uiMs) + 'ms');
    if (entry.server && entry.server.totalMs !== undefined) parts.push('GAS内部=' + mirelPerfMs(entry.server.totalMs) + 'ms');
    var server = mirelPerformanceServerLines(entry.server);
    if (server) parts.push('内訳[' + server + ']');
    return title + '：' + parts.join(' / ');
  }
  return [
    'Mirel Map 速度診断',
    line('起動', startup),
    line('保存', save)
  ].join('\n');
}

async function mirelCopyPerformanceReport() {
  var text = mirelBuildPerformanceReport();
  try {
    await navigator.clipboard.writeText(text);
    if (typeof mirelShowToast === 'function') {
      mirelShowToast('速度診断結果をコピーしました。');
    }
  } catch (e) {
    if (typeof mirelShowToast === 'function') {
      mirelShowToast(text);
    }
  }
}


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
   Mirel Map アプリバージョン
   ========================================================= */
var MIREL_APP_VERSION = '2026.10.09-34';
var MIREL_APP_BUILD = '20261009-27';

function mirelNotifyAppUpdated_() {
  try {
    var key = 'mirelLastSeenAppVersion';
    var previous = localStorage.getItem(key) || '';
    localStorage.setItem(key, MIREL_APP_VERSION);
    if (previous && previous !== MIREL_APP_VERSION) {
      setTimeout(function() {
        if (typeof showToast === 'function') {
          showToast('Mirel Mapを最新版に更新しました（' + MIREL_APP_VERSION + '）');
        }
      }, 1200);
    }
  } catch (e) {}
}

/* ========================================
   起動
   ======================================== */

window.addEventListener(
  'load',
  function() {

    restoreCachedUiSettings();

    mirelNotifyAppUpdated_();

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

  if (!('serviceWorker' in navigator)) {
    return;
  }

  var swUrl = './sw.js?v=' + encodeURIComponent(MIREL_APP_BUILD);

  navigator.serviceWorker
    .register(swUrl)
    .then(function(registration) {

      /* 起動ごとに最新版のService Workerを確認 */
      registration.update().catch(function() {});

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', function() {
        var worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', function() {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    })
    .catch(function() {});

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    try {
      if (sessionStorage.getItem('mirelSwReloaded') === MIREL_APP_BUILD) return;
      sessionStorage.setItem('mirelSwReloaded', MIREL_APP_BUILD);
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  });
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
   * 起動時の無操作トークン再取得は行わない。
   * Android/Samsung Internet等ではバックグラウンドの
   * OAuthポップアップ扱いとなり、
   * 「ポップアップがブロックされました」が出るため。
   * 有効期限切れ時はログイン画面を表示し、
   * ユーザーのタップ操作から再認証する。
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

  var mirelApiStartedAt =
    mirelPerfNow();

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
    response.status === 401
  ) {

    clearAccessToken();
    showLoginScreen();

    throw new Error(
      'Googleログインの有効期限が切れました。Googleでログインを押してください。'
    );

  }

  var mirelFetchFinishedAt =
    mirelPerfNow();

  var data =
    await response.json();

  var mirelApiFinishedAt =
    mirelPerfNow();

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

  var mirelResult =
    data.response
      ? data.response.result
      : null;

  mirelLastApiTimings[functionName] = {
    totalMs:
      mirelApiFinishedAt -
      mirelApiStartedAt,
    fetchMs:
      mirelFetchFinishedAt -
      mirelApiStartedAt,
    parseMs:
      mirelApiFinishedAt -
      mirelFetchFinishedAt,
    server:
      mirelResult &&
      mirelResult.__perf
        ? mirelResult.__perf
        : null
  };

  return mirelResult;

}


/* ========================================
   初期読込
   ======================================== */

async function startApp() {

  var mirelStartupStartedAt =
    mirelPerfNow();

  var mirelCacheVisibleMs =
    null;

  var restoredFromCache =
    restoreCachedAppSnapshot();

  if (restoredFromCache) {

    /*
     * 前回表示できたデータを先に描画する。
     * Google通信はこの後バックグラウンドで行うため、
     * 起動時に白画面・読込画面で待たせない。
     */
    mirelApplyProfileDerivedValues();
    applySettingsToUi();
    mirelInstallExtraStyles();
    mirelInstallSettingsUi();
    mirelInstallSearchFilters();
    mirelApplyCurrentVisibility();
    showAppScreen();
    renderAll();
    renderJapanMap();
    setLoading(false);

    mirelCacheVisibleMs =
      mirelPerfNow() -
      mirelStartupStartedAt;

  } else {

    setLoading(true);

  }

  /* 住所マスターはアプリ本体の表示を待たせず並行読込 */
  loadAddressMaster();

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

    var extraData =
      (
        data &&
        data.extra
      ) ||
      {};

    mirelAffiliations =
      extraData.affiliations ||
      [];

    mirelTeacherAffiliations =
      extraData.teacherAffiliations ||
      {};

    mirelProfiles =
      extraData.profiles ||
      {};

    mirelFeatureSettings =
      extraData.featureSettings ||
      {};

    mirelApplyProfileDerivedValues();
    cacheUiSettings();
    cacheAppSnapshot();
    applySettingsToUi();
    mirelInstallExtraStyles();
    mirelInstallSettingsUi();
    mirelInstallSearchFilters();
    mirelApplyCurrentVisibility();
    showAppScreen();
    mirelMaybeShowInitialSetup();
    renderAll();
    renderJapanMap();

    var mirelStartupFinishedAt =
      mirelPerfNow();

    var mirelInitialApi =
      mirelLastApiTimings.getInitialData ||
      {};

    mirelSavePerformance(
      'startup',
      {
        totalMs:
          mirelStartupFinishedAt -
          mirelStartupStartedAt,
        cacheUsed:
          !!restoredFromCache,
        cacheVisibleMs:
          mirelCacheVisibleMs,
        apiMs:
          mirelInitialApi.totalMs ||
          0,
        server:
          data && data.__perf
            ? data.__perf
            : mirelInitialApi.server || null
      }
    );

  } catch (e) {

    if (restoredFromCache) {
      if (typeof appToast === 'function') {
        appToast(
          '前回データを表示しています。最新データの取得に失敗しました。'
        );
      }
    } else {
      handleError(e);
    }

  } finally {

    setLoading(false);

  }

}


function restoreCachedAppSnapshot() {

  try {

    var raw =
      localStorage.getItem(
        STORAGE_APP_SNAPSHOT
      );

    if (!raw) {
      return false;
    }

    var snapshot =
      JSON.parse(raw);

    if (
      !snapshot ||
      snapshot.version !==
        APP_SNAPSHOT_VERSION ||
      !Array.isArray(
        snapshot.teachers
      )
    ) {
      return false;
    }

    teachers =
      snapshot.teachers ||
      [];

    appSettings =
      Object.assign(
        {},
        appSettings,
        snapshot.settings ||
        {}
      );

    var extra =
      snapshot.extra ||
      {};

    mirelAffiliations =
      extra.affiliations ||
      [];

    mirelTeacherAffiliations =
      extra.teacherAffiliations ||
      {};

    mirelProfiles =
      extra.profiles ||
      {};

    mirelFeatureSettings =
      extra.featureSettings ||
      {};

    return true;

  } catch (e) {

    return false;

  }

}


function cacheAppSnapshot() {

  try {

    var snapshot = {
      version:
        APP_SNAPSHOT_VERSION,
      savedAt:
        Date.now(),
      teachers:
        teachers || [],
      settings:
        appSettings || {},
      extra: {
        affiliations:
          mirelAffiliations || [],
        teacherAffiliations:
          mirelTeacherAffiliations || {},
        profiles:
          mirelProfiles || {},
        featureSettings:
          mirelFeatureSettings || {}
      }
    };

    var raw =
      JSON.stringify(
        snapshot
      );

    /* localStorage上限に近づいた場合は無理に保存しない */
    if (raw.length > 4000000) {
      return;
    }

    localStorage.setItem(
      STORAGE_APP_SNAPSHOT,
      raw
    );

  } catch (e) {}

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
    teacher.phone,
    teacher.postalCode,
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

    mirelAffiliationTagsHtml(
      teacher.teacherId
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

  var navSearch =
    document.getElementById(
      'navSearch'
    );

  if (navSearch) {
    navSearch.classList.toggle(
      'active',
      name === 'search'
    );
  }

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


function phoneDetailRow(
  phone
) {

  if (!phone) {
    return '';
  }

  return (
    '<div class="detail-row">' +
    '<div class="label">電話番号</div>' +
    '<div class="value">' +
    '<a href="tel:' +
    escapeAttr(
      String(phone).replace(/[^0-9+]/g, '')
    ) +
    '" class="mirel-phone-link">' +
    escapeHtml(phone) +
    '</a>' +
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

    '\')">削除</button>' +

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
      '郵便番号',
      teacher.postalCode
        ? '〒' + teacher.postalCode
        : ''
    );

  html +=
    detailRow(
      '住所',
      teacher.fullAddress
    );

  html +=
    phoneDetailRow(
      teacher.phone
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
      '<div class="empty">子ども情報はまだありません。</div>';

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
      'phone',
      teacher.phone ||
      ''
    );

    setValue(
      'postalCode',
      teacher.postalCode ||
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
    'phone',
    'postalCode',
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

    phone:
      valueOf(
        'phone'
      ),

    postalCode:
      valueOf(
        'postalCode'
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

      ')">削除</button>' +

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

      ')">削除</button>' +

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
    '人物'
  ).trim() ||
    '人物';

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
    'Mirel Map'
  ).trim() ||
    'Mirel Map';

}


function mirelClampNumber(value, min, max, fallback) {
  var n = Number(value);
  if (!isFinite(n)) n = Number(fallback);
  return Math.min(max, Math.max(min, n));
}

function mirelTypographyPresetValues(kind, preset) {
  if (kind === 'font') {
    if (preset === 'small') return { fontScale: 82 };
    if (preset === 'large') return { fontScale: 125 };
    return { fontScale: 100 };
  }
  if (preset === 'compact') return { lineHeight: 1.25, itemGap: 4 };
  if (preset === 'spacious') return { lineHeight: 1.85, itemGap: 18 };
  return { lineHeight: 1.50, itemGap: 9 };
}

function mirelSyncTypographyNumber(rangeId, numberId) {
  var range = document.getElementById(rangeId);
  var number = document.getElementById(numberId);
  if (!range || !number) return;
  number.value = range.value;
}

function mirelSyncTypographyRange(numberId, rangeId, presetId) {
  var range = document.getElementById(rangeId);
  var number = document.getElementById(numberId);
  if (!range || !number) return;
  var min = Number(range.min || 0);
  var max = Number(range.max || 999);
  var val = mirelClampNumber(number.value, min, max, range.value);
  number.value = val;
  range.value = val;
  var preset = document.getElementById(presetId);
  if (preset) preset.value = 'custom';
  updateFontSizePreview();
}

function mirelTypographyNumberTyping(numberId, rangeId, presetId) {
  var range = document.getElementById(rangeId);
  var number = document.getElementById(numberId);
  if (!range || !number) return;
  var raw = String(number.value == null ? '' : number.value).trim();
  if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
  var val = Number(raw);
  if (!isFinite(val)) return;
  var min = Number(range.min || 0);
  var max = Number(range.max || 999);
  if (val >= min && val <= max) {
    range.value = val;
    var preset = document.getElementById(presetId);
    if (preset) preset.value = 'custom';
    updateFontSizePreview();
  }
}

function mirelTypographyCustomChanged(kind) {
  var preset = document.getElementById(kind === 'font' ? 'settingFontSize' : 'settingLineSpacing');
  if (preset) preset.value = 'custom';
  if (kind === 'font') {
    mirelSyncTypographyNumber('settingFontScale', 'settingFontScaleNumber');
  } else {
    mirelSyncTypographyNumber('settingLineHeight', 'settingLineHeightNumber');
    mirelSyncTypographyNumber('settingItemGap', 'settingItemGapNumber');
  }
  updateFontSizePreview();
}

function applyTypographyPreset(kind) {
  if (kind === 'font') {
    var fontPreset = valueOf('settingFontSize') || 'standard';
    if (fontPreset !== 'custom') {
      var fv = mirelTypographyPresetValues('font', fontPreset);
      setValue('settingFontScale', fv.fontScale);
      setValue('settingFontScaleNumber', fv.fontScale);
    }
  } else {
    var spacingPreset = valueOf('settingLineSpacing') || 'standard';
    if (spacingPreset !== 'custom') {
      var sv = mirelTypographyPresetValues('spacing', spacingPreset);
      setValue('settingLineHeight', sv.lineHeight);
      setValue('settingLineHeightNumber', sv.lineHeight);
      setValue('settingItemGap', sv.itemGap);
      setValue('settingItemGapNumber', sv.itemGap);
    }
  }
  updateFontSizePreview();
}

function updateFontSizePreview() {

  var fontPreview = document.getElementById('settingFontSizePreview');
  var spacingPreview = document.getElementById('settingSpacingPreview');

  var size = valueOf('settingFontSize') || 'standard';
  if (['small', 'standard', 'large', 'custom'].indexOf(size) === -1) size = 'standard';

  var spacing = valueOf('settingLineSpacing') || 'standard';
  if (['compact', 'standard', 'spacious', 'custom'].indexOf(spacing) === -1) spacing = 'standard';

  var fontScale = mirelClampNumber(valueOf('settingFontScale'), 80, 140, 100);
  var lineHeight = mirelClampNumber(valueOf('settingLineHeight'), 1.10, 2.00, 1.50);
  var itemGap = mirelClampNumber(valueOf('settingItemGap'), 2, 24, 9);

  if (fontPreview) {
    fontPreview.setAttribute('data-preview-font-size', size);
    fontPreview.style.setProperty('--preview-scale', String(fontScale / 100));
  }

  if (spacingPreview) {
    spacingPreview.setAttribute('data-preview-line-spacing', spacing);
    spacingPreview.style.setProperty('--preview-scale', String(fontScale / 100));
    spacingPreview.style.setProperty('--preview-line-height', String(lineHeight));
    spacingPreview.style.setProperty('--preview-gap', itemGap + 'px');
  }

  var spacingLabel = document.getElementById('settingLineSpacingPreviewLabel');
  if (spacingLabel) {
    spacingLabel.textContent =
      spacing === 'compact' ? '狭め' :
      spacing === 'spacious' ? '広め' :
      spacing === 'custom' ? '詳細設定' : '標準';
  }

  var label = document.getElementById('settingFontSizePreviewLabel');
  if (label) {
    label.textContent =
      size === 'small' ? '小さめ' :
      size === 'large' ? '大きめ' :
      size === 'custom' ? '詳細設定' : '標準';
  }

  var detail = document.getElementById('settingTypographyPreviewDetail');
  if (detail) detail.textContent = '行間 ' + lineHeight.toFixed(2) + ' / 余白 ' + itemGap + 'px';
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

  setValue(
    'settingFontSize',
    (
      appSettings.fontSize ||
      'standard'
    )
  );

  setValue(
    'settingLineSpacing',
    (
      appSettings.lineSpacing ||
      'standard'
    )
  );

  setValue('settingFontScale', appSettings.fontScale || 100);
  setValue('settingFontScaleNumber', appSettings.fontScale || 100);
  setValue('settingLineHeight', appSettings.lineHeight || 1.5);
  setValue('settingLineHeightNumber', appSettings.lineHeight || 1.5);
  setValue('settingItemGap', appSettings.itemGap || 9);
  setValue('settingItemGapNumber', appSettings.itemGap || 9);

  updateFontSizePreview();

}


async function saveSettingsForm() {

  var payload = {

    appName:
      valueOf(
        'settingAppName'
      ) ||
      'Mirel Map',

    personLabel:
      valueOf(
        'settingPersonLabel'
      ) ||
      '人物',

    placeLabel:
      valueOf(
        'settingPlaceLabel'
      ) ||
      '店名',

    placeKanaLabel:
      valueOf(
        'settingPlaceKanaLabel'
      ) ||
      '店名ふりがな',

    fontSize:
      valueOf(
        'settingFontSize'
      ) ||
      'standard',

    lineSpacing:
      valueOf(
        'settingLineSpacing'
      ) ||
      'standard',

    fontScale: mirelClampNumber(valueOf('settingFontScale'), 80, 140, 100),
    lineHeight: mirelClampNumber(valueOf('settingLineHeight'), 1.10, 2.00, 1.50),
    itemGap: mirelClampNumber(valueOf('settingItemGap'), 2, 24, 9)

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

    /* 再描画後に生成された一覧・詳細・フォーム要素にも設定を再適用 */
    requestAnimationFrame(function() {
      applySettingsToUi();
      requestAnimationFrame(applySettingsToUi);
    });

    appToast(
      '設定を保存しました。'
    );

  } catch (e) {

    handleError(e);

  } finally {

    setLoading(false);

  }

}


function applyFontSizeSetting() {

  if (!document.body) return;

  var size = String(appSettings.fontSize || 'standard');
  if (['small','standard','large','custom'].indexOf(size) === -1) size = 'standard';

  var fallback = mirelTypographyPresetValues('font', size === 'custom' ? 'standard' : size).fontScale;
  var scale = mirelClampNumber(appSettings.fontScale, 80, 140, fallback);
  var ratio = scale / 100;

  document.body.setAttribute('data-mirel-font-size', size);
  document.body.style.setProperty('--mirel-ui-scale', String(ratio));
  document.body.style.setProperty('--mirel-ui-title-size', (18 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-ui-body-size', (15 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-ui-small-size', (13 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-ui-micro-size', (11 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-detail-primary-size', (18 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-detail-body-size', (15 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-detail-small-size', (13 * ratio).toFixed(2) + 'px');
  document.body.style.setProperty('--mirel-card-pad-x', Math.max(9, Math.round(13 * ratio)) + 'px');
  document.body.style.setProperty('--mirel-inner-gap', Math.max(3, Math.round(5 * ratio)) + 'px');
}


function applyLineSpacingSetting() {

  if (!document.body) return;

  var spacing = String(appSettings.lineSpacing || 'standard');
  if (['compact','standard','spacious','custom'].indexOf(spacing) === -1) spacing = 'standard';

  var preset = mirelTypographyPresetValues('spacing', spacing === 'custom' ? 'standard' : spacing);
  var lineHeight = mirelClampNumber(appSettings.lineHeight, 1.10, 2.00, preset.lineHeight);
  var itemGap = mirelClampNumber(appSettings.itemGap, 2, 24, preset.itemGap);

  document.body.setAttribute('data-mirel-line-spacing', spacing);
  document.body.style.setProperty('--mirel-content-line-height', String(lineHeight));
  document.body.style.setProperty('--mirel-content-row-gap', itemGap + 'px');
  document.body.style.setProperty('--mirel-content-card-pad-y', Math.max(5, itemGap + 2) + 'px');
  document.body.style.setProperty('--mirel-ui-gap', itemGap + 'px');
  document.body.style.setProperty('--mirel-card-pad-y', Math.max(5, itemGap + 2) + 'px');
  document.body.style.setProperty('--mirel-detail-card-pad', Math.max(8, itemGap + 5) + 'px');
  document.body.style.setProperty('--mirel-list-card-gap', Math.max(4, Math.round(itemGap * 0.7)) + 'px');
  document.body.style.setProperty('--mirel-section-gap', Math.max(7, itemGap + 1) + 'px');
  document.body.style.setProperty('--mirel-accordion-pad-y', Math.max(7, itemGap + 2) + 'px');
}



function applySettingsToUi() {

  applyFontSizeSetting();
  applyLineSpacingSetting();

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

  var message =
    error &&
    error.message
      ? error.message
      : String(error);

  if (message === 'Failed to fetch') {
    message =
      '通信に失敗しました。通信状態を確認して、もう一度お試しください。';
  }

  if (typeof appToast === 'function') {
    appToast(message);
  }

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
  phone: true,
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


  mirelApplyProfileDerivedValues();

}


/* =========================================================
   startApp
   初期データは1回のAPI通信でまとめて取得
   ========================================================= */

var mirelBaseStartApp =
  startApp;


startApp =
  async function() {

    await mirelBaseStartApp();

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

    .mirel-aff-create-box {
      margin-top: 12px;
      padding: 14px;
      border: 1px solid #eee2df;
      border-radius: 16px;
      background: #fffafa;
    }

    .mirel-aff-create-title {
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 700;
    }

    .mirel-aff-create-note {
      margin-bottom: 10px;
    }

    .mirel-aff-name-input,
    .mirel-aff-edit-name {
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
      font-size: 16px;
    }

    .mirel-aff-color-line {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 10px;
    }

    .mirel-aff-color-label,
    .mirel-aff-edit-label {
      font-size: 13px;
      font-weight: 700;
      color: #665d5a;
    }

    .mirel-aff-edit-label {
      display: block;
      margin-bottom: 6px;
    }

    .mirel-aff-create-actions,
    .mirel-aff-edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }

    .mirel-aff-master-list {
      margin-top: 18px;
    }

    .mirel-aff-existing-title {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    .mirel-aff-master-row {
      margin-top: 9px;
      padding: 12px;
      border: 1px solid #eee2df;
      border-radius: 14px;
      background: #fff;
    }

    .mirel-aff-view-row {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      column-gap: 10px;
      row-gap: 8px;
      align-items: center;
    }

    .mirel-aff-view-actions {
      grid-column: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      justify-content: flex-end;
    }

    .mirel-aff-order-actions {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .mirel-aff-order-button {
      width: 28px;
      height: 32px;
      min-width: 28px;
      padding: 0 !important;
      border-radius: 9px;
      font-size: 13px;
      line-height: 1;
    }

    .mirel-aff-mini-action {
      min-width: 0 !important;
      padding: 7px 10px !important;
      border-radius: 10px !important;
      font-size: 13px !important;
      line-height: 1.1 !important;
      white-space: nowrap;
    }

    .mirel-aff-order-button:disabled {
      opacity: .32;
    }

    .mirel-aff-order-note {
      margin: 4px 0 10px;
    }

    .mirel-aff-view-swatch {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      border: 1px solid #ded2cf;
    }

    .mirel-aff-view-name {
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.45;
    }

    .mirel-aff-edit-panel {
      padding-top: 4px;
    }

    .mirel-aff-master-row input[type="color"] {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .mirel-aff-color-preview {
      display: inline-block;
      width: 34px;
      height: 34px;
      min-width: 34px;
      padding: 0;
      border: 1px solid #b9aeab;
      border-radius: 50%;
      box-shadow: none;
      background: #f7d8df;
    }

    .mirel-aff-palette {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      grid-column: 1 / -1;
      margin: 2px 0 4px;
    }

    .mirel-aff-preset {
      position: relative;
      z-index: 2;
      width: 32px;
      height: 32px;
      min-width: 32px;
      padding: 0;
      border: 1px solid #dfd4d1;
      border-radius: 50%;
      box-shadow: none;
      touch-action: manipulation;
      cursor: pointer;
    }

    .mirel-aff-preset:active {
      transform: scale(0.94);
    }

    .mirel-aff-custom-color {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 5px 11px;
      border: 1px solid #dfd4d1;
      border-radius: 999px;
      background: #fff;
      color: #665d5a;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      overflow: hidden;
    }

    .mirel-aff-custom-color input[type="color"] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .mirel-feature-save-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
      padding-bottom: 4px;
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

    .mirel-phone-link {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .mirel-toast {
      position: fixed;
      left: 50%;
      bottom: calc(86px + env(safe-area-inset-bottom));
      transform: translateX(-50%) translateY(12px);
      z-index: 100000;
      max-width: min(88vw, 420px);
      padding: 12px 16px;
      border-radius: 14px;
      background: rgba(35,35,35,.92);
      color: #fff;
      font-size: 14px;
      line-height: 1.5;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease, transform .18s ease;
      box-shadow: 0 8px 30px rgba(0,0,0,.18);
    }

    .mirel-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
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



var MIREL_AFFILIATION_PASTEL_COLORS = [
  '#f7d8df',
  '#f6d9f2',
  '#f7e4c9',
  '#f3efc8',
  '#dcebd7',
  '#d7e9ea',
  '#dbe3f4',
  '#e4dcf3',
  '#e8e1da'
];


function mirelAffiliationDisplayColor(
  color
) {

  var value =
    String(
      color ||
      '#f7d8df'
    ).trim();


  if (
    !/^#[0-9a-fA-F]{6}$/.test(
      value
    )
  ) {
    return '#f7d8df';
  }


  var r =
    parseInt(
      value.slice(1, 3),
      16
    );

  var g =
    parseInt(
      value.slice(3, 5),
      16
    );

  var b =
    parseInt(
      value.slice(5, 7),
      16
    );


  var max =
    Math.max(
      r,
      g,
      b
    );

  var min =
    Math.min(
      r,
      g,
      b
    );

  var lightness =
    (
      max +
      min
    ) /
    510;


  /*
   * 旧仕様では保存色を20%の透明度で表示していたため、
   * #ff00ff など設定画面では濃い色でも、実際のラベルは薄色だった。
   * 旧データの濃色だけ、見えていたラベル色相当へ変換する。
   * すでに淡色ならそのまま使う。
   */
  if (
    lightness >= 0.78
  ) {
    return value.toLowerCase();
  }


  function pastelChannel(
    channel
  ) {

    return Math.round(
      255 * 0.8 +
      channel * 0.2
    );

  }


  return (
    '#' +
    [
      pastelChannel(r),
      pastelChannel(g),
      pastelChannel(b)
    ]
      .map(
        function(channel) {

          return channel
            .toString(16)
            .padStart(
              2,
              '0'
            );

        }
      )
      .join('')
  );

}


function mirelSetAffiliationColor(
  inputId,
  color
) {

  var input =
    document.getElementById(
      inputId
    );


  if (!input) {
    return;
  }


  var displayColor =
    mirelAffiliationDisplayColor(
      color
    );

  input.value =
    displayColor;


  var preview =
    document.getElementById(
      inputId + '_preview'
    );


  if (preview) {
    preview.style.background =
      displayColor;
  }

}


function mirelAffiliationPaletteHtml(
  inputId
) {

  return (
    '<div class="mirel-aff-palette" aria-label="淡い色の候補">' +
    MIREL_AFFILIATION_PASTEL_COLORS
      .map(
        function(color) {

          return (
            '<button type="button" ' +
            'class="mirel-aff-preset" ' +
            'style="background:' +
            escapeAttr(
              color
            ) +
            ';" ' +
            'aria-label="' +
            escapeAttr(
              color
            ) +
            '" ' +
            'onclick="mirelSetAffiliationColor(\'' +
            escapeJs(
              inputId
            ) +
            '\',\'' +
            escapeJs(
              color
            ) +
            '\')"></button>'
          );

        }
      )
      .join('') +
      '<label class="mirel-aff-custom-color">' +
        'カスタム色' +
        '<input type="color" value="#f7d8df" aria-label="カスタム色を選択" ' +
        'oninput="mirelSetAffiliationColor(\'' +
        escapeJs(
          inputId
        ) +
        '\',this.value)" ' +
        'onchange="mirelSetAffiliationColor(\'' +
        escapeJs(
          inputId
        ) +
        '\',this.value)">' +
      '</label>' +
    '</div>'
  );

}


function mirelAffiliationTagsHtml(
  teacherId
) {

  var ids =
    mirelAffiliationIds(
      teacherId
    );

  if (!ids.length) {
    return '';
  }

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
        '<span class="mirel-aff-tag" style="background:' +
        escapeAttr(
          mirelAffiliationDisplayColor(
            row.color
          )
        ) +
        ';">' +
        escapeHtml(
          row.name
        ) +
        '</span>';

    }
  );

  return tags
    ? '<div class="mirel-aff-tags">' +
      tags +
      '</div>'
    : '';

}


function mirelGradeAgeDisplay(
  grade
) {

  var ranges = {
    '年少': [3, 4],
    '年中': [4, 5],
    '年長': [5, 6],
    '小1': [6, 7],
    '小2': [7, 8],
    '小3': [8, 9],
    '小4': [9, 10],
    '小5': [10, 11],
    '小6': [11, 12],
    '中1': [12, 13],
    '中2': [13, 14],
    '中3': [14, 15],
    '高1': [15, 16],
    '高2': [16, 17],
    '高3': [17, 18],
    '短大1': [18, 19],
    '短大2': [19, 20],
    '大学1': [18, 19],
    '大学2': [19, 20],
    '大学3': [20, 21],
    '大学4': [21, 22],
    '大学6年制1': [18, 19],
    '大学6年制2': [19, 20],
    '大学6年制3': [20, 21],
    '大学6年制4': [21, 22],
    '大学6年制5': [22, 23],
    '大学6年制6': [23, 24],
    '専門1': [18, 19],
    '専門2': [19, 20],
    '専門3': [20, 21],
    '専門4': [21, 22],
    '修士1': [22, 23],
    '修士2': [23, 24],
    '博士1': [24, 25],
    '博士2': [25, 26],
    '博士3': [26, 27]
  };

  var range =
    ranges[grade];

  if (!range) {
    return '';
  }

  return (
    range[0] === range[1]
      ? String(range[0]) + '歳'
      : String(range[0]) + '〜' + String(range[1]) + '歳'
  );

}


function mirelApplyProfileDerivedValues() {

  teachers.forEach(
    function(teacher) {

      var profile =
        mirelProfiles[
          teacher.teacherId
        ] ||
        {};

      var gradeDisplay =
        mirelGradeDisplay(
          profile.grade,
          profile.gradeBaseYear
        );

      teacher.gradeDisplay =
        gradeDisplay;

      if (
        !teacher.ageDisplay &&
        gradeDisplay &&
        gradeDisplay !== '卒業・修了'
      ) {

        teacher.ageDisplay =
          mirelGradeAgeDisplay(
            gradeDisplay
          );

      }

    }
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
      'field mirel-field-compact';

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
          mirelAffiliationDisplayColor(
            row.color
          )
        ) +
        ';' +
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


      mirelApplyProfileDerivedValues();


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
              mirelAffiliationDisplayColor(
                row.color
              )
            ) +
            ';">' +

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


  if (
    searchId === 'listSearch'
  ) {

    var row =
      document.getElementById(
        'mirelListFilterRow'
      );

    if (row) {
      row.appendChild(
        select
      );
      return;
    }

  }

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


  if (!card) {

    return;

  }


  var existingArea =
    document.getElementById(
      'mirelExtraSettings'
    );


  if (existingArea) {

    /* index.html に既存の設定領域がある場合でも、
       速度診断が未配置なら「設定を保存」の直後へ必ず追加する。 */
    if (!document.getElementById('mirelPerformancePanel')) {
      var featureActions = existingArea.querySelector('.mirel-feature-save-actions');
      var perfSection = document.createElement('div');
      perfSection.className = 'mirel-extra-section mirel-perf-section';
      perfSection.innerHTML =
        '<div class="section-title">速度診断</div>' +
        '<div class="form-note">直近の起動・保存を自動計測します。「計測結果をコピー」でそのまま送れます。</div>' +
        '<div id="mirelPerformancePanel"></div>';

      if (featureActions && featureActions.parentNode) {
        featureActions.parentNode.insertBefore(perfSection, featureActions.nextSibling);
      } else {
        existingArea.insertBefore(perfSection, existingArea.firstChild);
      }
    }

    mirelRenderFeatureSettings();

    mirelRenderAffiliationMaster();

    mirelRenderPerformancePanel();

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

    '<div class="mirel-feature-save-actions">' +
      '<button class="primary" type="button" onclick="saveSettingsForm()">設定を保存</button>' +
    '</div>' +

    '<div class="mirel-extra-section mirel-perf-section">' +
      '<div class="section-title">速度診断</div>' +
      '<div class="form-note">直近の起動・保存を自動計測します。「計測結果をコピー」でそのまま送れます。</div>' +
      '<div id="mirelPerformancePanel"></div>' +
    '</div>' +

    '<div class="mirel-extra-section">' +

      '<div class="section-title">所属ラベル</div>' +

      '<div class="form-note">' +
      '所属ラベルは「追加」または「保存」を押した時点で反映されます。上の「設定を保存」は不要です。色はパステル候補またはカスタム色から選べます。' +
      '</div>' +

      '<div id="mirelAffiliationMaster"></div>' +

    '</div>';


  if (actions) {

    actions.style.display =
      'none';

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

  mirelRenderPerformancePanel();

}


/* =========================================================
   使用項目
   ========================================================= */

function mirelFeatureDefinitions() {

  return [

    ['gender', '性別'],
    ['phone', '電話番号'],
    ['birthday', '誕生日'],
    ['age', '年齢'],
    ['grade', '学年'],
    ['affiliation', '所属'],
    ['place', '店名'],
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

  var html =
    '<div class="mirel-aff-create-box">' +

      '<div class="mirel-aff-create-title">新しい所属ラベルを作成</div>' +

      '<div class="small-note mirel-aff-create-note">' +
        '①ラベル名を入力 → ②色を選択 → ③「追加」でその場で保存' +
      '</div>' +

      '<input id="mirelNewAffName" class="mirel-aff-name-input" type="text" placeholder="新しい所属ラベル名">' +

      '<input id="mirelNewAffColor" type="hidden" value="#f7d8df">' +

      '<div class="mirel-aff-color-line">' +
        '<span class="mirel-aff-color-label">色</span>' +
        '<span class="mirel-aff-color-preview" id="mirelNewAffColor_preview" style="background:#f7d8df" aria-hidden="true"></span>' +
      '</div>' +

      mirelAffiliationPaletteHtml(
        'mirelNewAffColor'
      ) +

      '<div class="mirel-aff-create-actions">' +
        '<button class="primary" type="button" onclick="mirelAddAffiliation()">追加</button>' +
      '</div>' +

    '</div>' +

    '<div class="mirel-aff-master-list">' +
      '<div class="mirel-aff-existing-title">登録済みの所属ラベル</div>' +
      '<div class="small-note mirel-aff-order-note">上にあるラベルほど、人物フォームでは左から先に表示されます。</div>';

  if (!mirelAffiliations.length) {

    html +=
      '<div class="empty">所属はまだありません。</div>';

  } else {

    mirelAffiliations.forEach(
      function(row, index) {

        var color =
          mirelAffiliationDisplayColor(
            row.color
          );

        html +=

          '<div class="mirel-aff-master-row" id="mirelAffRow_' +
          escapeAttr(
            row.affiliationId
          ) +
          '">' +

            '<div class="mirel-aff-view-row" id="mirelAffView_' +
            escapeAttr(
              row.affiliationId
            ) +
            '">' +

              '<span class="mirel-aff-view-swatch" style="background:' +
              escapeAttr(
                color
              ) +
              ';"></span>' +

              '<div class="mirel-aff-view-name">' +
              escapeHtml(
                row.name
              ) +
              '</div>' +

              '<div class="mirel-aff-view-actions">' +
                '<div class="mirel-aff-order-actions" aria-label="表示順">' +
                  '<button type="button" class="secondary mirel-aff-order-button" title="前へ" ' +
                  (index === 0 ? 'disabled ' : '') +
                  'onclick="mirelMoveAffiliation(\'' +
                  escapeJs(
                    row.affiliationId
                  ) +
                  '\', -1)">↑</button>' +
                  '<button type="button" class="secondary mirel-aff-order-button" title="後へ" ' +
                  (index === mirelAffiliations.length - 1 ? 'disabled ' : '') +
                  'onclick="mirelMoveAffiliation(\'' +
                  escapeJs(
                    row.affiliationId
                  ) +
                  '\', 1)">↓</button>' +
                '</div>' +

                '<button type="button" class="secondary mirel-aff-mini-action" onclick="mirelStartAffiliationEdit(\'' +
                escapeJs(
                  row.affiliationId
                ) +
                '\')">編集</button>' +

                '<button type="button" class="secondary mirel-aff-mini-action" onclick="mirelDeleteAffiliation(\'' +
                escapeJs(
                  row.affiliationId
                ) +
                '\')">削除</button>' +
              '</div>' +

            '</div>' +

            '<div class="mirel-aff-edit-panel" id="mirelAffEdit_' +
            escapeAttr(
              row.affiliationId
            ) +
            '" style="display:none">' +

              '<input type="hidden" id="mirelAffColor_' +
              escapeAttr(
                row.affiliationId
              ) +
              '" value="' +
              escapeAttr(
                color
              ) +
              '">' +

              '<label class="mirel-aff-edit-label" for="mirelAffName_' +
              escapeAttr(
                row.affiliationId
              ) +
              '">ラベル名</label>' +

              '<input class="mirel-aff-edit-name" type="text" id="mirelAffName_' +
              escapeAttr(
                row.affiliationId
              ) +
              '" value="' +
              escapeAttr(
                row.name
              ) +
              '">' +

              '<div class="mirel-aff-color-line">' +
                '<span class="mirel-aff-color-label">色</span>' +
                '<span class="mirel-aff-color-preview" id="mirelAffColor_' +
                escapeAttr(
                  row.affiliationId
                ) +
                '_preview" style="background:' +
                escapeAttr(
                  color
                ) +
                ';" aria-hidden="true"></span>' +
              '</div>' +

              mirelAffiliationPaletteHtml(
                'mirelAffColor_' +
                row.affiliationId
              ) +

              '<div class="mirel-aff-edit-actions">' +
                '<button type="button" class="secondary" onclick="mirelCancelAffiliationEdit(\'' +
                escapeJs(
                  row.affiliationId
                ) +
                '\')">キャンセル</button>' +

                '<button type="button" class="primary" onclick="mirelUpdateAffiliation(\'' +
                escapeJs(
                  row.affiliationId
                ) +
                '\')">保存</button>' +
              '</div>' +

            '</div>' +

          '</div>';

      }
    );

  }

  html += '</div>';

  box.innerHTML =
    html;

}


async function mirelMoveAffiliation(
  id,
  direction
) {

  var currentIndex =
    mirelAffiliations.findIndex(
      function(row) {
        return String(
          row.affiliationId
        ) === String(
          id
        );
      }
    );


  if (
    currentIndex === -1
  ) {
    return;
  }


  var nextIndex =
    currentIndex +
    Number(
      direction ||
      0
    );


  if (
    nextIndex < 0 ||
    nextIndex >= mirelAffiliations.length
  ) {
    return;
  }


  var reordered =
    mirelAffiliations.slice();


  var moved =
    reordered.splice(
      currentIndex,
      1
    )[0];


  reordered.splice(
    nextIndex,
    0,
    moved
  );


  var previous =
    mirelAffiliations;


  mirelAffiliations =
    reordered;


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


  try {

    var result =
      await runScript(
        'saveMirelAffiliationOrder',
        [
          reordered.map(
            function(row) {
              return row.affiliationId;
            }
          )
        ]
      );


    mirelAffiliations =
      result.affiliations ||
      reordered;


    mirelTeacherAffiliations =
      result.teacherAffiliations ||
      mirelTeacherAffiliations;


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

    mirelAffiliations =
      previous;

    mirelRenderAffiliationMaster();
    mirelRefreshAffiliationFilters();

    handleError(
      e
    );

  }

}


function mirelStartAffiliationEdit(
  id
) {

  document
    .querySelectorAll(
      '.mirel-aff-edit-panel'
    )
    .forEach(
      function(panel) {
        panel.style.display =
          'none';
      }
    );


  document
    .querySelectorAll(
      '.mirel-aff-view-row'
    )
    .forEach(
      function(row) {
        row.style.display =
          'grid';
      }
    );


  var view =
    document.getElementById(
      'mirelAffView_' +
      id
    );

  var edit =
    document.getElementById(
      'mirelAffEdit_' +
      id
    );


  if (view) {
    view.style.display =
      'none';
  }


  if (edit) {
    edit.style.display =
      'block';
  }

}


function mirelCancelAffiliationEdit(
  id
) {

  mirelRenderAffiliationMaster();

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
      : '#f7d8df';


  if (!name) {

    appToast(
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

  mirelSetAffiliationColor(
    'mirelNewAffColor',
    '#f7d8df'
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


  if (!name) {

    appToast(
      '所属名を入力してください。'
    );

    return;

  }


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
        : '#f7d8df'

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
    !(await appConfirm(
      '所属を削除しますか？',
      'この所属を削除すると、人物との紐付けも解除されます。'
    ))
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


  mirelToggleField(
    'phone',
    mirelFeatureOn(
      'phone'
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


  var addressVisible =
    mirelFeatureOn(
      'address'
    );


  /* 郵便番号＋「住所を入力」ボタンをまとめて非表示 */
  var postal =
    document.getElementById(
      'postalCode'
    );

  var postalRow =
    postal
      ? postal.closest(
          '.mirel-postal-row'
        )
      : null;

  if (postalRow) {
    postalRow.classList.toggle(
      'mirel-hidden',
      !addressVisible
    );
  }


  /* 都道府県＋市区町村の行もまとめて非表示 */
  var prefecture =
    document.getElementById(
      'prefecture'
    );

  var addressGrid =
    prefecture
      ? prefecture.closest(
          '.grid2'
        )
      : null;

  if (addressGrid) {
    addressGrid.classList.toggle(
      'mirel-hidden',
      !addressVisible
    );
  }


  [
    'address1',
    'address2'
  ]
    .forEach(
      function(id) {

        mirelToggleField(
          id,
          addressVisible
        );

      }
    );


  /* SNS・交流履歴・子ども情報は中身ではなく見出しごと消す */
  [
    ['linkEditSection', 'sns'],
    ['interactionEditSection', 'interactions'],
    ['childrenEditSection', 'children']
  ]
    .forEach(
      function(row) {

        var section =
          document.getElementById(
            row[0]
          );

        if (!section) {
          return;
        }

        section.classList.toggle(
          'mirel-hidden',
          !mirelFeatureOn(
            row[1]
          )
        );

      }
    );

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
          '電話番号'
        ) {

          visible =
            mirelFeatureOn(
              'phone'
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
          '郵便番号'
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


  detail
    .querySelectorAll(
      '.actions button'
    )
    .forEach(
      function(button) {

        if (
          button.textContent.indexOf(
            'Google Maps'
          ) === -1
        ) {
          return;
        }

        var actions =
          button.closest(
            '.actions'
          );

        if (actions) {
          actions.classList.toggle(
            'mirel-hidden',
            !mirelFeatureOn(
              'address'
            )
          );
        }

      }
    );

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


function appToast(
  message
) {

  var toast =
    document.getElementById(
      'mirelToast'
    );

  if (!toast) {

    toast =
      document.createElement(
        'div'
      );

    toast.id =
      'mirelToast';

    toast.className =
      'mirel-toast';

    document.body.appendChild(
      toast
    );

  }

  toast.textContent =
    String(
      message ||
      ''
    );

  toast.classList.add(
    'show'
  );

  clearTimeout(
    appToast._timer
  );

  appToast._timer =
    setTimeout(
      function() {

        toast.classList.remove(
          'show'
        );

      },
      2200
    );

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

/* 速度診断 表示 */
(function mirelInstallPerfStyles(){
  if (document.getElementById('mirelPerfStyles')) return;
  var style = document.createElement('style');
  style.id = 'mirelPerfStyles';
  style.textContent =
    '.mirel-perf-section{margin-top:18px;}' +
    '#mirelPerformancePanel{display:grid;gap:8px;}' +
    '.mirel-perf-row{display:grid;gap:3px;padding:10px 12px;border:1px solid #ece7e3;border-radius:10px;background:#faf9f8;font-size:13px;}' +
    '.mirel-perf-row strong{font-size:13px;}' +
    '.mirel-perf-row span{line-height:1.5;}' +
    '.mirel-perf-row small{font-size:11px;line-height:1.5;color:#756e69;}' +
    '.mirel-perf-copy{justify-self:start;margin-top:2px;}';
  document.head.appendChild(style);
})();


/* =========================================================
   2026-10-09-26
   ワークスペース切替 / 別Googleアカウント切替
   ========================================================= */

var mirelWorkspaceState = null;
var mirelWorkspaceLoading = false;

function mirelClearUserLocalCache() {
  try { localStorage.removeItem(STORAGE_APP_SNAPSHOT); } catch (e) {}
  try { localStorage.removeItem('academyUiSettings'); } catch (e) {}
}

function mirelLogoutAndSwitchAccount() {
  clearAccessToken();
  try { localStorage.removeItem(STORAGE_AUTHORIZED); } catch (e) {}
  mirelClearUserLocalCache();

  teachers = [];
  mirelAffiliations = [];
  mirelTeacherAffiliations = {};
  mirelProfiles = {};
  mirelFeatureSettings = {};

  showLoginScreen();

  var message = document.getElementById('authMessage');
  if (message) {
    message.textContent = '別のGoogleアカウントで使う場合は「Googleでログイン」を押してください。';
  }
}

function mirelEnsureWorkspacePanel() {
  var page = document.getElementById('pageSettings');
  if (!page) return;
  var card = page.querySelector('.card');
  if (!card) return;

  var panel = document.getElementById('mirelWorkspaceSection');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'mirelWorkspaceSection';
    panel.className = 'mirel-extra-section mirel-workspace-section';
    panel.innerHTML =
      '<div class="section-title">データの使い分け</div>' +
      '<div class="form-note">用途ごとに人物・所属ラベル・設定を完全に分けられます。</div>' +
      '<div id="mirelWorkspacePanel"><div class="small-note">読み込み中…</div></div>';

    var extra = document.getElementById('mirelExtraSettings');
    if (extra && extra.parentNode === card) {
      card.insertBefore(panel, extra);
    } else {
      card.appendChild(panel);
    }
  }

  mirelLoadWorkspacePanel();
}

async function mirelLoadWorkspacePanel(force) {
  var host = document.getElementById('mirelWorkspacePanel');
  if (!host || mirelWorkspaceLoading) return;
  if (mirelWorkspaceState && !force) {
    mirelRenderWorkspacePanel();
    return;
  }

  mirelWorkspaceLoading = true;
  try {
    mirelWorkspaceState = await runScript('getMyWorkspaces', []);
    mirelRenderWorkspacePanel();
  } catch (e) {
    host.innerHTML = '<div class="small-note">ワークスペース情報を取得できませんでした。</div>';
  } finally {
    mirelWorkspaceLoading = false;
  }
}

function mirelRenderWorkspacePanel() {
  var host = document.getElementById('mirelWorkspacePanel');
  if (!host) return;

  var state = mirelWorkspaceState || {};
  var list = Array.isArray(state.workspaces) ? state.workspaces : [];
  var activeId = String(state.activeWorkspaceId || '');

  var options = list.map(function(ws) {
    var selected = String(ws.id) === activeId ? ' selected' : '';
    return '<option value="' + escapeHtml(String(ws.id || '')) + '"' + selected + '>' +
      escapeHtml(String(ws.name || 'メイン')) + '</option>';
  }).join('');

  host.innerHTML =
    '<div class="field">' +
      '<label>現在のワークスペース</label>' +
      '<div class="mirel-workspace-switch-row">' +
        '<select id="mirelWorkspaceSelect">' + options + '</select>' +
        '<button type="button" class="secondary" onclick="mirelSwitchWorkspaceFromUi()">切り替え</button>' +
      '</div>' +
      '<div class="small-note">切り替えると、このワークスペース専用の人物・設定・所属ラベルが表示されます。</div>' +
    '</div>' +
    '<div class="mirel-workspace-create-box">' +
      '<div class="mirel-workspace-create-title">新しいワークスペースを作成</div>' +
      '<div class="mirel-workspace-create-row">' +
        '<input id="mirelNewWorkspaceName" placeholder="例：サロン用 / プライベート用">' +
        '<button type="button" class="primary" onclick="mirelCreateWorkspaceFromUi()">作成して切り替え</button>' +
      '</div>' +
      '<div class="small-note">作成すると別のデータファイルになり、現在のデータとは混ざりません。</div>' +
    '</div>' +
    '<div class="mirel-account-actions">' +
      '<button type="button" class="secondary" onclick="mirelLogoutAndSwitchAccount()">ログアウト／別のGoogleアカウントでログイン</button>' +
    '</div>';
}

async function mirelSwitchWorkspaceFromUi() {
  var select = document.getElementById('mirelWorkspaceSelect');
  if (!select || !select.value) return;
  if (mirelWorkspaceState && String(mirelWorkspaceState.activeWorkspaceId || '') === String(select.value)) {
    appToast('すでにこのワークスペースを使用しています。');
    return;
  }

  setLoading(true);
  try {
    await runScript('switchMyWorkspace', [select.value]);
    mirelClearUserLocalCache();
    location.reload();
  } catch (e) {
    handleError(e);
    setLoading(false);
  }
}

async function mirelCreateWorkspaceFromUi() {
  var input = document.getElementById('mirelNewWorkspaceName');
  var name = input ? String(input.value || '').trim() : '';
  if (!name) {
    appToast('ワークスペース名を入力してください。');
    if (input) input.focus();
    return;
  }

  setLoading(true);
  try {
    await runScript('createMyWorkspace', [name]);
    mirelClearUserLocalCache();
    location.reload();
  } catch (e) {
    handleError(e);
    setLoading(false);
  }
}

var mirelBaseInstallSettingsUiForWorkspace = mirelInstallSettingsUi;
mirelInstallSettingsUi = function() {
  mirelBaseInstallSettingsUiForWorkspace();
  mirelEnsureWorkspacePanel();
};

/* 設定ページを開いた時にも最新のワークスペース一覧を確認する */
var mirelBaseShowPageForWorkspace = showPage;
showPage = function(pageName) {
  var result = mirelBaseShowPageForWorkspace.apply(this, arguments);
  if (pageName === 'settings') {
    mirelEnsureWorkspacePanel();
  }
  return result;
};



/* 2026-10-09-34: 動的再描画後も文字・余白設定を保持 */
(function(){
  if (typeof renderAll === 'function' && !renderAll.__mirelTypographyWrapped) {
    var baseRenderAll = renderAll;
    var wrapped = function(){
      var result = baseRenderAll.apply(this, arguments);
      requestAnimationFrame(function(){ if (typeof applySettingsToUi === 'function') applySettingsToUi(); });
      return result;
    };
    wrapped.__mirelTypographyWrapped = true;
    renderAll = wrapped;
  }
})();

