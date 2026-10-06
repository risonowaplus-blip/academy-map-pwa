/* =========================================================
   Mirel Map
   UI / UX Enhancements
   2026-10-07
   ========================================================= */


/* =========================================================
   基本設定
   ========================================================= */

var MIREL_REGION_ORDER = [
  '北海道',
  '東北',
  '関東',
  '中部',
  '関西',
  '中国',
  '四国',
  '九州',
  '沖縄',
  '所在地不明'
];

var mirelTownIndexCache = {};
var mirelTownIndexPromises = {};
var citySearchSequence = 0;


/* 卒業は入力候補として使用しない */
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
  '高3'
];


/* =========================================================
   Mirel Map 標準名称
   ========================================================= */

appName = function() {

  var value =
    String(
      appSettings.appName ||
      ''
    ).trim();

  if (
    !value ||
    value === 'Academy Map'
  ) {
    return 'Mirel Map';
  }

  return value;

};


placeKanaLabel = function() {

  var value =
    String(
      appSettings.placeKanaLabel ||
      ''
    ).trim();

  if (
    !value ||
    value === '店名ふりがな'
  ) {
    return '店名読み';
  }

  return value;

};


/* =========================================================
   西暦＋和暦
   ========================================================= */

function mirelEraLabel(year) {

  year = Number(year);

  if (!year) {
    return '';
  }

  if (year >= 2019) {

    return (
      year +
      '年（令和' +
      (year - 2018) +
      '年）'
    );

  }

  if (year >= 1989) {

    return (
      year +
      '年（平成' +
      (year - 1988) +
      '年）'
    );

  }

  if (year >= 1926) {

    return (
      year +
      '年（昭和' +
      (year - 1925) +
      '年）'
    );

  }

  if (year >= 1912) {

    return (
      year +
      '年（大正' +
      (year - 1911) +
      '年）'
    );

  }

  if (year >= 1868) {

    return (
      year +
      '年（明治' +
      (year - 1867) +
      '年）'
    );

  }

  return year + '年';

}


/* =========================================================
   生年月日候補
   ========================================================= */

function mirelDateOptions(type) {

  var result = [];

  if (type === 'year') {

    var currentYear =
      new Date().getFullYear();

    for (
      var year = currentYear;
      year >= 1900;
      year--
    ) {

      result.push({
        value: String(year),
        label: mirelEraLabel(year)
      });

    }

  }


  if (type === 'month') {

    for (
      var month = 1;
      month <= 12;
      month++
    ) {

      result.push({
        value: String(month),
        label: month + '月'
      });

    }

  }


  if (type === 'day') {

    for (
      var day = 1;
      day <= 31;
      day++
    ) {

      result.push({
        value: String(day),
        label: day + '日'
      });

    }

  }


  return result;

}


function mirelFilterDateOptions(
  type,
  query
) {

  query =
    String(
      query ||
      ''
    ).trim();


  var options =
    mirelDateOptions(type);


  if (!query) {
    return options;
  }


  return options.filter(
    function(item) {

      return (
        item.value.indexOf(query) !== -1 ||
        item.label.indexOf(query) !== -1
      );

    }
  );

}


/* =========================================================
   検索窓付きプルダウン
   ========================================================= */

