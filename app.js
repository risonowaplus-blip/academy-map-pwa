var teachers = [];
var addressMaster = {};
var selectedPrefecture = '';
var selectedTeacherId = '';
var prefMode = 'active';
var tokenClient = null;
var accessToken = '';
var accessTokenExpiresAt = 0;
var mapInstance = null;

var prefectures = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県',
  '三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
];

var gradeOptions = [
  '','年少','年中','年長',
  '小1','小2','小3','小4','小5','小6',
  '中1','中2','中3',
  '高1','高2','高3','卒業'
];

window.addEventListener(
  'load',
  function() {

    if (
      'serviceWorker' in navigator
    ) {

      navigator.serviceWorker
        .register('./sw.js')
        .catch(
          function() {}
        );

    }

    if (
      !configReady()
    ) {

      document.getElementById(
        'authMessage'
      ).textContent =
        'config.js の設定が完了していません。';

      document.getElementById(
        'loginButton'
      ).disabled = true;

      return;

    }

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

                showLoginScreen();
                return;

              }

              accessToken =
                resp.access_token;

              var expiresIn =
                Number(
                  resp.expires_in || 3600
                );

              accessTokenExpiresAt =
                Date.now() +
                (
                  expiresIn * 1000
                ) -
                60000;

              try {

                sessionStorage.setItem(
                  'academyAccessToken',
                  accessToken
                );

                sessionStorage.setItem(
                  'academyAccessTokenExpiresAt',
                  String(
                    accessTokenExpiresAt
                  )
                );

              } catch (e) {}

              startApp();

            }

        });


    restoreLoginSession();

  }
);

function restoreLoginSession() {

  var savedToken = '';

  var savedExpiresAt = 0;

  try {

    savedToken =
      sessionStorage.getItem(
        'academyAccessToken'
      ) || '';

    savedExpiresAt =
      Number(
        sessionStorage.getItem(
          'academyAccessTokenExpiresAt'
        ) || 0
      );

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

    startApp();

    return;

  }


  /*
    以前にログイン済みなら、
    アカウント選択画面を出さずに
    トークン取得を試す
  */

  tokenClient.requestAccessToken({
    prompt: ''
  });

}


function showLoginScreen() {

  document
    .getElementById(
      'appShell'
    )
    .classList
    .add(
      'hidden'
    );

  document
    .getElementById(
      'authScreen'
    )
    .classList
    .remove(
      'hidden'
    );

}


function clearLoginSession() {

  accessToken = '';

  accessTokenExpiresAt = 0;

  try {

    sessionStorage.removeItem(
      'academyAccessToken'
    );

    sessionStorage.removeItem(
      'academyAccessTokenExpiresAt'
    );

  } catch (e) {}

}

function configReady() {
  return CONFIG.GOOGLE_CLIENT_ID &&
    CONFIG.SCRIPT_DEPLOYMENT_ID &&
    CONFIG.GOOGLE_CLIENT_ID.indexOf('ここに') === -1 &&
    CONFIG.SCRIPT_DEPLOYMENT_ID.indexOf('ここに') === -1;
}

function login() {

  if (
    !tokenClient
  ) {
    return;
  }

  tokenClient
    .requestAccessToken({
      prompt:
        'select_account'
    });

}

async function runScript(functionName, parameters) {
  if (!accessToken) throw new Error('Googleログインが必要です。');

  var response = await fetch(
    'https://script.googleapis.com/v1/scripts/' +
      encodeURIComponent(CONFIG.SCRIPT_DEPLOYMENT_ID) +
      ':run',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        function: functionName,
        parameters: parameters || []
      })
    }
  );

  var data = await response.json();

  if (
  response.status === 401
) {

  clearLoginSession();

  showLoginScreen();

  throw new Error(
    'Googleログインの有効期限が切れました。もう一度ログインしてください。'
  );

}

  if (!response.ok || data.error) {
    var msg = 'Apps Scriptの実行に失敗しました。';
    if (data.error && data.error.message) msg = data.error.message;
    if (data.error && data.error.details && data.error.details[0] &&
        data.error.details[0].errorMessage) {
      msg = data.error.details[0].errorMessage;
    }
    throw new Error(msg);
  }

  return data.response ? data.response.result : null;
}

