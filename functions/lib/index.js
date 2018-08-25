"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const secureCompare = require("secure-compare");
const util = require("./utils/util");
const dUtil = require("./utils/dateUtil");
admin.initializeApp(functions.config().firebase);
const ref = admin.database().ref();
/**
 * DBトリガー
 * statusが更新された際にログと最終更新を更新します。
 */
exports.statusReferences = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");
    //最終更新
    ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date);
    ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val());
    //ログ更新
    return ref.child(`/logs/${context.params.memberId}/${update_day}`).push({
        date: update_date,
        update_status: change.after.val()
    });
});
/**
 * ※CRON用（通常は呼ばないこと）
 * 0:00に全てのメンバーのログの初期データをデータベースに生成します。
 * Method: PUT
 * Query {
 *   key : 認証用キー
 * }
 */
exports.initDailyLog = functions.https.onRequest((req, res) => {
    //リクエストがPUTではない
    if (req.method !== 'PUT') {
        return res.status(405).send("This functions is only used to 'PUT' method.");
    }
    //パラメータ不足
    if (util.ContainsUndefined(req.query.key)) {
        return res.status(400).send("Invalid query parameters.");
    }
    const key = req.query.key;
    //キーが異なる
    if (!secureCompare(key, functions.config().service_account.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key, 'matches the cron.key attribute in `firebase env:get`');
        return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
            'cron.key environment variable.');
    }
    //更新時間
    const nowDate = dUtil.getJstDate();
    nowDate.setHours(0, 0, 0, 0);
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");
    ref.child("/members").orderByKey().once("value", (snap) => {
        snap.forEach((member) => {
            //ログ追加
            ref.child(`/logs/${member.key}/${update_day}`).push({
                date: update_date,
                update_status: member.child('status').val()
            });
            return null;
        });
    });
    return res.status(200).send("done.");
});
/**
 * パラメータに与えられたデータの期間内にステータスが保持された時間を分単位で取得します。
 * Method: All
 * Query: {
 *   key : 認証用キー
 *   memberId : 取得対象のメンバーID
 *   stateId : 取得対象のステータスID
 *   startDate : 取得開始期間
 *   endDate : 取得終了時間
 * }
 */
exports.holdTime = functions.https.onRequest((req, res) => {
    //パラメータ不足
    if (util.ContainsUndefined(req.query.key, req.query.memberId, req.query.stateId, req.query.startDate, req.query.endDate)) {
        return res.status(403).send("Invalid query parameters.");
    }
    const key = req.query.key;
    const memId = +req.query.memberId;
    const stateId = +req.query.stateId;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    //Exit if the keys don't match
    if (!secureCompare(key, functions.config().service_account.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key, 'matches the cron.key attribute in `firebase env:get`');
        return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
            'cron.key environment variable.');
    }
    //dateのHour以下は必ず0で初期化する
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    endDate.setHours(0);
    endDate.setMinutes(0);
    endDate.setSeconds(0);
    endDate.setMilliseconds(0);
    return ref.child(`/logs/${memId}/`).orderByKey().once("value")
        .then((snap) => {
        let holdMinute = 0;
        for (const date = startDate; date.getTime() <= endDate.getTime(); date.setDate(date.getDate() + 1)) {
            const log_key = dUtil.getLogsKeyString(date);
            console.log("================" + log_key + "===============");
            if (snap.hasChild(log_key)) {
                //ステータス時間の計測
                let nowDate = date;
                let nowState = -1;
                snap.child(log_key).forEach((logSnap) => {
                    const d = new Date(logSnap.child('date').val());
                    const val = logSnap.child('update_status').val();
                    console.log(`log_key Loop(log_key:${log_key},nowDate:${dUtil.getDateString(nowDate)},nowState:${nowState},holdMinute:${holdMinute} => d:${dUtil.getDateString(d)},val:${val})`);
                    if (val !== nowState && nowState === stateId) {
                        //ステータス時間追加
                        console.log(`addHoldMinute Before: ${dUtil.getDateString(nowDate)}, After: ${dUtil.getDateString(d)}, Sub:${Math.floor((d.getTime() - nowDate.getTime()) / (1000 * 60))}`);
                        holdMinute += Math.floor((d.getTime() - nowDate.getTime()) / (1000 * 60));
                    }
                    nowDate = d;
                    nowState = val;
                    return false;
                });
                if (nowState === stateId) {
                    //ステータス時間追加
                    const ed = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                    console.log(`addHoldMinute Before: ${dUtil.getDateString(nowDate)}, After: ${dUtil.getDateString(ed)}, Sub:${Math.floor((ed.getTime() - nowDate.getTime()) / (1000 * 60))}`);
                    holdMinute += Math.floor((ed.getTime() - nowDate.getTime()) / (1000 * 60));
                }
            }
        }
        return res.status(200).send(holdMinute.toString());
    }).catch((reason) => {
        return res.status(406).send(reason.toString());
    });
});
//# sourceMappingURL=index.js.map