function mirelAttachSearchSelect(
  input,
  type
) {

  if (
    !input ||
    input.dataset.mirelComboReady === '1'
  ) {
    return;
  }


  input.dataset.mirelComboReady =
    '1';

  input.type =
    'text';

  input.inputMode =
    'numeric';

  input.autocomplete =
    'off';


  if (type === 'year') {
    input.placeholder =
      '年を選択・直接入力';
  }

  if (type === 'month') {
    input.placeholder =
      '月を選択・直接入力';
  }

  if (type === 'day') {
    input.placeholder =
      '日を選択・直接入力';
  }


  var field =
    input.closest(
      '.field'
    );

  if (!field) {
    return;
  }


  field.classList.add(
    'mirel-search-select'
  );


  var arrow =
    document.createElement(
      'button'
    );

  arrow.type =
    'button';

  arrow.className =
    'mirel-select-arrow';

  arrow.textContent =
    '▽';


  var panel =
    document.createElement(
      'div'
    );

  panel.className =
    'mirel-select-panel';


  var search =
    document.createElement(
      'input'
    );

  search.type =
    'search';

  search.className =
    'mirel-select-search';

  search.placeholder =
    type === 'year'
      ? '西暦・和暦で検索'
      : '候補を検索';


  var optionsBox =
    document.createElement(
      'div'
    );

  optionsBox.className =
    'mirel-select-options';


  panel.appendChild(
    search
  );

  panel.appendChild(
    optionsBox
  );

  field.appendChild(
    arrow
  );

  field.appendChild(
    panel
  );


  function renderOptions(query) {

    var options =
      mirelFilterDateOptions(
        type,
        query
      );


    optionsBox.innerHTML =
      '';


    options.forEach(
      function(item) {

        var button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'mirel-select-option';

        button.textContent =
          item.label;


        button.onclick =
          function(event) {

            event.preventDefault();
            event.stopPropagation();

            input.value =
              item.value;

            panel.classList.remove(
              'show'
            );

          };


        optionsBox.appendChild(
          button
        );

      }
    );

  }


  function openPanel() {

    document
      .querySelectorAll(
        '.mirel-select-panel.show'
      )
      .forEach(
        function(other) {

          if (other !== panel) {
            other.classList.remove(
              'show'
            );
          }

        }
      );


    search.value =
      '';

    renderOptions(
      ''
    );

    panel.classList.add(
      'show'
    );

  }


  arrow.onclick =
    function(event) {

      event.preventDefault();
      event.stopPropagation();

      if (
        panel.classList.contains(
          'show'
        )
      ) {

        panel.classList.remove(
          'show'
        );

      } else {

        openPanel();

        setTimeout(
          function() {
            search.focus();
          },
          0
        );

      }

    };


  input.addEventListener(
    'focus',
    function() {
      openPanel();
    }
  );


  input.addEventListener(
    'input',
    function() {

      panel.classList.add(
        'show'
      );

      search.value =
        input.value;

      renderOptions(
        input.value
      );

    }
  );


  search.addEventListener(
    'input',
    function() {

      renderOptions(
        search.value
      );

    }
  );


  panel.addEventListener(
    'click',
    function(event) {

      event.stopPropagation();

    }
  );

}


/* =========================================================
   先生 生年月日
   ========================================================= */

function mirelEnhanceTeacherBirthday() {

  mirelAttachSearchSelect(
    document.getElementById(
      'birthYear'
    ),
    'year'
  );

  mirelAttachSearchSelect(
    document.getElementById(
      'birthMonth'
    ),
    'month'
  );

  mirelAttachSearchSelect(
    document.getElementById(
      'birthDay'
    ),
    'day'
  );


  var age =
    document.getElementById(
      'ageManual'
    );

  if (age) {

    age.placeholder =
      '生年月日入力時は自動計算。手入力も可';

  }

}


/* =========================================================
   子ども 生年月日
   ========================================================= */

var mirelOriginalAddChildRow =
  addChildRow;


addChildRow = function(child) {

  mirelOriginalAddChildRow(
    child
  );


  var rows =
    document.querySelectorAll(
      '.child-edit'
    );


  if (!rows.length) {
    return;
  }


  var row =
    rows[
      rows.length - 1
    ];


  mirelAttachSearchSelect(
    row.querySelector(
      '.child-year'
    ),
    'year'
  );


  mirelAttachSearchSelect(
    row.querySelector(
      '.child-month'
    ),
    'month'
  );


  mirelAttachSearchSelect(
    row.querySelector(
      '.child-day'
    ),
    'day'
  );


  var age =
    row.querySelector(
      '.child-age'
    );

  if (age) {

    age.placeholder =
      '生年月日入力時は自動計算。手入力も可';

  }

};


