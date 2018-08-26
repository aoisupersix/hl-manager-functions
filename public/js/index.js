/**
 * ステータス情報のDBスナップショット
 */
var statusSnap;

/**
 * 在室率ゲージ
 */
var weeklyGauge;

$(function () {

  /**
   * モーダルオープンイベント
   */
  $('#statusDetailModal').on('shown.bs.modal', function (e) {
    var id = $(e.target).attr('data-id');
    initTimelines(id);
  })

  /**
   * モーダルクローズイベント
   */
  $('#statusDetailModal').on('hidden.bs.modal', function (e) {
    weeklyGauge.update(0); //ゲージを0にする
    clearTimelines();
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

/**
 * タイムラインをDBから取得して設定します。
 * @param {Number} memberId メンバーID
 */
function initTimelines(memberId) {
  const GET_DAY_COUNT = 7; //1週間
  var wNames = ['日', '月', '火', '水', '木', '金', '土'];

  var db = firebase.database();
  //一週間分のログを取得
  db.ref('/logs/' + memberId).orderByKey().limitToLast(GET_DAY_COUNT).once('value').then(function (snapshot) {
    console.log(snapshot.val());

    for (var d_count = 1; d_count <= GET_DAY_COUNT; d_count++) {
      //ログのKeyを取得
      var nowDate = new Date();
      nowDate.setDate(nowDate.getDate() - GET_DAY_COUNT + d_count);
      var date_key = "" + nowDate.getFullYear() + ("0" + (nowDate.getMonth() + 1)).slice(-2) + ("0" + nowDate.getDate()).slice(-2);
      var changeTimes = [];
      var stateTexts = [];
      var colors = [];
      if (snapshot.hasChild(date_key)) {
        //とある日のログがある
        snapshot.child(date_key).forEach(function (logSnap) {
          changeTimes.push(new Date(logSnap.child('date').val()));
          var stateId = logSnap.child('update_status').val();
          stateTexts.push(statusSnap[stateId]["name"]);
          colors.push(statusSnap[stateId]["hcolor-bg"]);
        });
        changeTimes.push(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999));

        //データの生成
        var times = []
        for(var i = 0; i < stateTexts.length; i++) {
          times.push({
            "color": colors[i],
            //"label": stateTexts[i],
            "starting_time": changeTimes[i].getTime(),
            "ending_time": changeTimes[i+1].getTime(), //changeTimesは必ず一つ多いので安全
          })
        }

        var data = [
          {
            class: date_key,
            label: "" + nowDate.getFullYear() + "/" + (nowDate.getMonth() + 1) + "/" + nowDate.getDate() + "(" + wNames[nowDate.getDay()] + ")",
            times: times,
          }
        ];
        addTimeline(data, nowDate);
      }else {
        //ログなし(本来はほぼありえないと思う)
        var data = [
          {
            class: date_key,
            label: "" + nowDate.getFullYear() + "/" + (nowDate.getMonth() + 1) + "/" + nowDate.getDate() + "(" + wNames[nowDate.getDay()] + ")",
            times: [],
          },
        ];
        addTimeline(data, nowDate);
      }
    }
  });
}

/**
 * タイムラインを追加します。
 * @param {D3TimeLineData} data タイムラインデータ
 * @param {Date} date タイムラインの日付
 */
function addTimeline(data, date) {
  var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0); 
  var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  var width = 700;
  if(window.innerWidth < width + 50) {
    width = window.innerWidth - 50;
  }
  var chart = d3.timeline().tickFormat({
    format: d3.time.format("%H"),
    tickTime: d3.time.hours,
    tickInterval: 6,
    tickSize: 2
  }).margin({left: 120, top: 10, right: 20, bottom: 10})
  .beginning(startDate.getTime()).ending(endDate.getTime());
  var svg = d3.select("#timeline").append("svg").attr("width", width)
    .datum(data).call(chart);
}

/**
 * タイムラインを初期化します。
 */
function clearTimelines() {
  $("#timeline").empty();
}