async function startApp() {
  setLoading(true);
  try {
    var data = await runScript('getInitialData');
    teachers = (data && data.teachers) || [];

    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');

    renderAll();
    renderJapanMap();
    loadAddressMaster();
  } catch (e) {
    handleError(e);
  } finally {
    setLoading(false);
  }
}

async function loadAddressMaster() {
  try {
    var cached = localStorage.getItem('academyAddressMasterV1');
    if (cached) addressMaster = JSON.parse(cached);

    var r = await fetch('https://geolonia.github.io/japanese-addresses/api/ja.json', {
      cache: 'force-cache'
    });
    if (r.ok) {
      addressMaster = await r.json();
      localStorage.setItem('academyAddressMasterV1', JSON.stringify(addressMaster));
    }
  } catch (e) {}
}

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
      counts[pref] || 0;

    var isSelected =
      selectedPrefecture === pref;

    var color =
      '#F1F3F5';

    var hoverColor =
      '#FFD3CB';

    if (
      count > 0
    ) {

      color =
        '#FF9A8B';

      hoverColor =
        '#FF796C';

    }

    if (
      isSelected
    ) {

      color =
        '#D94F64';

      hoverColor =
        '#C73E53';

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

  var mapWidth =
    Math.min(
      720,
      Math.max(
        330,
        el.clientWidth || 620
      )
    );

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
          '#D6DADD',

        lineWidth:
          1,

        borderLineColor:
          '#FFFFFF',

        borderLineWidth:
          1.5,

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

}

function renderAll() {
  renderStats();
  renderPrefList();
  renderMapTeacherPreview();
  renderFullTeacherList();
  renderSearchResults();
}

function renderStats() {
  var unknown = 0;
  for (var i = 0; i < teachers.length; i++) {
    if (!teachers[i].prefecture) unknown++;
  }

  document.getElementById('stats').innerHTML =
    '<div class="stat">全国 ' + teachers.length + '名</div>' +
    '<div class="stat">所在地不明 ' + unknown + '名</div>';
}

function getPrefCounts() {
  var result = {};
  for (var i = 0; i < teachers.length; i++) {
    var p = teachers[i].prefecture;
    if (!p) continue;
    result[p] = (result[p] || 0) + 1;
  }
  return result;
}

function getUnknownCount() {
  var count = 0;
  for (var i = 0; i < teachers.length; i++) {
    if (!teachers[i].prefecture) count++;
  }
  return count;
}

function setPrefMode(mode) {
  prefMode = mode;
  document.getElementById('activePrefBtn').classList.toggle('active', mode === 'active');
  document.getElementById('allPrefBtn').classList.toggle('active', mode === 'all');
  renderPrefList();
}

function renderPrefList() {
  var counts = getPrefCounts();
  var html = '';

  for (var i = 0; i < prefectures.length; i++) {
    var p = prefectures[i];
    var count = counts[p] || 0;

    if (prefMode === 'active' && !count) continue;

    var cls = 'chip' + (count ? ' has' : '') + (selectedPrefecture === p ? ' selected' : '');

    html +=
      '<button class="' + cls + '" onclick="selectPrefecture(\'' +
      escapeJs(p) + '\')">' +
      escapeHtml(p) +
      (count ? ' ' + count + '名' : '') +
      '</button>';
  }

  var unknown = getUnknownCount();

  if (unknown) {
    html +=
      '<button class="chip' +
      (selectedPrefecture === '__UNKNOWN__' ? ' selected' : '') +
      '" onclick="selectUnknown()">所在地不明 ' +
      unknown + '名</button>';
  }

  document.getElementById('prefList').innerHTML = html;
}

function selectPrefecture(pref) {
  selectedPrefecture = pref;
  selectedTeacherId = '';
  document.getElementById('selectedPrefName').textContent = pref;
  renderPrefList();
  renderMapTeacherPreview();
  renderJapanMap();
}

function selectUnknown() {
  selectedPrefecture = '__UNKNOWN__';
  selectedTeacherId = '';
  document.getElementById('selectedPrefName').textContent = '所在地不明';
  renderPrefList();
  renderMapTeacherPreview();
  renderJapanMap();
}

function teacherMatches(t, q) {
  if (!q) return true;

  var s = [
    t.name, t.kana, t.nickname, t.salonName, t.salonKana,
    t.instagram, t.prefecture, t.city, t.address1, t.memo
  ].join(' ').toLowerCase();

  return s.indexOf(q.toLowerCase()) !== -1;
}