/* =========================================================
   町名検索
   ========================================================= */

function mirelTownName(row) {

  if (
    typeof row === 'string'
  ) {
    return row;
  }


  return (
    String(
      row.town ||
      ''
    ) +

    String(
      row.koaza ||
      ''
    )
  );

}


async function mirelFetchTownList(
  prefecture,
  city
) {

  try {

    var response =
      await fetch(

        'https://geolonia.github.io/japanese-addresses/api/ja/' +

        encodeURIComponent(
          prefecture
        ) +

        '/' +

        encodeURIComponent(
          city
        ) +

        '.json',

        {
          cache:
            'force-cache'
        }

      );


    if (!response.ok) {
      return [];
    }


    var data =
      await response.json();


    if (
      !Array.isArray(data)
    ) {
      return [];
    }


    return data;

  } catch (e) {

    return [];

  }

}


/* =========================================================
   都道府県単位で町名索引作成
   ========================================================= */

async function mirelBuildTownIndex(
  prefecture
) {

  if (
    mirelTownIndexCache[
      prefecture
    ]
  ) {

    return mirelTownIndexCache[
      prefecture
    ];

  }


  if (
    mirelTownIndexPromises[
      prefecture
    ]
  ) {

    return mirelTownIndexPromises[
      prefecture
    ];

  }


  mirelTownIndexPromises[
    prefecture
  ] = (async function() {

    var cities =
      addressMaster[
        prefecture
      ] ||
      [];


    var index = [];


    /*
     * 同時通信を増やしすぎないよう
     * 6市区町村ずつ処理
     */
    for (
      var start = 0;
      start < cities.length;
      start += 6
    ) {

      var batch =
        cities.slice(
          start,
          start + 6
        );


      var results =
        await Promise.all(

          batch.map(
            async function(city) {

              var towns =
                await mirelFetchTownList(
                  prefecture,
                  city
                );


              return {
                city: city,
                towns: towns
              };

            }
          )

        );


      results.forEach(
        function(result) {

          result.towns.forEach(
            function(townRow) {

              var town =
                mirelTownName(
                  townRow
                );


              if (!town) {
                return;
              }


              index.push({
                prefecture:
                  prefecture,

                city:
                  result.city,

                town:
                  town
              });

            }
          );

        }
      );

    }


    /*
     * 同一地名の重複除去
     */
    var seen = {};


    index =
      index.filter(
        function(row) {

          var key =
            row.city +
            '|' +
            row.town;


          if (seen[key]) {
            return false;
          }


          seen[key] =
            true;

          return true;

        }
      );


    mirelTownIndexCache[
      prefecture
    ] =
      index;


    delete mirelTownIndexPromises[
      prefecture
    ];


    return index;

  })();


  return mirelTownIndexPromises[
    prefecture
  ];

}


/* =========================================================
   市区町村候補描画
   ========================================================= */

function mirelRenderCityResults(
  rows,
  message
) {

  var box =
    document.getElementById(
      'cityResults'
    );


  if (!box) {
    return;
  }


  box.innerHTML =
    '';


  rows
    .slice(
      0,
      80
    )
    .forEach(
      function(row) {

        var item =
          document.createElement(
            'div'
          );

        item.className =
          'combo-option';


        item.textContent =

          row.city +

          '｜' +

          row.prefecture +

          (
            row.town
              ? '｜' + row.town
              : ''
          );


        item.onclick =
          function() {

            setValue(
              'city',
              row.city
            );


            setValue(
              'prefecture',
              row.prefecture
            );


            if (
              row.town &&
              !valueOf(
                'address1'
              )
            ) {

              setValue(
                'address1',
                row.town
              );

            }


            box.classList.remove(
              'show'
            );

          };


        box.appendChild(
          item
        );

      }
    );


  if (message) {

    var note =
      document.createElement(
        'div'
      );

    note.className =
      'combo-search-note';

    note.textContent =
      message;

    box.appendChild(
      note
    );

  }


  box.classList.add(
    'show'
  );

}


