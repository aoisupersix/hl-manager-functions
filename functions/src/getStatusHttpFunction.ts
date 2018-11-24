import * as functions from 'firebase-functions';
import * as Moment from 'moment-timezone';
import { List } from 'linqts';

import { adminSdk } from './firebaseConfig'
import * as util from './utils/util';
import * as dUtil from './utils/dateUtil';

const ref = adminSdk.database().ref();

/**
 * パラメータに与えられたデータの期間内にステータスが保持された時間を分単位で取得します。
 * Method: All
 * Query: {
 *   memberId : 取得対象のメンバーID
 *   stateId : 取得対象のステータスID
 *   startDate : 取得開始期間
 *   endDate : 取得終了時間
 * }
 */
export const holdTime = functions.https.onRequest((req, res) => {
  //パラメータ不足
  if(util.ContainsUndefined(req.query.memberId, req.query.stateId, req.query.startDate, req.query.endDate)) {
      return res.status(403).send("Invalid query parameters.");
  }
  const memId: number = +req.query.memberId;
  const stateId: number = +req.query.stateId;
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  //dateのHour以下は必ず0で初期化する
  dUtil.initializeDate(startDate);
  dUtil.initializeDate(endDate);

  return ref.child(`/logs/${memId}/`).orderByKey().once("value")
  .then((snap) => {
      let holdMinute = 0;
      for(const date: Date = startDate; date.getTime() <= endDate.getTime(); date.setDate(date.getDate() + 1)) {
          const log_key = dUtil.getLogsKeyString(date);
          console.log("================" + log_key + "===============");
          if(snap.hasChild(log_key)) {
              //ステータス時間の計測
              let nowDate = date;
              let nowState: number = -1;
              snap.child(log_key).forEach((logSnap) => {
                  const d = new Date(logSnap.child('date').val());
                  const val: number = logSnap.child('update_status').val();
                  console.log(`log_key Loop(log_key:${log_key},nowDate:${dUtil.getDateString(nowDate)},nowState:${nowState},holdMinute:${holdMinute} => d:${dUtil.getDateString(d)},val:${val})`)
                  if(val !== nowState && nowState === stateId) {
                      //ステータス時間追加
                      console.log(`addHoldMinute Before: ${dUtil.getDateString(nowDate)}, After: ${dUtil.getDateString(d)}, Sub:${Math.floor((d.getTime() - nowDate.getTime()) / (1000 * 60))}`)
                      holdMinute += Math.floor((d.getTime() - nowDate.getTime()) / (1000 * 60));
                  }
                  nowDate = d;
                  nowState = val;
                  return false;
              });
              if(nowState === stateId) {
                  //ステータス時間追加
                  const ed = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                  console.log(`addHoldMinute Before: ${dUtil.getDateString(nowDate)}, After: ${dUtil.getDateString(ed)}, Sub:${Math.floor((ed.getTime() - nowDate.getTime()) / (1000 * 60))}`)
                  holdMinute += Math.floor((ed.getTime() - nowDate.getTime()) / (1000 * 60));
              }
          }
      }

      return res.status(200).send(holdMinute.toString());
  }).catch((reason) => {
      return res.status(406).send(reason.toString());
  });
});

/**
 * パラメータに与えられたデータの期間内のタイムラインデータ(Google Charts Timelines用)を生成して返します。。
 * Method: All
 * Query: {
 *   memberId : 取得対象のメンバーID
 *   startDate : 取得開始期間
 *   endDate : 取得終了時間
 * }
 */