function teacherCard(t) {
  return (
    '<div class="teacher" onclick="openTeacherDetail(\'' +
    escapeJs(t.teacherId) +
    '\')">' +
    '<div class="teacher-name">' +
    escapeHtml(t.name || '名前未登録') +
    '</div>' +
    (t.nickname ? '<div class="meta">' + escapeHtml(t.nickname) + '</div>' : '') +
    (t.salonName ? '<div class="meta">' + escapeHtml(t.salonName) + '</div>' : '') +
    ((t.prefecture || t.city)
      ? '<div class="meta">' +
        escapeHtml([t.prefecture, t.city].filter(Boolean).join(' ')) +
        '</div>'
      : '<div class="meta">所在地不明</div>') +
    '</div>'
  );
}

function renderMapTeacherPreview() {
  var q = (document.getElementById('mapSearch').value || '').trim();
  var list = [];

  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];

    if (selectedPrefecture === '__UNKNOWN__' && t.prefecture) continue;

    if (
      selectedPrefecture &&
      selectedPrefecture !== '__UNKNOWN__' &&
      t.prefecture !== selectedPrefecture
    ) continue;

    if (!teacherMatches(t, q)) continue;

    list.push(t);
  }

  var title =
    selectedPrefecture === '__UNKNOWN__'
      ? '所在地不明'
      : (selectedPrefecture || '先生一覧');

  var html =
    '<div class="section-title">' +
    escapeHtml(title) +
    '　' + list.length + '名</div>';

  if (!list.length) {
    html += '<div class="empty">該当する先生はいません。</div>';
  } else {
    html += '<div class="teacher-list">';
    for (var j = 0; j < list.length; j++) html += teacherCard(list[j]);
    html += '</div>';
  }

  document.getElementById('mapSide').innerHTML = html;
}

function renderFullTeacherList() {
  var q = (document.getElementById('listSearch').value || '').trim();
  var html = '';

  for (var i = 0; i < teachers.length; i++) {
    if (teacherMatches(teachers[i], q)) html += teacherCard(teachers[i]);
  }

  document.getElementById('fullTeacherList').innerHTML =
    html || '<div class="empty">該当する先生はいません。</div>';
}

function renderSearchResults() {
  var q = (document.getElementById('globalSearch').value || '').trim();

  if (!q) {
    document.getElementById('searchResults').innerHTML =
      '<div class="empty">検索語を入力してください。</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < teachers.length; i++) {
    if (teacherMatches(teachers[i], q)) html += teacherCard(teachers[i]);
  }

  document.getElementById('searchResults').innerHTML =
    html || '<div class="empty">該当する先生はいません。</div>';
}

function showPage(name) {
  var map = {
    map: 'pageMap',
    list: 'pageList',
    search: 'pageSearch',
    detail: 'pageDetail'
  };

  for (var key in map) {
    document.getElementById(map[key]).classList.toggle('active', key === name);
  }

  ['Map', 'List', 'Search'].forEach(function(n) {
    var button = document.getElementById('nav' + n);
    button.classList.toggle('active', n.toLowerCase() === name);
  });

  if (name === 'list') renderFullTeacherList();
  if (name === 'search') renderSearchResults();

  window.scrollTo(0, 0);
}

function findTeacher(id) {
  for (var i = 0; i < teachers.length; i++) {
    if (teachers[i].teacherId === id) return teachers[i];
  }
  return null;
}

function openTeacherDetail(id) {
  var t = findTeacher(id);
  if (!t) return;

  selectedTeacherId = id;

  if (t.prefecture) {
    selectedPrefecture = t.prefecture;
    document.getElementById('selectedPrefName').textContent = t.prefecture;
  }

  renderPrefList();
  renderJapanMap();
  renderTeacherDetail(t);
  showPage('detail');
}

function birthdayText(obj) {
  var result = '';
  if (obj.birthYear) result += obj.birthYear + '年';
  if (obj.birthMonth) result += obj.birthMonth + '月';
  if (obj.birthDay) result += obj.birthDay + '日';
  return result;
}

function detailRow(label, value) {
  if (value === '' || value === null || value === undefined) return '';

  return (
    '<div class="detail-row">' +
    '<div class="label">' + escapeHtml(label) + '</div>' +
    '<div class="value">' + escapeHtml(String(value)) + '</div>' +
    '</div>'
  );
}

