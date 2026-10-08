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
    '';


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

      (
        mirelFeatureOn(
          'affiliation'
        )
          ? mirelAffiliationTagsHtml(
              teacher.teacherId
            )
          : ''
      ) +


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

    var affiliationFilter =
      document.getElementById(
        'mirelListAffiliationFilter'
      );

    var affiliationId =
      affiliationFilter
        ? affiliationFilter.value
        : '';

    var query =
      (
        document.getElementById(
          'listSearch'
        ) &&
        document.getElementById(
          'listSearch'
        ).value
      ) ||
      '';

    var rows =
      teachers
        .filter(
          function(teacher) {

            if (
              affiliationId &&
              !mirelTeacherHasAffiliation(
                teacher.teacherId,
                affiliationId
              )
            ) {
              return false;
            }

            if (
              query &&
              !teacherMatches(
                teacher,
                query
              )
            ) {
              return false;
            }

            return true;

          }
        )
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


    var featurePayload =
      {};


    document
      .querySelectorAll(
        '.mirel-feature-setting'
      )
      .forEach(
        function(input) {

          featurePayload[
            input.dataset.feature
          ] =
            input.checked;

        }
      );


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


      var featureResult =
        await runScript(

          'saveMirelFeatureSettings',

          [
            featurePayload
          ]

        );


      mirelFeatureSettings =
        (
          featureResult &&
          featureResult.featureSettings
        ) ||
        mirelFeatureSettings;


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

      mirelRenderFeatureSettings();

      mirelApplyCurrentVisibility();

      renderAll();

      renderJapanMap();

      fillSettingsForm();


      appToast(
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
          '';


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


/* =========================================================
   郵便番号 → 住所
   ZipCloud APIを使用
   ========================================================= */

function mirelNormalizePostalCode(value) {
  var digits =
    String(value || '')
      .replace(/[^0-9]/g, '')
      .slice(0, 7);

  if (digits.length === 7) {
    return (
      digits.slice(0, 3) +
      '-' +
      digits.slice(3)
    );
  }

  return digits;
}


function mirelHandlePostalInput() {

  var input =
    document.getElementById(
      'postalCode'
    );

  if (!input) {
    return;
  }

  var caretAtEnd =
    input.selectionStart ===
    input.value.length;

  var normalized =
    mirelNormalizePostalCode(
      input.value
    );

  input.value =
    normalized;

  if (caretAtEnd) {
    try {
      input.setSelectionRange(
        normalized.length,
        normalized.length
      );
    } catch (e) {}
  }

}


async function mirelAutoLookupPostalCode() {

  var input =
    document.getElementById(
      'postalCode'
    );

  if (!input) {
    return;
  }

  var digits =
    String(
      input.value ||
      ''
    ).replace(
      /[^0-9]/g,
      ''
    );

  if (digits.length !== 7) {
    return;
  }

  await mirelLookupPostalCode(
    true
  );

}


async function mirelLookupPostalCode(
  silent
) {

  var input =
    document.getElementById(
      'postalCode'
    );

  if (!input) {
    return;
  }

  var digits =
    String(
      input.value ||
      ''
    ).replace(
      /[^0-9]/g,
      ''
    );

  if (digits.length !== 7) {

    if (!silent) {
      if (
        typeof mirelShowToast ===
        'function'
      ) {
        mirelShowToast(
          '郵便番号を7桁で入力してください。'
        );
      }
    }

    return;

  }

  input.value =
    mirelNormalizePostalCode(
      digits
    );

  try {

    var response =
      await fetch(
        'https://zipcloud.ibsnet.co.jp/api/search?zipcode=' +
        encodeURIComponent(
          digits
        ),
        {
          cache:
            'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        '郵便番号検索に失敗しました。'
      );
    }

    var data =
      await response.json();

    if (
      !data ||
      Number(data.status) !== 200 ||
      !Array.isArray(
        data.results
      ) ||
      !data.results.length
    ) {

      if (!silent) {
        if (
          typeof mirelShowToast ===
          'function'
        ) {
          mirelShowToast(
            '該当する住所が見つかりませんでした。'
          );
        }
      }

      return;

    }

    var row =
      data.results[0];

    setValue(
      'prefecture',
      row.address1 ||
      ''
    );

    setValue(
      'city',
      row.address2 ||
      ''
    );

    var address1 =
      document.getElementById(
        'address1'
      );

    if (
      address1 &&
      (
        !address1.value ||
        address1.dataset.mirelPostalAuto ===
          '1'
      )
    ) {

      address1.value =
        row.address3 ||
        '';

      address1.dataset.mirelPostalAuto =
        '1';

    }

    if (!silent) {
      if (
        typeof mirelShowToast ===
        'function'
      ) {
        mirelShowToast(
          '郵便番号から住所を入力しました。'
        );
      }
    }

  } catch (e) {

    if (!silent) {
      handleError(
        e
      );
    }

  }

}


/* =========================================================
   2026-10-07 追加修正
   ・交流した場所・種別：検索＋候補＋新規追加
   ・地図下の一覧も3行表示
   ========================================================= */


/* =========================================================
   交流した場所・種別 候補
   ========================================================= */

var MIREL_INTERACTION_TYPE_DEFAULTS = [
  '研修',
  '勉強会',
  'セミナー',
  '講習会',
  'イベント',
  '懇親会',
  '個別相談',
  'Zoom',
  'LINE',
  'Instagram',
  '電話',
  'その他'
];


function mirelInteractionTypeCandidates() {

  var result =
    MIREL_INTERACTION_TYPE_DEFAULTS.slice();


  /*
   * すでに登録済みの交流種別も
   * 自動的に候補へ加える
   */
  teachers.forEach(
    function(teacher) {

      var interactions =
        teacher.interactions ||
        [];


      interactions.forEach(
        function(interaction) {

          var value =
            String(
              interaction.interactionType ||
              ''
            ).trim();


          if (
            value &&
            result.indexOf(value) === -1
          ) {

            result.push(
              value
            );

          }

        }
      );

    }
  );


  /*
   * 先生フォーム内でまだ保存していない
   * 交流記録も候補へ加える
   */
  pendingInteractions.forEach(
    function(interaction) {

      var value =
        String(
          interaction.interactionType ||
          ''
        ).trim();


      if (
        value &&
        result.indexOf(value) === -1
      ) {

        result.push(
          value
        );

      }

    }
  );


  return result;

}


/* =========================================================
   交流種別 独自プルダウン
   ========================================================= */

function mirelInstallInteractionTypeSelect() {

  var input =
    document.getElementById(
      'interactionType'
    );


  if (
    !input ||
    input.dataset.mirelInteractionReady === '1'
  ) {

    return;

  }


  input.dataset.mirelInteractionReady =
    '1';


  /*
   * 古いdatalistは使わない
   */
  input.removeAttribute(
    'list'
  );

  input.autocomplete =
    'off';

  input.placeholder =
    '候補から選択・検索・直接入力';


  var field =
    input.closest(
      '.field'
    );


  if (!field) {
    return;
  }


  field.classList.add(
    'mirel-interaction-select'
  );


  /*
   * 右側のプルダウン矢印
   */
  var arrow =
    document.createElement(
      'button'
    );

  arrow.type =
    'button';

  arrow.className =
    'mirel-interaction-arrow';

  arrow.setAttribute(
    'aria-label',
    '候補を開く'
  );


  /*
   * 候補パネル
   */
  var panel =
    document.createElement(
      'div'
    );

  panel.className =
    'mirel-interaction-panel';


  /*
   * パネル内検索窓
   */
  var search =
    document.createElement(
      'input'
    );

  search.type =
    'search';

  search.className =
    'mirel-interaction-search';

  search.placeholder =
    '候補を検索';


  var list =
    document.createElement(
      'div'
    );

  list.className =
    'mirel-interaction-options';


  panel.appendChild(
    search
  );

  panel.appendChild(
    list
  );


  field.appendChild(
    arrow
  );

  field.appendChild(
    panel
  );


  function renderOptions() {

    var query =
      String(
        search.value ||
        ''
      ).trim();


    var candidates =
      mirelInteractionTypeCandidates();


    var matched =
      candidates.filter(
        function(candidate) {

          return (
            !query ||
            candidate
              .toLowerCase()
              .indexOf(
                query.toLowerCase()
              ) !== -1
          );

        }
      );


    list.innerHTML =
      '';


    matched.forEach(
      function(candidate) {

        var button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'mirel-interaction-option';

        button.textContent =
          candidate;


        button.onclick =
          function(event) {

            event.preventDefault();
            event.stopPropagation();


            input.value =
              candidate;


            panel.classList.remove(
              'show'
            );

          };


        list.appendChild(
          button
        );

      }
    );


    /*
     * 入力した言葉が既存候補になければ
     * 新規追加候補を表示
     */
    if (
      query &&
      candidates.indexOf(query) === -1
    ) {

      var add =
        document.createElement(
          'button'
        );

      add.type =
        'button';

      add.className =
        'mirel-interaction-add';

      add.innerHTML =

        '<span class="mirel-add-mark">＋</span>' +

        '<span>「' +

        escapeHtml(
          query
        ) +

        '」を新規追加</span>';


      add.onclick =
        function(event) {

          event.preventDefault();
          event.stopPropagation();


          input.value =
            query;


          panel.classList.remove(
            'show'
          );

        };


      list.appendChild(
        add
      );

    }


    if (
      !matched.length &&
      !query
    ) {

      var empty =
        document.createElement(
          'div'
        );

      empty.className =
        'mirel-interaction-empty';

      empty.textContent =
        '候補はありません。';


      list.appendChild(
        empty
      );

    }

  }


  function openPanel() {

    search.value =
      '';

    renderOptions();


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

      search.value =
        input.value;

      renderOptions();

      panel.classList.add(
        'show'
      );

    }
  );


  search.addEventListener(
    'input',
    function() {

      renderOptions();

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
   交流フォームを開くたび候補UIを有効化
   ========================================================= */

var mirelOriginalOpenInteractionForm =
  openInteractionForm;


openInteractionForm =
  function(interactionId) {

    mirelOriginalOpenInteractionForm(
      interactionId
    );


    mirelInstallInteractionTypeSelect();

  };


var mirelOriginalOpenTeacherFormInteraction =
  openTeacherFormInteraction;


openTeacherFormInteraction =
  function(index) {

    mirelOriginalOpenTeacherFormInteraction(
      index
    );


    mirelInstallInteractionTypeSelect();

  };


/* =========================================================
   地図下の先生一覧
   ・県未選択＋検索なしでは表示しない
   ・県選択時は選択県のみ表示
   ・検索時は検索結果を表示
   ・一覧画面と同じ3行表示
   ========================================================= */

renderMapTeacherPreview =
  function() {

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


    /*
     * 県未選択
     * ＋
     * 検索なし
     *
     * → 先生一覧を表示しない
     */
    if (
      !selectedPrefecture &&
      !query
    ) {

      mapSide.innerHTML =
        '';

      mapSide.style.display =
        'none';

      return;

    }


    /*
     * 県選択または検索時のみ表示
     */
    mapSide.style.display =
      '';


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


    /*
     * 地域順に並べる
     */
    list.sort(
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
        '<div class="teacher-list mirel-map-teacher-list">';


      for (
        var j = 0;
        j < list.length;
        j++
      ) {

        html +=
          mirelTeacherListCard(
            list[j]
          );

      }


      html +=
        '</div>';

    }


    mapSide.innerHTML =
      html;

  };


/* =========================================================
   初回にも交流種別UIを準備
   ========================================================= */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    mirelInstallInteractionTypeSelect
  );

} else {

  mirelInstallInteractionTypeSelect();

}


/* =========================================================
   外側タップで交流候補を閉じる
   ========================================================= */

document.addEventListener(
  'click',
  function(event) {

    if (
      !event.target.closest(
        '.mirel-interaction-select'
      )
    ) {

      var panel =
        document.querySelector(
          '.mirel-interaction-panel'
        );


      if (panel) {

        panel.classList.remove(
          'show'
        );

      }

    }

  }
);


/* =========================================================
   地図の都道府県選択を解除できるようにする
   ========================================================= */


/* 同じ県をもう一度押したら選択解除 */
var mirelOriginalSelectPrefecture =
  selectPrefecture;


selectPrefecture =
  function(pref) {

    if (
      selectedPrefecture ===
      pref
    ) {

      selectedPrefecture =
        '';

      selectedTeacherId =
        '';

      updateSelectedPrefHeading();

      renderPrefList();

      renderMapTeacherPreview();

      renderJapanMap();

      return;

    }


    mirelOriginalSelectPrefecture(
      pref
    );

  };


/* 所在地不明も再タップで解除 */
var mirelOriginalSelectUnknown =
  selectUnknown;


selectUnknown =
  function() {

    if (
      selectedPrefecture ===
      '__UNKNOWN__'
    ) {

      selectedPrefecture =
        '';

      selectedTeacherId =
        '';

      updateSelectedPrefHeading();

      renderPrefList();

      renderMapTeacherPreview();

      renderJapanMap();

      return;

    }


    mirelOriginalSelectUnknown();

  };


/* 地図ボタンを押したら初期状態へ戻す */
function mirelResetMapSelection() {

  selectedPrefecture =
    '';

  selectedTeacherId =
    '';

  updateSelectedPrefHeading();

  renderPrefList();

  renderMapTeacherPreview();

  renderJapanMap();

}


/* 下部の地図ボタンだけ動作を上書き */
var mirelNavMap =
  document.getElementById(
    'navMap'
  );


if (
  mirelNavMap
) {

  mirelNavMap.onclick =
    function() {

      showPage(
        'map'
      );

      mirelResetMapSelection();

      window.scrollTo(
        0,
        0
      );

    };

}
/* =========================================================
   2026-10-07
   住所連動・年齢入力・保存高速化
   ========================================================= */


/* =========================================================
   市区町村を選び直した時
   自動セットした町名も連動更新
   ========================================================= */

mirelRenderCityResults =
  function(
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

              var address1 =
                document.getElementById(
                  'address1'
                );


              var previousAutoTown =
                address1
                  ? (
                      address1.dataset
                        .mirelAutoTown ||
                      ''
                    )
                  : '';


              var currentAddress =
                address1
                  ? address1.value
                  : '';


              setValue(
                'city',
                row.city
              );


              setValue(
                'prefecture',
                row.prefecture
              );


              if (
                address1
              ) {

                /*
                 * 町名候補を選んだ場合
                 * 新しい町名へ置き換える
                 */
                if (
                  row.town
                ) {

                  address1.value =
                    row.town;


                  address1.dataset
                    .mirelAutoTown =
                    row.town;

                /*
                 * 市区町村だけを選び直した場合、
                 * 前回アプリが自動入力した町名なら消す
                 */
                } else if (
                  previousAutoTown &&
                  currentAddress ===
                    previousAutoTown
                ) {

                  address1.value =
                    '';


                  delete address1.dataset
                    .mirelAutoTown;

                }

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


    if (
      message
    ) {

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

  };


/* =========================================================
   年齢：0未満を禁止
   ========================================================= */

function mirelProtectAgeInput(
  input
) {

  if (
    !input ||
    input.dataset.mirelAgeReady ===
      '1'
  ) {
    return;
  }


  input.dataset.mirelAgeReady =
    '1';


  input.min =
    '0';


  input.addEventListener(
    'change',
    function() {

      if (
        this.value !== '' &&
        Number(
          this.value
        ) < 0
      ) {

        this.value =
          '0';

      }

    }
  );

}


/* 先生の年齢 */
mirelProtectAgeInput(
  document.getElementById(
    'ageManual'
  )
);


/* =========================================================
   子ども行追加時も
   年齢0未満禁止＋生年月日候補
   ========================================================= */

var mirelOriginalEnhancedAddChildRow =
  addChildRow;


addChildRow =
  function(child) {

    mirelOriginalEnhancedAddChildRow(
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


    mirelProtectAgeInput(
      row.querySelector(
        '.child-age'
      )
    );


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
        '生年月日・学年から自動計算。手入力も可';

    }

  };


/* =========================================================
   保存用：子ども情報をまとめて取得
   ========================================================= */

function mirelCollectChildren() {

  var rows =
    document.querySelectorAll(
      '.child-edit'
    );


  var result =
    [];


  rows.forEach(
    function(row) {

      result.push({

        childId:
          row.getAttribute(
            'data-child-id'
          ) ||
          '',

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

      });

    }
  );


  return result;

}


/* =========================================================
   関連情報の変更判定
   基本情報だけの保存時に、子ども・SNS・交流履歴を
   毎回すべて書き直さないための比較用
   ========================================================= */

function mirelComparableChildren(rows) {
  return (rows || []).map(function(row) {
    return {
      childId: String(row.childId || ''),
      name: String(row.name || ''),
      kana: String(row.kana || ''),
      nickname: String(row.nickname || ''),
      gender: String(row.gender || ''),
      grade: String(row.grade || ''),
      birthYear: String(row.birthYear || ''),
      birthMonth: String(row.birthMonth || ''),
      birthDay: String(row.birthDay || ''),
      ageManual: String(row.ageManual || ''),
      memo: String(row.memo || '')
    };
  });
}

function mirelComparableLinks(rows) {
  return (rows || []).map(function(row) {
    return {
      linkId: String(row.linkId || ''),
      type: String(row.type || ''),
      displayName: String(row.displayName || ''),
      value: String(row.value || '')
    };
  });
}

function mirelComparableInteractions(rows) {
  return (rows || []).map(function(row) {
    return {
      interactionId: String(row.interactionId || ''),
      date: String(row.date || ''),
      interactionType: String(row.interactionType || ''),
      memo: String(row.memo || '')
    };
  });
}

function mirelSameComparable(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}


/* =========================================================
   保存を1回のAPI通信へまとめる
   ========================================================= */

saveTeacherForm =
  async function() {

    var teacherPayload = {

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
        firstInstagramAccountFromPendingLinks(),

      memo:
        valueOf(
          'memo'
        )

    };


    var currentTeacher =
      teacherPayload.teacherId
        ? findTeacher(
            teacherPayload.teacherId
          )
        : null;

    var collectedChildren =
      mirelCollectChildren();

    var currentLinks =
      pendingLinks.slice();

    var currentInteractions =
      pendingInteractions.slice();

    var childrenChanged =
      !currentTeacher ||
      !mirelSameComparable(
        mirelComparableChildren(
          collectedChildren
        ),
        mirelComparableChildren(
          currentTeacher.children ||
          []
        )
      );

    var linksChanged =
      deletedLinkIds.length > 0 ||
      !currentTeacher ||
      !mirelSameComparable(
        mirelComparableLinks(
          currentLinks
        ),
        mirelComparableLinks(
          currentTeacher.links ||
          []
        )
      );

    var interactionsChanged =
      deletedInteractionIds.length > 0 ||
      !currentTeacher ||
      !mirelSameComparable(
        mirelComparableInteractions(
          currentInteractions
        ),
        mirelComparableInteractions(
          currentTeacher.interactions ||
          []
        )
      );

    var bundle = {

      teacher:
        teacherPayload,

      children:
        collectedChildren,

      childrenChanged:
        childrenChanged,

      links:
        currentLinks,

      linksChanged:
        linksChanged,

      deletedLinkIds:
        deletedLinkIds.slice(),

      interactions:
        currentInteractions,

      interactionsChanged:
        interactionsChanged,

      deletedInteractionIds:
        deletedInteractionIds.slice(),

      extras: {

        grade:
          valueOf(
            'mirelGrade'
          ),

        affiliationIds:
          mirelSelectedAffiliationIds()

      }

    };


    setLoading(
      true
    );


    try {

      var result =
        await runScript(

          'saveTeacherBundle',

          [
            bundle
          ]

        );


      if (
        result &&
        result.teacher
      ) {

        var replaced =
          false;

        for (
          var teacherIndex = 0;
          teacherIndex < teachers.length;
          teacherIndex++
        ) {

          if (
            String(
              teachers[teacherIndex].teacherId ||
              ''
            ) ===
            String(
              result.teacher.teacherId ||
              ''
            )
          ) {

            teachers[teacherIndex] =
              result.teacher;

            replaced =
              true;

            break;

          }

        }

        if (!replaced) {
          teachers.push(
            result.teacher
          );
        }

      } else if (
        result &&
        result.teachers
      ) {

        teachers =
          result.teachers;

      }


      var savedTeacherId =
        result &&
        result.teacherId
          ? result.teacherId
          : '';


      if (
        result &&
        result.extra
      ) {

        mirelAffiliations =
          result.extra.affiliations ||
          mirelAffiliations;

        mirelTeacherAffiliations =
          result.extra.teacherAffiliations ||
          mirelTeacherAffiliations;

        mirelProfiles =
          result.extra.profiles ||
          mirelProfiles;

        mirelFeatureSettings =
          result.extra.featureSettings ||
          mirelFeatureSettings;

      }


      mirelApplyProfileDerivedValues();

      mirelRefreshAffiliationFilters();


      closeTeacherForm();


      renderAll();

      renderJapanMap();


      if (
        savedTeacherId
      ) {

        var teacher =
          findTeacher(
            savedTeacherId
          );


        if (
          teacher
        ) {

          openTeacherDetail(
            savedTeacherId
          );

        }

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

  };

/* =========================================================
   2026-10-07
   iPhone 日本地図タップ判定 強化
   ・小さい県を押しやすくする
   ・ピンチ拡大後も座標ズレしにくくする
   ・canvasの疑似mouse判定に依存しない
   ========================================================= */

(function () {

  var mirelOriginalRenderJapanMapForTouch =
    renderJapanMap;


  renderJapanMap =
    function () {

      mirelOriginalRenderJapanMapForTouch
        .apply(
          this,
          arguments
        );


      if (
        window.innerWidth > 560
      ) {
        return;
      }


      requestAnimationFrame(
        function () {

          mirelInstallMapHitAssist();

        }
      );

    };


  function mirelHitColor(code) {

    /*
     * 県ごとに重複しない色を割り当てる。
     * 表示用ではなく判定専用。
     */
    var r =
      code;

    var g =
      37;

    var b =
      91;


    return (
      '#' +
      r.toString(16)
        .padStart(2, '0') +
      g.toString(16)
        .padStart(2, '0') +
      b.toString(16)
        .padStart(2, '0')
    );

  }


  function mirelBuildMapHitCanvas(
    visibleCanvas
  ) {

    var old =
      document.getElementById(
        'mirelMapHitHost'
      );


    if (old) {
      old.remove();
    }


    var host =
      document.createElement(
        'div'
      );


    host.id =
      'mirelMapHitHost';


    host.style.position =
      'fixed';

    host.style.left =
      '-10000px';

    host.style.top =
      '-10000px';

    host.style.pointerEvents =
      'none';

    host.style.zIndex =
      '-1';


    document.body.appendChild(
      host
    );


    var areas =
      [];


    for (
      var i = 0;
      i < prefectures.length;
      i++
    ) {

      var code =
        i + 1;

      var color =
        mirelHitColor(
          code
        );


      areas.push({

        code:
          code,

        color:
          color,

        hoverColor:
          color

      });

    }


    var hitWidth =
      Math.max(
        600,
        Number(
          visibleCanvas.width
        ) ||
        600
      );


    try {

      new jpmap.japanMap(

        host,

        {

          areas:
            areas,

          width:
            hitWidth,

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
            function () {}

        }

      );

    } catch (e) {

      return null;

    }


    return host.querySelector(
      'canvas'
    );

  }


  function mirelReadHitPrefecture(
    hitCanvas,
    visibleCanvas,
    clientX,
    clientY
  ) {

    if (
      !hitCanvas ||
      !visibleCanvas
    ) {
      return '';
    }


    var rect =
      visibleCanvas
        .getBoundingClientRect();


    if (
      !rect.width ||
      !rect.height
    ) {
      return '';
    }


    var normalizedX =
      (
        clientX -
        rect.left
      ) /
      rect.width;


    var normalizedY =
      (
        clientY -
        rect.top
      ) /
      rect.height;


    if (
      normalizedX < 0 ||
      normalizedX > 1 ||
      normalizedY < 0 ||
      normalizedY > 1
    ) {
      return '';
    }


    var centerX =
      normalizedX *
      hitCanvas.width;


    var centerY =
      normalizedY *
      hitCanvas.height;


    var context =
      hitCanvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );


    if (!context) {
      return '';
    }


    var colorToPref =
      {};


    for (
      var i = 0;
      i < prefectures.length;
      i++
    ) {

      var code =
        i + 1;


      colorToPref[
        code +
        ',37,91'
      ] =
        prefectures[i];

    }


    function readPref(
      x,
      y
    ) {

      x =
        Math.round(x);

      y =
        Math.round(y);


      if (
        x < 0 ||
        y < 0 ||
        x >= hitCanvas.width ||
        y >= hitCanvas.height
      ) {
        return '';
      }


      var pixel;

      try {

        pixel =
          context.getImageData(
            x,
            y,
            1,
            1
          ).data;

      } catch (e) {

        return '';

      }


      /*
       * 塗りつぶし中央なら完全一致。
       */
      var exact =
        colorToPref[
          pixel[0] +
          ',' +
          pixel[1] +
          ',' +
          pixel[2]
        ];


      if (exact) {
        return exact;
      }


      /*
       * アンチエイリアスされた境界対策。
       * G/Bが近い場合はRから県コードを推定。
       */
      if (
        Math.abs(
          pixel[1] - 37
        ) <= 5 &&
        Math.abs(
          pixel[2] - 91
        ) <= 5
      ) {

        var estimatedCode =
          Math.round(
            pixel[0]
          );


        if (
          estimatedCode >= 1 &&
          estimatedCode <=
            prefectures.length
        ) {

          return prefectures[
            estimatedCode - 1
          ];

        }

      }


      return '';

    }


    /*
     * まず指の中心を判定
     */
    var pref =
      readPref(
        centerX,
        centerY
      );


    if (pref) {
      return pref;
    }


    /*
     * 小さい県・境界部分用。
     * 見た目で約22px以内の最も近い県を探す。
     */
    var scaleX =
      hitCanvas.width /
      rect.width;


    var scaleY =
      hitCanvas.height /
      rect.height;


    var maxRadiusCss =
      22;


    for (
      var radiusCss = 3;
      radiusCss <= maxRadiusCss;
      radiusCss += 3
    ) {

      var rx =
        radiusCss *
        scaleX;


      var ry =
        radiusCss *
        scaleY;


      var points = [

        [0, -ry],
        [rx, 0],
        [0, ry],
        [-rx, 0],

        [rx * 0.7, -ry * 0.7],
        [rx * 0.7, ry * 0.7],
        [-rx * 0.7, ry * 0.7],
        [-rx * 0.7, -ry * 0.7]

      ];


      for (
        var p = 0;
        p < points.length;
        p++
      ) {

        pref =
          readPref(

            centerX +
              points[p][0],

            centerY +
              points[p][1]

          );


        if (pref) {
          return pref;
        }

      }

    }


    return '';

  }


  function mirelInstallMapHitAssist() {

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
      canvas.dataset
        .mirelHitAssistReady ===
      '1'
    ) {
      return;
    }


    canvas.dataset
      .mirelHitAssistReady =
      '1';


    var hitCanvas =
      mirelBuildMapHitCanvas(
        canvas
      );


    if (!hitCanvas) {
      return;
    }


    var startX =
      0;

    var startY =
      0;

    var moved =
      false;

    var multiTouch =
      false;


    canvas.addEventListener(

      'touchstart',

      function (event) {

        if (
          event.touches.length !==
          1
        ) {

          multiTouch =
            true;

          moved =
            true;

          return;
        }


        multiTouch =
          false;


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
        passive:
          true,

        capture:
          true
      }

    );


    canvas.addEventListener(

      'touchmove',

      function (event) {

        if (
          event.touches.length !==
          1
        ) {

          multiTouch =
            true;

          moved =
            true;

          return;
        }


        var touch =
          event.touches[0];


        var diffX =
          Math.abs(
            touch.clientX -
            startX
          );


        var diffY =
          Math.abs(
            touch.clientY -
            startY
          );


        /*
         * 普通のスクロール操作は
         * タップ扱いしない。
         */
        if (
          diffX > 18 ||
          diffY > 18
        ) {

          moved =
            true;

        }

      },

      {
        passive:
          true,

        capture:
          true
      }

    );


    canvas.addEventListener(

      'touchend',

      function (event) {

        /*
         * ピンチズームやスクロールは
         * そのままブラウザへ渡す。
         */
        if (
          multiTouch ||
          moved
        ) {
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


        var pref =
          mirelReadHitPrefecture(

            hitCanvas,
            canvas,

            touch.clientX,
            touch.clientY

          );


        if (!pref) {
          return;
        }


        /*
         * app.js側の古い疑似mousedown処理を
         * このタップだけ止める。
         */
        event.preventDefault();

        event.stopImmediatePropagation();


        selectPrefecture(
          pref
        );

      },

      {
        passive:
          false,

        capture:
          true
      }

    );

  }

})();

/* =========================================================
   2026-10-07
   詳細画面・子どもフォーム整理版
   ・交流履歴 編集／削除
   ・子ども情報 編集／削除
   ・操作ボタン統一
   ・交流履歴 日付降順／月別タブ／折りたたみ
   ・子ども情報 2人目以降折りたたみ
   ・子ども追加は空フォームのみ
   ・生年月日検索UIを共通化
   ・年齢プレビュー＋手入力優先
   ・詳細画面は常に上部から表示
   ========================================================= */


/* =========================================================
   年齢プレビュー
   ========================================================= */

function mirelCalcAgePreview(
  yearValue,
  monthValue,
  dayValue
) {

  var year =
    Number(
      yearValue
    );

  var month =
    Number(
      monthValue
    );

  var day =
    Number(
      dayValue
    );


  if (
    !year ||
    year < 1900
  ) {
    return '';
  }


  var today =
    new Date();


  var age =
    today.getFullYear() -
    year;


  if (
    month >= 1 &&
    month <= 12
  ) {

    var currentMonth =
      today.getMonth() + 1;

    var currentDay =
      today.getDate();


    if (
      currentMonth < month ||
      (
        currentMonth === month &&
        day >= 1 &&
        day <= 31 &&
        currentDay < day
      )
    ) {

      age--;

    }

  }


  return Math.max(
    0,
    age
  );

}


function mirelBindAgePreview(
  yearInput,
  monthInput,
  dayInput,
  ageInput,
  gradeInput
) {

  if (
    !yearInput ||
    !monthInput ||
    !dayInput ||
    !ageInput
  ) {
    return;
  }


  function updatePreview() {

    if (
      ageInput.dataset
        .mirelManualAge === '1'
    ) {
      return;
    }


    var age =
      mirelCalcAgePreview(
        yearInput.value,
        monthInput.value,
        dayInput.value
      );


    ageInput.dataset
      .mirelAutoWriting = '1';


    if (
      age !== ''
    ) {

      ageInput.value =
        age;

      ageInput.placeholder =
        '生年月日入力時は自動計算。手入力も可';

    } else {

      ageInput.value =
        '';

      var gradeValue =
        gradeInput
          ? gradeInput.value
          : '';

      var approx =
        gradeValue
          ? mirelGradeAgeDisplay(
              mirelGradeDisplay(
                gradeValue,
                mirelCurrentFiscalYear()
              )
            )
          : '';

      ageInput.placeholder =
        approx
          ? '目安：' + approx + '（手入力可）'
          : '生年月日・学年から目安表示。手入力も可';

    }


    ageInput.dataset
      .mirelAutoWriting = '0';

  }


  if (
    ageInput.dataset
      .mirelAgePreviewReady !== '1'
  ) {

    ageInput.dataset
      .mirelAgePreviewReady = '1';


    ageInput.addEventListener(
      'input',
      function() {

        if (
          ageInput.dataset
            .mirelAutoWriting === '1'
        ) {
          return;
        }


        if (
          ageInput.value === ''
        ) {

          ageInput.dataset
            .mirelManualAge = '0';

          updatePreview();

          return;

        }


        ageInput.dataset
          .mirelManualAge = '1';

      }
    );


    [
      yearInput,
      monthInput,
      dayInput
    ].forEach(
      function(input) {

        input.addEventListener(
          'input',
          updatePreview
        );

        input.addEventListener(
          'change',
          updatePreview
        );


        var field =
          input.closest(
            '.field'
          );


        if (field) {

          field.addEventListener(
            'click',
            function(event) {

              if (
                event.target.closest(
                  '.mirel-select-option'
                )
              ) {

                setTimeout(
                  updatePreview,
                  0
                );

              }

            },
            true
          );

        }

      }
    );

  }


  if (
    gradeInput &&
    gradeInput.dataset.mirelAgeGradeReady !== '1'
  ) {

    gradeInput.dataset.mirelAgeGradeReady =
      '1';

    gradeInput.addEventListener(
      'change',
      updatePreview
    );

    gradeInput.addEventListener(
      'input',
      updatePreview
    );

  }


  ageInput.placeholder =
    '生年月日・学年から目安表示。手入力も可';


  ageInput.dataset
    .mirelManualAge =
      ageInput.value !== ''
        ? '1'
        : '0';


  if (
    ageInput.value === ''
  ) {
    updatePreview();
  }

}


/* =========================================================
   先生フォームにも年齢プレビューを適用
   ========================================================= */

var mirelOriginalOpenTeacherFormForAge =
  openTeacherForm;


openTeacherForm =
  function(id) {

    mirelOriginalOpenTeacherFormForAge(
      id
    );


    setTimeout(
      function() {

        mirelBindAgePreview(

          document.getElementById(
            'birthYear'
          ),

          document.getElementById(
            'birthMonth'
          ),

          document.getElementById(
            'birthDay'
          ),

          document.getElementById(
            'ageManual'
          ),

          document.getElementById(
            'mirelGrade'
          )

        );

      },
      0
    );

  };


/* =========================================================
   交流履歴カード
   ========================================================= */

renderInteractionCard =
  function(interaction) {

    var dateText =
      interaction.date ||
      '日付未登録';

    var typeText =
      interaction.interactionType ||
      '種別未登録';


    var html =

      '<div class="child mirel-interaction-row">' +

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

            '<button type="button" class="secondary mirel-action-mini" onclick="openInteractionForm(\'' +

              escapeJs(
                interaction.interactionId
              ) +

            '\')">編集</button>' +

            '<button type="button" class="detail-delete-button mirel-action-mini" onclick="deleteInteractionAction(\'' +

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

  };


/* =========================================================
   交流履歴 削除確認
   ========================================================= */

deleteInteractionAction =
  async function(
    interactionId
  ) {

    var interaction =
      findInteraction(
        interactionId
      );


    var dateText =
      interaction &&
      interaction.date
        ? interaction.date
        : '日付未登録';


    if (
      !(await appConfirm(
        '交流記録を削除しますか？',
        dateText +
        'の交流記録を削除します。\n' +
        'この操作は元に戻せません。'
      ))
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

  };


/* =========================================================
   子ども情報を探す
   ========================================================= */

function mirelFindDetailChild(
  childId
) {

  var teacher =
    findTeacher(
      selectedTeacherId
    );


  if (!teacher) {
    return null;
  }


  var children =
    teacher.children ||
    [];


  for (
    var i = 0;
    i < children.length;
    i++
  ) {

    if (
      String(
        children[i].childId ||
        ''
      ) ===
      String(
        childId ||
        ''
      )
    ) {

      return children[i];

    }

  }


  return null;

}


/* =========================================================
   子ども専用 編集／追加モーダル
   ========================================================= */

function mirelEnsureChildEditModal() {

  var existing =
    document.getElementById(
      'mirelChildEditModal'
    );


  if (existing) {
    return existing;
  }


  var modal =
    document.createElement(
      'div'
    );


  modal.id =
    'mirelChildEditModal';

  modal.className =
    'modal-bg';


  modal.innerHTML =

    '<div class="modal">' +

      '<div class="modal-head">' +

        '<div class="modal-title">' +
          '子ども情報を編集' +
        '</div>' +

        '<button type="button" class="close" onclick="mirelCloseChildEditor()">×</button>' +

      '</div>' +


      '<input type="hidden" id="mirelChildId">' +


      '<div class="grid2">' +

        '<div class="field">' +
          '<label>名前</label>' +
          '<input id="mirelChildName">' +
        '</div>' +

        '<div class="field">' +
          '<label>ふりがな</label>' +
          '<input id="mirelChildKana">' +
        '</div>' +

      '</div>' +


      '<div class="grid2">' +

        '<div class="field">' +
          '<label>呼び名</label>' +
          '<input id="mirelChildNickname">' +
        '</div>' +

        '<div class="field">' +
          '<label>性別</label>' +
          '<select id="mirelChildGender">' +
            '<option value="">未設定</option>' +
            '<option value="女">女</option>' +
            '<option value="男">男</option>' +
          '</select>' +
        '</div>' +

      '</div>' +


      '<div class="field">' +
        '<label>学年</label>' +
        '<select id="mirelChildGrade"></select>' +
      '</div>' +


      '<div class="field">' +
        '<label>生まれ年</label>' +
        '<input id="mirelChildBirthYear" type="number">' +
      '</div>' +


      '<div class="field">' +
        '<label>誕生月</label>' +
        '<input id="mirelChildBirthMonth" type="number" min="1" max="12">' +
      '</div>' +


      '<div class="field">' +
        '<label>誕生日</label>' +
        '<input id="mirelChildBirthDay" type="number" min="1" max="31">' +
      '</div>' +


      '<div class="field">' +
        '<label>年齢</label>' +
        '<input id="mirelChildAge" type="number" min="0" placeholder="生年月日入力時は自動計算。手入力も可">' +
      '</div>' +


      '<div class="field">' +
        '<label>メモ</label>' +
        '<textarea id="mirelChildMemo"></textarea>' +
      '</div>' +


      '<div class="form-actions">' +

        '<button type="button" class="secondary" onclick="mirelCloseChildEditor()">キャンセル</button>' +

        '<button type="button" class="primary" onclick="mirelSaveChildEditor()">保存</button>' +

      '</div>' +

    '</div>';


  document.body.appendChild(
    modal
  );


  var grade =
    document.getElementById(
      'mirelChildGrade'
    );


  gradeOptions.forEach(
    function(value) {

      var option =
        document.createElement(
          'option'
        );

      option.value =
        value;

      option.textContent =
        value ||
        '未設定';

      grade.appendChild(
        option
      );

    }
  );


  mirelAttachSearchSelect(
    document.getElementById(
      'mirelChildBirthYear'
    ),
    'year'
  );

  mirelAttachSearchSelect(
    document.getElementById(
      'mirelChildBirthMonth'
    ),
    'month'
  );

  mirelAttachSearchSelect(
    document.getElementById(
      'mirelChildBirthDay'
    ),
    'day'
  );


  mirelProtectAgeInput(
    document.getElementById(
      'mirelChildAge'
    )
  );


  mirelBindAgePreview(

    document.getElementById(
      'mirelChildBirthYear'
    ),

    document.getElementById(
      'mirelChildBirthMonth'
    ),

    document.getElementById(
      'mirelChildBirthDay'
    ),

    document.getElementById(
      'mirelChildAge'
    ),

    document.getElementById(
      'mirelChildGrade'
    )

  );


  return modal;

}


function mirelOpenChildEditor(
  childId
) {

  var child =
    childId
      ? mirelFindDetailChild(
          childId
        )
      : null;


  if (
    childId &&
    !child
  ) {
    return;
  }


  var modal =
    mirelEnsureChildEditModal();


  var title =
    modal.querySelector(
      '.modal-title'
    );


  if (title) {

    title.textContent =
      child
        ? '子ども情報を編集'
        : '子ども情報を追加';

  }


  document.getElementById(
    'mirelChildId'
  ).value =
    child
      ? child.childId || ''
      : '';

  document.getElementById(
    'mirelChildName'
  ).value =
    child
      ? child.name || ''
      : '';

  document.getElementById(
    'mirelChildKana'
  ).value =
    child
      ? child.kana || ''
      : '';

  document.getElementById(
    'mirelChildNickname'
  ).value =
    child
      ? child.nickname || ''
      : '';

  document.getElementById(
    'mirelChildGender'
  ).value =
    child
      ? child.gender || ''
      : '';

  document.getElementById(
    'mirelChildGrade'
  ).value =
    child
      ? child.grade || ''
      : '';

  document.getElementById(
    'mirelChildBirthYear'
  ).value =
    child
      ? child.birthYear || ''
      : '';

  document.getElementById(
    'mirelChildBirthMonth'
  ).value =
    child
      ? child.birthMonth || ''
      : '';

  document.getElementById(
    'mirelChildBirthDay'
  ).value =
    child
      ? child.birthDay || ''
      : '';

  document.getElementById(
    'mirelChildAge'
  ).value =
    child
      ? child.ageManual || ''
      : '';

  document.getElementById(
    'mirelChildMemo'
  ).value =
    child
      ? child.memo || ''
      : '';


  var ageInput =
    document.getElementById(
      'mirelChildAge'
    );


  ageInput.dataset
    .mirelManualAge =
      ageInput.value !== ''
        ? '1'
        : '0';


  if (
    ageInput.value === ''
  ) {

    ageInput.dispatchEvent(
      new Event(
        'input',
        {
          bubbles: true
        }
      )
    );

  }


  modal.classList.add(
    'show'
  );

}


function mirelCloseChildEditor() {

  var modal =
    document.getElementById(
      'mirelChildEditModal'
    );


  if (modal) {

    modal.classList.remove(
      'show'
    );

  }

}


/* =========================================================
   子ども 新規追加
   既存の子どもフォームは開かない
   ========================================================= */

openTeacherFormForNewChild =
  function(
    teacherId
  ) {

    selectedTeacherId =
      teacherId;

    mirelOpenChildEditor(
      ''
    );

  };


/* =========================================================
   詳細画面を最新状態へ更新
   ========================================================= */

async function mirelRefreshDetailTeacher() {

  var teacherId =
    selectedTeacherId;


  teachers =
    (
      await runScript(
        'getTeachers'
      )
    ) ||
    [];


  renderAll();

  renderJapanMap();


  if (
    teacherId &&
    findTeacher(
      teacherId
    )
  ) {

    openTeacherDetail(
      teacherId
    );

  }

}


/* =========================================================
   子ども 保存／削除
   ========================================================= */

async function mirelSaveChildEditor() {

  if (
    !selectedTeacherId
  ) {
    return;
  }


  var payload = {

    childId:
      document.getElementById(
        'mirelChildId'
      ).value,

    teacherId:
      selectedTeacherId,

    name:
      document.getElementById(
        'mirelChildName'
      ).value,

    kana:
      document.getElementById(
        'mirelChildKana'
      ).value,

    nickname:
      document.getElementById(
        'mirelChildNickname'
      ).value,

    gender:
      document.getElementById(
        'mirelChildGender'
      ).value,

    grade:
      document.getElementById(
        'mirelChildGrade'
      ).value,

    birthYear:
      document.getElementById(
        'mirelChildBirthYear'
      ).value,

    birthMonth:
      document.getElementById(
        'mirelChildBirthMonth'
      ).value,

    birthDay:
      document.getElementById(
        'mirelChildBirthDay'
      ).value,

    ageManual:
      document.getElementById(
        'mirelChildAge'
      ).value,

    memo:
      document.getElementById(
        'mirelChildMemo'
      ).value

  };


  setLoading(
    true
  );


  try {

    await runScript(
      'saveChild',
      [
        payload
      ]
    );


    mirelCloseChildEditor();


    await mirelRefreshDetailTeacher();


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


async function mirelDeleteChildFromDetail(
  childId
) {

  var child =
    mirelFindDetailChild(
      childId
    );


  var childName =
    child
      ? (
          child.name ||
          child.nickname ||
          '名前未登録'
        )
      : '名前未登録';


  if (
    !(await appConfirm(
      '子ども情報を削除しますか？',
      childName +
      'の子ども情報を削除します。\n' +
      'この操作は元に戻せません。'
    ))
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


    await mirelRefreshDetailTeacher();


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
   子どもカード 編集／削除
   ========================================================= */

function mirelInstallChildDetailActions(
  teacher
) {

  var detail =
    document.getElementById(
      'detailContent'
    );


  if (!detail) {
    return;
  }


  var cards =
    detail.querySelectorAll(
      '.card'
    );


  var childCard =
    null;


  for (
    var i = 0;
    i < cards.length;
    i++
  ) {

    var title =
      cards[i].querySelector(
        '.section-title'
      );


    if (
      title &&
      title.textContent
        .trim()
        .indexOf(
          '子ども情報'
        ) === 0
    ) {

      childCard =
        cards[i];

      break;

    }

  }


  if (!childCard) {
    return;
  }


  var rows =
    childCard.querySelectorAll(
      ':scope > .child'
    );


  var children =
    teacher.children ||
    [];


  for (
    var index = 0;
    index < rows.length;
    index++
  ) {

    var row =
      rows[index];

    var child =
      children[index];


    if (
      !child ||
      row.dataset
        .mirelActionsReady === '1'
    ) {
      continue;
    }


    row.dataset
      .mirelActionsReady = '1';


    var name =
      row.querySelector(
        '.child-name-text'
      );


    if (!name) {
      continue;
    }


    var head =
      document.createElement(
        'div'
      );


    head.className =
      'detail-head';


    row.insertBefore(
      head,
      name
    );


    head.appendChild(
      name
    );


    var actions =
      document.createElement(
        'div'
      );


    actions.className =
      'detail-head-actions';


    actions.innerHTML =

      '<button type="button" class="secondary mirel-action-mini" onclick="mirelOpenChildEditor(\'' +

        escapeJs(
          child.childId
        ) +

      '\')">編集</button>' +

      '<button type="button" class="detail-delete-button mirel-action-mini" onclick="mirelDeleteChildFromDetail(\'' +

        escapeJs(
          child.childId
        ) +

      '\')">削除</button>';


    head.appendChild(
      actions
    );

  }

}


/* =========================================================
   交流履歴 月別・折りたたみ
   ========================================================= */

function mirelHistoryMonthKey(
  interaction
) {

  var date =
    String(
      interaction.date ||
      ''
    );


  if (
    /^\d{4}-\d{2}/.test(
      date
    )
  ) {

    return date.slice(
      0,
      7
    );

  }


  return '__NONE__';

}


function mirelHistoryMonthLabel(
  key
) {

  if (
    key === '__NONE__'
  ) {
    return '日付未設定';
  }


  var parts =
    key.split(
      '-'
    );


  return (
    parts[0] +
    '年' +
    Number(
      parts[1]
    ) +
    '月'
  );

}


var mirelHistoryExpanded =
  false;

var mirelHistoryMode =
  'latest';


function mirelApplyHistoryView() {

  var card =
    document.querySelector(
      '#detailContent .mirel-history-card'
    );


  if (!card) {
    return;
  }


  var rows =
    card.querySelectorAll(
      ':scope > .mirel-interaction-row'
    );


  rows.forEach(
    function(
      row,
      index
    ) {

      var show =
        false;


      if (
        mirelHistoryMode === 'latest'
      ) {

        show =
          mirelHistoryExpanded ||
          index === 0;

      } else {

        show =
          row.dataset
            .mirelMonth ===
          mirelHistoryMode;

      }


      row.style.display =
        show
          ? ''
          : 'none';

    }
  );


  var toggle =
    card.querySelector(
      '.mirel-history-toggle'
    );


  if (toggle) {

    if (
      mirelHistoryMode === 'latest' &&
      rows.length > 1
    ) {

      toggle.style.display =
        'block';

      toggle.textContent =
        mirelHistoryExpanded
          ? '過去履歴を閉じる ↑'
          : '過去履歴を表示 ↓';

    } else {

      toggle.style.display =
        'none';

    }

  }


  card
    .querySelectorAll(
      '.mirel-history-tab'
    )
    .forEach(
      function(button) {

        button.classList.toggle(
          'active',
          button.dataset
            .mirelMonth ===
            mirelHistoryMode
        );

      }
    );

}


function mirelSetHistoryMonth(
  month
) {

  mirelHistoryMode =
    month;

  mirelApplyHistoryView();

}


function mirelToggleHistory() {

  mirelHistoryExpanded =
    !mirelHistoryExpanded;

  mirelApplyHistoryView();

}


function mirelEnhanceInteractionHistory(
  teacher
) {

  var cards =
    document.querySelectorAll(
      '#detailContent .card'
    );


  var card =
    null;


  for (
    var i = 0;
    i < cards.length;
    i++
  ) {

    var title =
      cards[i].querySelector(
        '.section-title'
      );


    if (
      title &&
      title.textContent
        .trim()
        .indexOf(
          '交流履歴'
        ) === 0
    ) {

      card =
        cards[i];

      break;

    }

  }


  if (!card) {
    return;
  }


  card.classList.add(
    'mirel-history-card'
  );


  var header =
    card.querySelector(
      ':scope > .detail-head'
    );


  card
    .querySelectorAll(
      ':scope > .child'
    )
    .forEach(
      function(row) {
        row.remove();
      }
    );


  var interactions =
    (
      teacher.interactions ||
      []
    ).slice();


  interactions.sort(
    function(a, b) {

      return String(
        b.date ||
        ''
      ).localeCompare(
        String(
          a.date ||
          ''
        )
      );

    }
  );


  var months =
    [];


  interactions.forEach(
    function(interaction) {

      var month =
        mirelHistoryMonthKey(
          interaction
        );


      if (
        months.indexOf(
          month
        ) === -1
      ) {

        months.push(
          month
        );

      }

    }
  );


  if (
    interactions.length
  ) {

    var tabs =
      document.createElement(
        'div'
      );


    tabs.className =
      'mirel-history-tabs';


    tabs.innerHTML =

      '<button type="button" class="mirel-history-tab active" data-mirel-month="latest" onclick="mirelSetHistoryMonth(\'latest\')">最新</button>';


    months.forEach(
      function(month) {

        tabs.innerHTML +=

          '<button type="button" class="mirel-history-tab" data-mirel-month="' +

            escapeAttr(
              month
            ) +

          '" onclick="mirelSetHistoryMonth(\'' +

            escapeJs(
              month
            ) +

          '\')">' +

            escapeHtml(
              mirelHistoryMonthLabel(
                month
              )
            ) +

          '</button>';

      }
    );


    header.insertAdjacentElement(
      'afterend',
      tabs
    );

  }


  interactions.forEach(
    function(interaction) {

      var holder =
        document.createElement(
          'div'
        );


      holder.innerHTML =
        renderInteractionCard(
          interaction
        );


      var row =
        holder.firstElementChild;


      if (!row) {
        return;
      }


      row.dataset.mirelMonth =
        mirelHistoryMonthKey(
          interaction
        );


      card.appendChild(
        row
      );

    }
  );


  if (
    interactions.length > 1
  ) {

    var toggle =
      document.createElement(
        'button'
      );


    toggle.type =
      'button';

    toggle.className =
      'mirel-history-toggle';

    toggle.onclick =
      mirelToggleHistory;


    card.appendChild(
      toggle
    );

  }


  mirelHistoryExpanded =
    false;

  mirelHistoryMode =
    'latest';


  mirelApplyHistoryView();

}


/* =========================================================
   子ども情報 2人目以降折りたたみ
   ========================================================= */

var mirelChildrenExpanded =
  false;


function mirelApplyChildrenView() {

  var card =
    document.querySelector(
      '#detailContent .mirel-child-card'
    );


  if (!card) {
    return;
  }


  var rows =
    card.querySelectorAll(
      ':scope > .child'
    );


  rows.forEach(
    function(
      row,
      index
    ) {

      row.style.display =
        (
          index === 0 ||
          mirelChildrenExpanded
        )
          ? ''
          : 'none';

    }
  );


  var toggle =
    card.querySelector(
      '.mirel-children-toggle'
    );


  if (toggle) {

    toggle.textContent =
      mirelChildrenExpanded
        ? '2人目以降を閉じる ↑'
        : '2人目以降を見る ↓';

  }

}


function mirelToggleChildren() {

  mirelChildrenExpanded =
    !mirelChildrenExpanded;

  mirelApplyChildrenView();

}


function mirelEnhanceChildrenList() {

  var cards =
    document.querySelectorAll(
      '#detailContent .card'
    );


  var card =
    null;


  for (
    var i = 0;
    i < cards.length;
    i++
  ) {

    var title =
      cards[i].querySelector(
        '.section-title'
      );


    if (
      title &&
      title.textContent
        .trim()
        .indexOf(
          '子ども情報'
        ) === 0
    ) {

      card =
        cards[i];

      break;

    }

  }


  if (!card) {
    return;
  }


  card.classList.add(
    'mirel-child-card'
  );


  var rows =
    card.querySelectorAll(
      ':scope > .child'
    );


  mirelChildrenExpanded =
    false;


  if (
    rows.length > 1
  ) {

    var toggle =
      document.createElement(
        'button'
      );


    toggle.type =
      'button';

    toggle.className =
      'mirel-children-toggle';

    toggle.onclick =
      mirelToggleChildren;


    card.appendChild(
      toggle
    );

  }


  mirelApplyChildrenView();

}


/* =========================================================
   先生詳細 上部ボタン
   ========================================================= */

function mirelFixTeacherTopActions() {

  var firstCard =
    document.querySelector(
      '#detailContent > .card'
    );


  if (!firstCard) {
    return;
  }


  var actions =
    firstCard.querySelector(
      ':scope > .detail-head .detail-head-actions'
    );


  if (!actions) {
    return;
  }


  var buttons =
    actions.querySelectorAll(
      'button'
    );


  if (buttons[0]) {

    buttons[0].textContent =
      '編集';

    buttons[0]
      .classList
      .add(
        'mirel-action-mini',
        'mirel-teacher-top-action'
      );

  }


  if (!buttons[1]) {

    var deleteButton =
      document.createElement(
        'button'
      );

    deleteButton.type =
      'button';

    deleteButton.className =
      'detail-delete-button mirel-action-mini mirel-teacher-top-action';

    deleteButton.textContent =
      '削除';

    deleteButton.onclick =
      function() {

        if (
          selectedTeacherId
        ) {

          deleteTeacherAction(
            selectedTeacherId
          );

        }

      };

    actions.appendChild(
      deleteButton
    );

  } else {

    buttons[1].textContent =
      '削除';

    buttons[1]
      .classList
      .add(
        'mirel-action-mini',
        'mirel-teacher-top-action'
      );

  }

}


/* =========================================================
   詳細描画後の処理を1か所に集約
   ========================================================= */

var mirelOriginalRenderTeacherDetailFinal =
  renderTeacherDetail;


renderTeacherDetail =
  function(
    teacher
  ) {

    mirelOriginalRenderTeacherDetailFinal(
      teacher
    );


    mirelFixTeacherTopActions();

    mirelInstallChildDetailActions(
      teacher
    );

    mirelEnhanceInteractionHistory(
      teacher
    );

    mirelEnhanceChildrenList();

  };


/* =========================================================
   詳細画面は常に最上部から表示
   ========================================================= */

var mirelOriginalOpenTeacherDetailFinal =
  openTeacherDetail;


openTeacherDetail =
  function(
    id
  ) {

    mirelOriginalOpenTeacherDetailFinal(
      id
    );


    function resetDetailScroll() {

      var main =
        document.querySelector(
          '.main'
        );


      if (main) {
        main.scrollTop = 0;
      }


      var page =
        document.getElementById(
          'pageDetail'
        );


      if (page) {
        page.scrollTop = 0;
      }


      window.scrollTo(
        0,
        0
      );

    }


    resetDetailScroll();


    requestAnimationFrame(
      function() {

        resetDetailScroll();

        requestAnimationFrame(
          resetDetailScroll
        );

      }
    );

  };