/* =========================================================
   市区町村検索 上書き
   ========================================================= */

showCityResults =
  async function() {

    var sequence =
      ++citySearchSequence;


    var query =
      valueOf(
        'city'
      );


    var selectedPref =
      valueOf(
        'prefecture'
      );


    var cityResults = [];


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
          city.indexOf(
            query
          ) === -1
        ) {
          continue;
        }


        cityResults.push({
          prefecture:
            pref,

          city:
            city,

          town:
            ''
        });

      }

    }


    if (
      !query
    ) {

      mirelRenderCityResults(
        cityResults
      );

      return;

    }


    /*
     * 都道府県未選択時は
     * 全国の市区町村名検索のみ。
     */
    if (
      !selectedPref
    ) {

      mirelRenderCityResults(

        cityResults,

        '町名で探す場合は、先に都道府県を選択してください。'

      );

      return;

    }


    /*
     * 市区町村名だけで候補があれば
     * 先に即表示
     */
    mirelRenderCityResults(

      cityResults,

      '町名まで検索しています…'

    );


    var townIndex =
      await mirelBuildTownIndex(
        selectedPref
      );


    /*
     * 検索中に入力が変わった場合は破棄
     */
    if (
      sequence !==
      citySearchSequence
    ) {
      return;
    }


    if (
      query !==
      valueOf(
        'city'
      )
    ) {
      return;
    }


    var townResults =
      townIndex.filter(
        function(row) {

          return (
            row.town.indexOf(
              query
            ) !== -1
          );

        }
      );


    var combined =
      cityResults.concat(
        townResults
      );


    mirelRenderCityResults(
      combined,
      ''
    );

};


/* =========================================================
   先生一覧専用コンパクトカード
   ========================================================= */

function mirelTeacherListCard(
  teacher
) {

  var location =

    [
      teacher.prefecture,
      teacher.city
    ]

      .filter(Boolean)

      .join(' ');


  return (

    '<div class="teacher mirel-list-card" onclick="openTeacherDetail(\'' +

    escapeJs(
      teacher.teacherId
    ) +

    '\')">' +


      '<div class="mirel-list-first">' +


        '<div class="teacher-name">' +

          escapeHtml(
            teacher.name ||
            '名前未登録'
          ) +

        '</div>' +


        '<div class="mirel-list-address">' +

          escapeHtml(
            location ||
            '所在地不明'
          ) +

        '</div>' +


      '</div>' +


      '<div class="mirel-list-line">' +

        escapeHtml(
          teacher.nickname ||
          '　'
        ) +

      '</div>' +


      '<div class="mirel-list-line mirel-list-place">' +

        escapeHtml(
          teacher.salonName ||
          '　'
        ) +

      '</div>' +


    '</div>'

  );

}


/* =========================================================
   一覧用 地域名
   ========================================================= */

function mirelListRegion(
  prefecture
) {

  if (!prefecture) {
    return '所在地不明';
  }


  var region =
    getRegionName(
      prefecture
    );


  if (
    region === '近畿'
  ) {
    return '関西';
  }


  return region;

}


/* =========================================================
   都道府県順
   ========================================================= */

function mirelPrefectureIndex(
  prefecture
) {

  var index =
    prefectures.indexOf(
      prefecture
    );


  return index === -1
    ? 999
    : index;

}


/* =========================================================
   先生一覧 地域グループ化
   ========================================================= */