function renderTeacherDetail(t) {
  var html =
    '<div class="card">' +
    '<div class="detail-head">' +
    '<div>' +
    '<div class="detail-name">' + escapeHtml(t.name || '名前未登録') + '</div>' +
    (t.kana ? '<div class="meta">' + escapeHtml(t.kana) + '</div>' : '') +
    '</div>' +
    '<button class="secondary" onclick="openTeacherForm(\'' +
    escapeJs(t.teacherId) +
    '\')">編集</button>' +
    '</div>';

  html += detailRow('呼び名', t.nickname);
  html += detailRow('性別', t.gender);
  html += detailRow('誕生日', birthdayText(t));
  html += detailRow('年齢', t.ageDisplay);
  html += detailRow('サロン名', t.salonName);
  html += detailRow('サロン名ふりがな', t.salonKana);
  html += detailRow('住所', t.fullAddress);
  html += detailRow('Instagram', t.instagram ? '@' + t.instagram : '');
  html += detailRow('メモ', t.memo);

  html += '<div class="actions">';

  if (t.instagram) {
    html +=
      '<button class="secondary" onclick="openInstagram(\'' +
      escapeJs(t.instagram) +
      '\')">Instagram</button>';
  }

  if (t.fullAddress) {
    html +=
      '<button class="secondary" onclick="openGoogleMap(\'' +
      escapeJs(t.fullAddress) +
      '\')">Google Maps</button>';
  }

  html +=
    '<button class="danger" onclick="deleteTeacherAction(\'' +
    escapeJs(t.teacherId) +
    '\')">先生を削除</button>';

  html += '</div></div>';

  html +=
    '<div class="card"><div class="section-title">子ども情報 ' +
    (t.children ? t.children.length : 0) +
    '人</div>';

  if (!t.children || !t.children.length) {
    html += '<div class="empty">登録なし</div>';
  } else {
    for (var i = 0; i < t.children.length; i++) {
      var c = t.children[i];

      html += '<div class="child">';

      html += '<strong>' + escapeHtml(c.name || c.nickname || '名前未登録') + '</strong>';

      if (c.nickname) html += '<div class="meta">' + escapeHtml(c.nickname) + '</div>';
      if (c.gender) html += '<div class="meta">性別：' + escapeHtml(c.gender) + '</div>';
      if (c.gradeDisplay) html += '<div class="meta">学年：' + escapeHtml(c.gradeDisplay) + '</div>';
      if (c.ageDisplay) html += '<div class="meta">年齢：' + escapeHtml(c.ageDisplay) + '</div>';
      if (birthdayText(c)) html += '<div class="meta">誕生日：' + escapeHtml(birthdayText(c)) + '</div>';
      if (c.memo) html += '<div class="meta">' + escapeHtml(c.memo) + '</div>';

      html += '</div>';
    }
  }

  html += '</div>';

  document.getElementById('detailContent').innerHTML = html;
}

function openTeacherForm(id) {
  clearTeacherForm();

  var t = id ? findTeacher(id) : null;

  document.getElementById('modalTitle').textContent =
    t ? '先生情報を編集' : '先生を追加';

  if (t) {
    setValue('teacherId', t.teacherId);
    setValue('name', t.name);
    setValue('kana', t.kana);
    setValue('nickname', t.nickname);
    setValue('gender', t.gender || '女');
    setValue('birthYear', t.birthYear);
    setValue('birthMonth', t.birthMonth);
    setValue('birthDay', t.birthDay);
    setValue('ageManual', t.ageManual);
    setValue('salonName', t.salonName);
    setValue('salonKana', t.salonKana);
    setValue('prefecture', t.prefecture);
    setValue('city', t.city);
    setValue('address1', t.address1);
    setValue('address2', t.address2);
    setValue('instagram', t.instagram);
    setValue('memo', t.memo);
  }

  renderChildrenEditor(t ? (t.children || []) : []);
  document.getElementById('teacherModal').classList.add('show');
}

function closeTeacherForm() {
  document.getElementById('teacherModal').classList.remove('show');
  hideCombos();
}

function clearTeacherForm() {
  [
    'teacherId','name','kana','nickname','birthYear','birthMonth','birthDay',
    'ageManual','salonName','salonKana','prefecture','city','address1',
    'address2','instagram','memo'
  ].forEach(function(id) {
    setValue(id, '');
  });

  setValue('gender', '女');
}

