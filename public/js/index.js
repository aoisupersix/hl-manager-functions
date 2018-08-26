/**
 * ステータス情報のDBスナップショット
 */
var statusSnap;

/**
 * 在室率ゲージ
 */
var weeklyGauge;

$(function () {

  $('#statusDetailModal').on('shown.bs.modal', function () {
    initD3Timeline();
  })

  /**
   * モーダルクローズイベント
   */
  $('#statusDetailModal').on('hidden.bs.modal', function (e) {
    weeklyGauge.update(0); //ゲージを0にする
  });

  initDb();
  initWeeklyGauge();
})

/**
 * HLDisplay_WebPage_Extra
 * DBの取得設定を行います。
 */
function initDb() {
  var db = firebase.database();
  //初期データ取得
  db.ref('/').once('value').then(function(snapshot) {
    init(snapshot.val());
  });

  //メンバー情報更新
  db.ref('members').on('value', function(snapshot) {
    snapshot.forEach(function(member) {

      updateMemberStatus(member.key, member.val());
    });
  });
}

/**
 * 初期化処理を行います。
 * @param {DataSnapShot} rootSnap DBのルート
 */
function init(rootSnap) {
  //ステータスの削除
  $("#memberStatus").empty();

  //ステータスの生成
  var members = rootSnap["members"];
  var status = rootSnap["status"];
  statusSnap = status;
  for(var i = 0; i < members.length; i++){
    var stateId = parseInt(members[i]["status"]);
    var lastStateId = parseInt(members[i]["last_status"]);
    addMemberRow(
      i,
      members[i]["last_name"] + " " + members[i]["first_name"],
      status[stateId]["name"],
      status[stateId]["color"],
      members[i]["last_update_date"],
      status[lastStateId]["name"],
      members[i]["last_update_is_auto"]
    );
  }
}

/**
 * メンバー情報の更新を行います。
 * @param {Number} memberId メンバーのID
 * @param {DataSnapShot} memberSnap メンバー情報
 */
function updateMemberStatus(memberId, memberSnap) {
  $('#memberStatus').children().each(function(index, element) {
    var card = $(element).find('.btn');
    var stateId = parseInt(memberSnap["status"]);
    var lastStateId = parseInt(memberSnap["last_status"]);
    if($(card).attr('data-id') == memberId) {
      //ステータスの更新
      var color = $(card).attr('data-color');
      $(card).attr({
        'data-id': memberId,
        'data-name': memberSnap["last_name"] + "　" + memberSnap["first_name"],
        'data-statusText': statusSnap[stateId]["name"],
        'data-color': statusSnap[stateId]["color"],
        'data-lastUpdateDate': memberSnap["last_update_date"],
        'data-lastStatusText': statusSnap[lastStateId]["name"],
        'data-lastUpdateIsAuto': memberSnap["last_update_is_auto"]
      });
      $(element).removeClass('table-' + color);
      $(element).addClass('table-' + statusSnap[stateId]["color"]);
      $(element).find('.name').text(memberSnap["last_name"] + "　" + memberSnap["first_name"]);
      $(element).find('.status').text(statusSnap[stateId]["name"])
      return false;
    }
  })
}

/**
 * カード押下時にステータス詳細モーダルを表示します
 * @param {object} obj - クリックされたカード
 */
function showStatusDetail(obj) {
  console.log(obj);
  //Bind
  updateWeeklyGauge($(obj).attr('data-id'));
  $('#statusDetail-Name').text($(obj).attr('data-name'));
  $('#statusDetail-Status').text($(obj).attr('data-statusText'));
  $('#statusDetail-lastUpdateDate').text($(obj).attr('data-lastUpdateDate'));
  $('#statusDetail-lastStatusText').text($(obj).attr('data-lastStatusText'));
  $('#statusDetail-statusText').text($(obj).attr('data-statusText'));
  $('#statusDetailModal').attr('data-id', $(obj).attr('data-id'));
  $(obj).attr('data-lastUpdateIsAuto') == "true" ? $("#statusDetail-lastUpdateIsAuto").text("自動更新") : $("#statusDetail-lastUpdateIsAuto").text("手動更新")
  $('#statusDetailModal').modal();

}