renderFullTeacherList =
  function() {

    var rows =
      teachers
        .slice()
        .sort(
          function(a, b) {

            var prefDiff =

              mirelPrefectureIndex(
                a.prefecture
              ) -

              mirelPrefectureIndex(
                b.prefecture
              );


            if (
              prefDiff !== 0
            ) {
              return prefDiff;
            }


            return String(
              a.kana ||
              a.name ||
              ''
            ).localeCompare(

              String(
                b.kana ||
                b.name ||
                ''
              ),

              'ja'

            );

          }
        );


    var grouped = {};


    MIREL_REGION_ORDER.forEach(
      function(region) {
        grouped[region] = [];
      }
    );


    rows.forEach(
      function(teacher) {

        var region =
          mirelListRegion(
            teacher.prefecture
          );


        if (
          !grouped[region]
        ) {
          grouped[region] = [];
        }


        grouped[region].push(
          teacher
        );

      }
    );


    var html = '';


    MIREL_REGION_ORDER.forEach(
      function(region) {

        var list =
          grouped[region] ||
          [];


        if (!list.length) {
          return;
        }


        var id =
          'mirelRegion_' +
          encodeURIComponent(
            region
          ).replace(
            /%/g,
            ''
          );


        html +=

          '<section class="mirel-region" id="' +
          id +
          '">' +


            '<div class="mirel-region-title">' +

              '<span>' +

                escapeHtml(
                  region
                ) +

              '</span>' +

              '<span class="mirel-region-count">' +

                list.length +
                '名' +

              '</span>' +

            '</div>' +


            '<div class="teacher-list">';


        list.forEach(
          function(teacher) {

            html +=
              mirelTeacherListCard(
                teacher
              );

          }
        );


        html +=

            '</div>' +

          '</section>';

      }
    );


    document.getElementById(
      'fullTeacherList'
    ).innerHTML =

      html ||

      (
        '<div class="empty">' +

        escapeHtml(
          personLabel()
        ) +

        'はいません。</div>'
      );

  };


/* =========================================================
   地域ジャンプ
   ========================================================= */

function mirelInstallRegionJump() {

  var listSearch =
    document.getElementById(
      'listSearch'
    );


  if (listSearch) {
    listSearch.style.display =
      'none';
  }


  if (
    document.getElementById(
      'mirelRegionJump'
    )
  ) {
    return;
  }


  var title =
    document.getElementById(
      'listPageTitle'
    );


  if (!title) {
    return;
  }


  var wrapper =
    document.createElement(
      'div'
    );

  wrapper.className =
    'mirel-region-jump';


  var select =
    document.createElement(
      'select'
    );

  select.id =
    'mirelRegionJump';


  select.innerHTML =

    '<option value="">地域へジャンプ</option>' +

    MIREL_REGION_ORDER
      .map(
        function(region) {

          return (

            '<option value="' +

            escapeAttr(
              region
            ) +

            '">' +

            escapeHtml(
              region
            ) +

            '</option>'

          );

        }
      )
      .join('');


  select.onchange =
    function() {

      var region =
        this.value;


      if (!region) {
        return;
      }


      var id =
        'mirelRegion_' +
        encodeURIComponent(
          region
        ).replace(
          /%/g,
          ''
        );


      var target =
        document.getElementById(
          id
        );


      if (target) {

        target.scrollIntoView({

          behavior:
            'smooth',

          block:
            'start'

        });

      }

    };


  wrapper.appendChild(
    select
  );


  title.insertAdjacentElement(
    'afterend',
    wrapper
  );

}


/* =========================================================
   地図ページ再表示時に再描画
   ========================================================= */

var mirelOriginalShowPage =
  showPage;


showPage =
  function(name) {

    mirelOriginalShowPage(
      name
    );


    if (
      name === 'map'
    ) {

      requestAnimationFrame(
        function() {

          requestAnimationFrame(
            function() {

              renderJapanMap();

            }
          );

        }
      );

    }

  };


/* =========================================================
   詳細 SNSカード
   ========================================================= */