export const getTimelineData = functions.https.onRequest(async (req, res) => {
  //パラメータ不足
  if(util.ContainsUndefined(req.query.memberId, req.query.startDate, req.query.endDate)) {
      return res.status(400).send("Invalid query parameters.");
  }
  const memberId = req.query.memberId;
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  //dateのHour以下は必ず0で初期化する
  dUtil.initializeDate(startDate);
  dUtil.initializeDate(endDate);

  const statusSnap = await ref.child('status').once('value');

  const dateCount = dUtil.getDiff(startDate, endDate);
  const timelineData = await new Promise(async (resolve, reject) => {
    const timelines = []; // 生成データ
    const logsSnap = await ref.child(`logs/${memberId}`).orderByKey().limitToLast(dateCount).once('value');

    for(let nowDateCount = 1; nowDateCount <= dateCount; nowDateCount++) {
      const nowDate = Moment().clone().subtract(dateCount - nowDateCount, 'day');
      const dateKey = nowDate.format('YYYYMMDD'); // TODO: dUtil.getlogKey使うよりこっちのほうが楽

      // ある日のログが存在しない
      // 本来はありえないはずだが、念の為ケアしておく
      if (!logsSnap.hasChild(dateKey)) {
        continue;
      }

      // 値の一時保持用
      let nowState = -1 // 現在のステータス
      const changeTimes: number[] = [] // 更新時刻
      const stateIds: number[] = [] // ステータスID
      const stateTexts: string[] = [] // ステータステキスト
      const colors: string[] = [] // バーカラー

      logsSnap.child(dateKey).forEach(logSnap => {
        // FIXME: なぜかどうやってもJSTになってしまう.
        // とりあえず無理やり9時間引いて対応
        const logDate = Moment(logSnap.child('date').val()).clone().subtract(9, 'hour'); // FIXME:
        const logState = logSnap.child('update_status').val()

        if (logState !== nowState) {
          changeTimes.push(logDate.valueOf());
          stateIds.push(logState);
          stateTexts.push(statusSnap.child(`${logState}/name`).val())
          colors.push(statusSnap.child(`${logState}/hcolor-bg`).val())
        }
        nowState = logState;
        return null;
      });

      // 最終時刻を追加（ココ重要）
      if (nowDate.date() === Moment().date()) {
        changeTimes.push(Moment().valueOf())
      } else {
        changeTimes.push(nowDate.clone().hours(23).minutes(59).seconds(59).milliseconds(999).valueOf());
      }

      // タイムラインデータ生成
      timelines.push(createOneDayTimeLine(statusSnap.val(), nowDate, changeTimes, stateIds, stateTexts, colors));
    }
    resolve(timelines);
  });

  return res.status(200).send(JSON.stringify(timelineData));
});

/**
 * 一日のタイムラインデータを生成します。
 * @param {Any} states ステータス
 * @param {Date} date 日時
 * @param {[Date]}} changeTimes 軸時間
 * @param {[Number]} stateIds 軸ステータス
 * @param {[string]} stateTexts 軸ステータステキスト
 * @param {[string]} colors バーカラー
 */
function createOneDayTimeLine(states, date: Moment.Moment, changeTimes, stateIds, stateTexts, colors) {
  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']; // 曜日名
  const dateStr = date.format(`YYYY/MM/DD (${DAY_NAMES[date.day()]})`);

  // 軸データ生成(帰宅は追加しない)
  const data: any = [ [ 'Title', 'Status', 'Start Time', 'End Time' ] ];
  for (let i = 0; i < stateTexts.length; i++) {
    if (stateIds[i] !== 0) {
      data.push([
        dateStr,
        stateTexts[i],
        changeTimes[i],
        changeTimes[i + 1] // changeTimesは必ず一つ多いので安全
      ]);
    }
  }

  // 帰宅のカラーを削除
  const retColors = new List<string>(colors)
    .Where(c => c !== states[0]['hcolor-bg'])
    .Distinct()
    .ToArray();

  // データなし
  if (data.length <= 1) {
    data.push([
      dateStr,
      'データなし',
      date.clone().hours(0).minutes(0).seconds(0).milliseconds(0).valueOf(),
      date.clone().hours(23).minutes(59).seconds(59).milliseconds(999).valueOf()
    ]);
    retColors.push(states[0]['hcolor-bg']);
  }

  return {
    date: dateStr,
    data: data,
    options: {
      height: 100,
      timeline: {
        showRowLabels: false,
        showBarLabels: false
      },
      hAxis: {
        minValue: date.clone().hours(0).minutes(0).seconds(0).milliseconds(0).valueOf(),
        maxValue: date.clone().hours(23).minutes(59).seconds(59).milliseconds(999).valueOf()
      },
      colors: retColors
    }
  };
}