async function saveTeacherForm() {
  var payload = {
    teacherId: valueOf('teacherId'),
    name: valueOf('name'),
    kana: valueOf('kana'),
    nickname: valueOf('nickname'),
    gender: valueOf('gender'),
    birthYear: valueOf('birthYear'),
    birthMonth: valueOf('birthMonth'),
    birthDay: valueOf('birthDay'),
    ageManual: valueOf('ageManual'),
    salonName: valueOf('salonName'),
    salonKana: valueOf('salonKana'),
    prefecture: valueOf('prefecture'),
    city: valueOf('city'),
    address1: valueOf('address1'),
    address2: valueOf('address2'),
    instagram: valueOf('instagram'),
    memo: valueOf('memo')
  };

  if (!payload.name) {
    alert('名前を入力してください。');
    return;
  }

  setLoading(true);

  try {
    var saved = await runScript('saveTeacher', [payload]);
    await saveChildrenAfterTeacher(saved);
  } catch (e) {
    handleError(e);
  } finally {
    setLoading(false);
  }
}

function renderChildrenEditor(children) {
  document.getElementById('childrenEditArea').innerHTML =
    '<div class="section-title">子ども情報</div>' +
    '<div id="childRows"></div>' +
    '<button type="button" class="secondary" onclick="addChildRow()">＋ 子どもを追加</button>';

  for (var i = 0; i < children.length; i++) addChildRow(children[i]);
}

function addChildRow(child) {
  child = child || {};

  var div = document.createElement('div');
  div.className = 'child-edit';
  div.setAttribute('data-child-id', child.childId || '');

  var gradeSelect = '<select class="child-grade">';

  for (var g = 0; g < gradeOptions.length; g++) {
    var grade = gradeOptions[g];

    gradeSelect +=
      '<option value="' +
      escapeAttr(grade) +
      '"' +
      (child.grade === grade ? ' selected' : '') +
      '>' +
      escapeHtml(grade || '未設定') +
      '</option>';
  }

  gradeSelect += '</select>';

  div.innerHTML =
    '<div class="grid2">' +
      '<div class="field"><label>名前</label><input class="child-name" value="' +
      escapeAttr(child.name || '') + '"></div>' +
      '<div class="field"><label>ふりがな</label><input class="child-kana" value="' +
      escapeAttr(child.kana || '') + '"></div>' +
    '</div>' +

    '<div class="grid2">' +
      '<div class="field"><label>呼び名</label><input class="child-nickname" value="' +
      escapeAttr(child.nickname || '') + '"></div>' +
      '<div class="field"><label>性別</label><select class="child-gender">' +
        '<option value=""' + (!child.gender ? ' selected' : '') + '>未設定</option>' +
        '<option value="女"' + (child.gender === '女' ? ' selected' : '') + '>女</option>' +
        '<option value="男"' + (child.gender === '男' ? ' selected' : '') + '>男</option>' +
      '</select></div>' +
    '</div>' +

    '<div class="grid2">' +
      '<div class="field"><label>学年</label>' + gradeSelect + '</div>' +
      '<div class="field"><label>年齢</label><input type="number" class="child-age" value="' +
      escapeAttr(child.ageManual || '') + '"></div>' +
    '</div>' +

    '<div class="field"><label>生まれ年</label><input type="number" class="child-year" value="' +
    escapeAttr(child.birthYear || '') + '"></div>' +

    '<div class="grid2">' +
      '<div class="field"><label>誕生月</label><input type="number" min="1" max="12" class="child-month" value="' +
      escapeAttr(child.birthMonth || '') + '"></div>' +
      '<div class="field"><label>誕生日</label><input type="number" min="1" max="31" class="child-day" value="' +
      escapeAttr(child.birthDay || '') + '"></div>' +
    '</div>' +

    '<div class="field"><label>メモ</label><textarea class="child-memo">' +
    escapeHtml(child.memo || '') + '</textarea></div>' +

    '<button type="button" class="danger" onclick="removeChildRow(this)">この子ども情報を削除</button>';

  document.getElementById('childRows').appendChild(div);
}