/**
 * Htmlにカードを追加します
 * @param {int} id - ユーザid
 * @param {string} name - ユーザ名
 * @param {string} statusText - ステータス状態を表す文字列
 * @param {string} color - ステータス状態に対応するBootStrapカラー
 * @param {string} lastUpdateDate - 最終更新時間
 * @param {string} lastStatusText - 最終更新ステータス状態を表す文字列
 * @param {boolean} lastUpdateIsAuto - 最終更新が自動更新か？ 
 */
function addMemberRow(id, name, statusText, color, lastUpdateDate, lastStatusText, lastUpdateIsAuto){
  $('#memberStatus').append(
    $('<tr></tr>').addClass('table-' + color)
    .append($('<th></th>')
      .append($('<a href="#" class="btn btn-fix">詳細</a>')
        .attr({
          'onClick': 'showStatusDetail(this)',
          'data-id': id,
          'data-name': name,
          'data-statusText': statusText,
          'data-color': color,
          'data-lastUpdateDate': lastUpdateDate,
          'data-lastStatusText': lastStatusText,
          'data-lastUpdateIsAuto': lastUpdateIsAuto
        })
      )
    )
    .append($('<td class="name"></td>').text(name))
    .append($('<td class="status"></td>').text(statusText))
    .append($('<td class="lastUpdateDate"></td>').text(lastUpdateDate))
  );
}

/**
 * 今週の在室率ゲージの初期化を行います。
 */
function initWeeklyGauge() {
  var gaugeConf = liquidFillGaugeDefaultSettings();
  gaugeConf.circleColor = "#FF871B";
  gaugeConf.textColor = "#553300";
  gaugeConf.waveTextColor = "#805615";
  gaugeConf.waveColor = "#78C7E7";
  gaugeConf.circleThickness = 0.1;
  gaugeConf.circleFillGap = 0.2;
  gaugeConf.textVertPosition = 0.8;
  gaugeConf.waveAnimateTime = 2000;
  gaugeConf.waveHeight = 0.3;
  gaugeConf.waveCount = 1;
  weeklyGauge = loadLiquidFillGauge("weeklyGauge", 0, gaugeConf);
}

/**
 * 今週の在室率ゲージの更新を行います。
 */
function updateWeeklyGauge(memberId) {
  var endDate = new Date();
  var startDate = new Date();
  startDate.setDate(endDate.getDate() - 7); //一週間前
  var edStr = endDate.getFullYear() + "/" + (endDate.getMonth() + 1) + "/" + endDate.getDate();
  var stStr = startDate.getFullYear() + "/" + (startDate.getMonth() + 1) + "/" + startDate.getDate();
  console.log("HoldTime: https://hlmanager-32609.firebaseapp.com/holdTime?memberId=" + memberId + "&stateId=2&startDate=" + stStr + "&endDate=" + edStr);
  $.get({
    url : "https://hlmanager-32609.firebaseapp.com/holdTime",
    data : {
      memberId: memberId,
      stateId: 2,
      startDate: stStr,
      endDate: edStr,
    },
    success : function(data) {
      var percent = (data / (7 * 24 * 60) * 100);
      weeklyGauge.update(percent.toFixed(1));
    }
  });
}

function initD3Timeline() {
  var testData = [
    {
      class: "20180820",
      label: "2018/08/20",
      times: [
        {
          "color": "white",
          "starting_time": 1534690800000,
          "ending_time": 1534717200000
        },
        {
          "color": "#b0c4de",
          "label": "在室",
          "starting_time": 1534717200000,
          "ending_time": 1534777200000
        }
      ],
    },
    {
      class: "20180821",
      label: "2018/08/21",
      times: [
        {
          "color": "white",
          "starting_time": 1534690800000,
          "ending_time": 1534717200000
        },
        {
          "color": "#b0c4de",
          "label": "在室",
          "starting_time": 1534717200000,
          "ending_time": 1534777200000
        }
      ],
    },
  ];

  var width = 500;
  var chart = d3.timeline().tickFormat({
    format: d3.time.format("%H"),
    tickTime: d3.time.hours,
    tickInterval: 6,
    tickSize: 2
  }).margin({left: 120, top: 100, right: 30, bottom: 10});
  var svg = d3.select("#timeline1").append("svg").attr("width", width)
    .datum(testData).call(chart);
  console.log("initD3COmplete");
}