renderDetailLink =
  function(link) {

    var type =
      link.type ||
      'リンク';


    var title =
      link.displayName ||
      type;


    return (

      '<div class="mirel-social-card">' +


        '<div class="mirel-social-main">' +


          '<div class="mirel-social-name">' +

            escapeHtml(
              title
            ) +

          '</div>' +


          '<div class="mirel-social-value">' +

            escapeHtml(
              displayLinkValue(
                link
              )
            ) +

          '</div>' +


        '</div>' +


        '<button class="mirel-mini-button" onclick="openLink(\'' +

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

  };


/* =========================================================
   Google Mapsを住所欄へ移動
   ========================================================= */

var mirelOriginalRenderTeacherDetail =
  renderTeacherDetail;


renderTeacherDetail =
  function(teacher) {

    mirelOriginalRenderTeacherDetail(
      teacher
    );


    /*
     * 元の下部Google Mapsボタンを削除
     */
    document
      .querySelectorAll(
        '#detailContent .actions'
      )
      .forEach(
        function(actions) {

          var button =
            actions.querySelector(
              'button'
            );


          if (
            button &&
            button.textContent.trim() ===
            'Google Maps'
          ) {

            actions.remove();

          }

        }
      );


    if (
      !teacher.fullAddress
    ) {
      return;
    }


    document
      .querySelectorAll(
        '#detailContent .detail-row'
      )
      .forEach(
        function(row) {

          var label =
            row.querySelector(
              '.label'
            );


          if (
            !label ||
            label.textContent.trim() !==
            '住所'
          ) {
            return;
          }


          var value =
            row.querySelector(
              '.value'
            );


          if (!value) {
            return;
          }


          var button =
            document.createElement(
              'button'
            );

          button.type =
            'button';

          button.className =
            'mirel-mini-button mirel-map-button';

          button.textContent =
            'Google Maps';


          button.onclick =
            function() {

              openGoogleMap(
                teacher.fullAddress
              );

            };


          value.appendChild(
            button
          );

        }
      );

  };


/* =========================================================
   設定候補
   ========================================================= */

settingCandidates.appName = [
  'Mirel Map',
  'つながりマップ',
  'メンバーマップ',
  '先生マップ',
  '講師マップ',
  '仲間マップ',
  'スタッフマップ',
  'コミュニティマップ'
];


settingCandidates.placeKanaLabel = [
  '店名読み',
  'サロン名読み',
  '店舗名読み',
  '教室名読み',
  '所属先読み',
  '勤務先読み',
  '会社名読み',
  '施設名読み'
];


/* =========================================================
   設定フォーム
   値は空欄、現在値をplaceholder表示
   ========================================================= */

fillSettingsForm =
  function() {

    var rows = [

      {
        id:
          'settingAppName',

        placeholder:
          appName()
      },

      {
        id:
          'settingPersonLabel',

        placeholder:
          personLabel()
      },

      {
        id:
          'settingPlaceLabel',

        placeholder:
          placeLabel()
      },

      {
        id:
          'settingPlaceKanaLabel',

        placeholder:
          placeKanaLabel()
      }

    ];


    rows.forEach(
      function(row) {

        var input =
          document.getElementById(
            row.id
          );


        if (!input) {
          return;
        }


        input.value =
          '';

        input.placeholder =
          row.placeholder;

      }
    );

  };


/* =========================================================
   設定保存
   空欄なら現在値を維持
   ========================================================= */

saveSettingsForm =
  async function() {

    var payload = {

      appName:
        valueOf(
          'settingAppName'
        ) ||
        appName(),

      personLabel:
        valueOf(
          'settingPersonLabel'
        ) ||
        personLabel(),

      placeLabel:
        valueOf(
          'settingPlaceLabel'
        ) ||
        placeLabel(),

      placeKanaLabel:
        valueOf(
          'settingPlaceKanaLabel'
        ) ||
        placeKanaLabel()

    };


    setLoading(
      true
    );


    try {

      appSettings =
        await runScript(

          'saveAppSettings',

          [
            payload
          ]

        );


      /*
       * 旧標準値だけ新名称へ変換
       */
      if (
        appSettings.appName ===
        'Academy Map'
      ) {

        appSettings.appName =
          'Mirel Map';

      }


      if (
        appSettings.placeKanaLabel ===
        '店名ふりがな'
      ) {

        appSettings.placeKanaLabel =
          '店名読み';

      }


      cacheUiSettings();

      applySettingsToUi();

      renderAll();

      renderJapanMap();

      fillSettingsForm();


      alert(
        '設定を保存しました。'
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

  };


/* =========================================================
   設定候補
   focus＝全候補
   input＝絞り込み
   ========================================================= */

showSettingSuggestions =
  function(
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


    var matched =

      showAll

        ? candidates.slice()

        : candidates.filter(
            function(candidate) {

              return (
                !query ||
                candidate.indexOf(
                  query
                ) !== -1
              );

            }
          );


    box.innerHTML =
      '';


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
      !matched.length
    ) {

      var note =
        document.createElement(
          'div'
        );


      note.className =
        'setting-no-result';


      note.textContent =
        '候補にない名称も入力できます。';


      box.appendChild(
        note
      );

    }


    box.classList.add(
      'show'
    );

  };


/* =========================================================
   表示ラベル修正
   ========================================================= */

function mirelReplaceLabels() {

  document
    .querySelectorAll(
      'label'
    )
    .forEach(
      function(label) {

        var text =
          label.textContent.trim();


        if (
          text ===
          'サロン名ふりがな'
        ) {

          label.textContent =
            'サロン名読み';

        }


        if (
          text ===
          '店名ふりがなの表示名'
        ) {

          label.textContent =
            '店名読みの表示名';

        }

      }
    );


  var placeKana =
    document.getElementById(
      'placeKanaLabel'
    );


  if (placeKana) {

    placeKana.textContent =
      placeKanaLabel();

  }

}


/* =========================================================
   設定欄 ▽
   ========================================================= */

function mirelEnhanceSettings() {

  document
    .querySelectorAll(
      '.setting-combo'
    )
    .forEach(
      function(field) {

        if (
          field.querySelector(
            '.mirel-setting-arrow'
          )
        ) {
          return;
        }


        var arrow =
          document.createElement(
            'span'
          );


        arrow.className =
          'mirel-setting-arrow';

        arrow.textContent =
          '▽';


        field.appendChild(
          arrow
        );

      }
    );


  var settings = [

    [
      'settingAppName',
      'settingAppNameResults',
      'appName'
    ],

    [
      'settingPersonLabel',
      'settingPersonLabelResults',
      'personLabel'
    ],

    [
      'settingPlaceLabel',
      'settingPlaceLabelResults',
      'placeLabel'
    ],

    [
      'settingPlaceKanaLabel',
      'settingPlaceKanaLabelResults',
      'placeKanaLabel'
    ]

  ];


  settings.forEach(
    function(row) {

      var input =
        document.getElementById(
          row[0]
        );


      if (!input) {
        return;
      }


      input.onfocus =
        function() {

          showSettingSuggestions(
            row[0],
            row[1],
            row[2],
            true
          );

        };


      input.oninput =
        function() {

          showSettingSuggestions(
            row[0],
            row[1],
            row[2],
            false
          );

        };

    }
  );

}


/* =========================================================
   起動
   ========================================================= */

function initializeMirelEnhancements() {

  mirelEnhanceTeacherBirthday();

  mirelInstallRegionJump();

  mirelReplaceLabels();

  mirelEnhanceSettings();


  if (
    appSettings.appName ===
    'Academy Map'
  ) {

    appSettings.appName =
      'Mirel Map';

  }


  if (
    appSettings.placeKanaLabel ===
    '店名ふりがな'
  ) {

    appSettings.placeKanaLabel =
      '店名読み';

  }

}


if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initializeMirelEnhancements
  );

} else {

  initializeMirelEnhancements();

}


/* =========================================================
   候補パネルを閉じる
   ========================================================= */

document.addEventListener(
  'click',
  function(event) {

    if (
      !event.target.closest(
        '.mirel-search-select'
      )
    ) {

      document
        .querySelectorAll(
          '.mirel-select-panel'
        )
        .forEach(
          function(panel) {

            panel.classList.remove(
              'show'
            );

          }
        );

    }

  }
);