async function saveChildrenAfterTeacher(teacher) {
  var rows = document.querySelectorAll('.child-edit');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    var name = row.querySelector('.child-name').value.trim();
    var nickname = row.querySelector('.child-nickname').value.trim();

    if (!name && !nickname) continue;

    var payload = {
      childId: row.getAttribute('data-child-id') || '',
      teacherId: teacher.teacherId,
      name: name,
      kana: row.querySelector('.child-kana').value,
      nickname: nickname,
      gender: row.querySelector('.child-gender').value,
      grade: row.querySelector('.child-grade').value,
      birthYear: row.querySelector('.child-year').value,
      birthMonth: row.querySelector('.child-month').value,
      birthDay: row.querySelector('.child-day').value,
      ageManual: row.querySelector('.child-age').value,
      memo: row.querySelector('.child-memo').value
    };

    await runScript('saveChild', [payload]);
  }

  await refreshAfterSave(teacher.teacherId);
}

async function refreshAfterSave(teacherId) {
  teachers = (await runScript('getTeachers')) || [];

  closeTeacherForm();
  renderAll();

  var teacher = findTeacher(teacherId);

  if (teacher) openTeacherDetail(teacherId);
}

async function removeChildRow(button) {
  var row = button.closest('.child-edit');
  var childId = row.getAttribute('data-child-id');

  if (!childId) {
    row.remove();
    return;
  }

  if (!confirm('この子ども情報を削除しますか？')) return;

  setLoading(true);

  try {
    await runScript('deleteChild', [childId]);
    row.remove();
  } catch (e) {
    handleError(e);
  } finally {
    setLoading(false);
  }
}

async function deleteTeacherAction(id) {
  if (!confirm('この先生と紐づく子ども情報も削除します。\n本当に削除しますか？')) return;

  setLoading(true);

  try {
    await runScript('deleteTeacher', [id]);
    teachers = (await runScript('getTeachers')) || [];
    selectedTeacherId = '';
    renderAll();
    renderJapanMap();
    showPage('map');
  } catch (e) {
    handleError(e);
  } finally {
    setLoading(false);
  }
}

function showPrefectureResults() {
  var q = valueOf('prefecture');
  var box = document.getElementById('prefResults');

  box.innerHTML = '';

  for (var i = 0; i < prefectures.length; i++) {
    var pref = prefectures[i];

    if (q && pref.indexOf(q) === -1) continue;

    var item = document.createElement('div');
    item.className = 'combo-option';
    item.textContent = pref;
    item.onclick = makePrefSelector(pref);
    box.appendChild(item);
  }

  box.classList.add('show');
}

function makePrefSelector(pref) {
  return function() {
    setValue('prefecture', pref);
    setValue('city', '');
    document.getElementById('prefResults').classList.remove('show');
  };
}

function showCityResults() {
  var q = valueOf('city');
  var selectedPref = valueOf('prefecture');
  var results = [];

  for (var pref in addressMaster) {
    if (!addressMaster.hasOwnProperty(pref)) continue;
    if (selectedPref && pref !== selectedPref) continue;

    var cities = addressMaster[pref] || [];

    for (var i = 0; i < cities.length; i++) {
      var city = cities[i];

      if (q && city.indexOf(q) === -1) continue;

      results.push({ prefecture: pref, city: city });

      if (results.length >= 100) break;
    }

    if (results.length >= 100) break;
  }

  var box = document.getElementById('cityResults');

  box.innerHTML = '';

  for (var j = 0; j < results.length; j++) {
    var r = results[j];
    var item = document.createElement('div');

    item.className = 'combo-option';
    item.textContent = r.city + '｜' + r.prefecture;
    item.onclick = makeCitySelector(r);

    box.appendChild(item);
  }

  box.classList.add('show');
}

function makeCitySelector(row) {
  return function() {
    setValue('city', row.city);
    setValue('prefecture', row.prefecture);
    document.getElementById('cityResults').classList.remove('show');
  };
}

function hideCombos() {
  document.getElementById('prefResults').classList.remove('show');
  document.getElementById('cityResults').classList.remove('show');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.combo')) hideCombos();
});

function openInstagram(account) {
  window.open(
    'https://www.instagram.com/' + encodeURIComponent(account),
    '_blank'
  );
}

function openGoogleMap(address) {
  window.open(
    'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(address),
    '_blank'
  );
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function setValue(id, value) {
  document.getElementById(id).value =
    value === null || value === undefined ? '' : value;
}

function setLoading(show) {
  document.getElementById('loading').classList.toggle('show', show);
}

function handleError(error) {
  setLoading(false);
  alert(error && error.message ? error.message : String(error));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function escapeJs(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}
