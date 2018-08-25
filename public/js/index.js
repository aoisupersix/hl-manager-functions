/**
 * ステータス情報のDBスナップショット
 */
var statusSnap;

/**
 * 在室率ゲージ
 */
var weeklyGauge;

$(function(){
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
    addMemberRow(
      i,
      members[i]["last_name"] + "　" + members[i]["first_name"],
      status[stateId]["name"],
      status[stateId]["color"],
      members[i]["last_update_date"]
    );
  }
}

/**
 * メンバー情報の更新を行います。
 * AndroidApp側から呼び出される関数です。
 * @param {Number} memberId メンバーのID
 * @param {DataSnapShot} memberSnap メンバー情報
 */
function updateMemberStatus(memberId, memberSnap) {
  $('#memberStatus').children().each(function(index, element) {
    var card = $(element).find('.btn');
    var stateId = parseInt(memberSnap["status"]);
    if($(card).attr('data-id') == memberId) {
      //ステータスの更新
      var color = $(card).attr('data-color');
      $(card).attr({
        'data-id': memberId,
        'data-name': memberSnap["last_name"] + "　" + memberSnap["first_name"],
        'data-statusText': statusSnap[stateId]["name"],
        'data-color': statusSnap[stateId]["color"]
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
  $('#statusDetail-Name').text($(obj).attr('data-name'));
  $('#statusDetail-Status').text($(obj).attr('data-statusText'));
  $('#statusDetailModal').attr('data-id', $(obj).attr('data-id'));
  $('#statusDetailModal').modal();
}

/**
 * Htmlにカードを追加します
 * @param {int} id - ユーザid
 * @param {string} name - ユーザ名
 * @param {string} statusText - ステータス状態を表す文字列
 * @param {string} color - ステータス状態に対応するBootStrapカラー
 * @param {string} lastUpdateDate - 最終更新時間
 */
function addMemberRow(id, name, statusText, color, lastUpdateDate){
  $('#memberStatus').append(
    $('<tr></tr>').addClass('table-' + color)
    .append($('<th></th>')
      .append($('<a href="#" class="btn btn-fix">詳細</a>')
        .attr({
          'onClick': 'showStatusDetail(this)',
          'data-id': id,
          'data-name': name,
          'data-statusText': statusText,
          'data-color': color
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
  gaugeConf.circleColor = "#D4AB6A";
  gaugeConf.textColor = "#553300";
  gaugeConf.waveTextColor = "#805615";
  gaugeConf.waveColor = "#AA7D39";
  gaugeConf.circleThickness = 0.1;
  gaugeConf.circleFillGap = 0.2;
  gaugeConf.textVertPosition = 0.8;
  gaugeConf.waveAnimateTime = 2000;
  gaugeConf.waveHeight = 0.3;
  gaugeConf.waveCount = 1;
  weeklyGauge = loadLiquidFillGauge("weeklyGauge", 60.1, gaugeConf);
}

/**
 * 今週の在室率ゲージの更新を行います。
 */
function updateWeeklyGauge(memberId) {
  var endDate = new Date();
  var startDate = endDate;
  startDate.setDate(endDate.getDate() - 7); //一週間前
  var holdTime = firebase.functions().httpsCollable('holdTime');
  holdTime({
    memberId: memberId,
    stateId: 2,
    startDate: startDate.getFullYear() + "/" + (startDate.getMonth() + 1) + "/" + startDate.getDay(),
    endDate: endDate.getFullYear() + "/" + (endDate.getMonth() + 1) + "/" + endDate.getDay(),
  });
}