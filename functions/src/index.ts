import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as secureCompare from 'secure-compare';

import * as util from './util';
import * as dUtil from './dateUtil';

admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

/**
 * statusが更新された際にログと最終更新を更新します。
 */
export const updateStatusReferences = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");

    //最終更新
    ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date);
    ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val());

    //ログ更新
    return ref.child(`/logs/${context.params.memberId}/${update_day}`).push(
        {
            date: update_date,
            update_status: change.after.val()
        }
    );
});

/**
 * CRON用
 * 全てのメンバーのログの初期データをデータベースに生成します。
 */
export const addNowStatusReferences = functions.https.onRequest((req, res) => {
    if(util.ContainsUndefined(req.query.key)) {
        return res.status(403).send("Invalid query parameters.");
    }
    const key = req.query.key;

    // Exit if the keys don't match
    if (!secureCompare(key, functions.config().service_account.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key,
            'matches the cron.key attribute in `firebase env:get`');
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
            ref.child(`/logs/${member.key}/${update_day}`).push(
                {
                    date: update_date,
                    update_status: member.child('status').val()
                }
            );
            return null;
        });
    });

    return res.status(200).send("done.");
});

export const holdTime = functions.https.onRequest((req, res) => {
    if(util.ContainsUndefined(req.query.key, req.query.memId, req.query.startDate, req.query.endDate)) {
        return res.status(403).send("Invalid query parameters.");
    }
    const key = req.query.key;
    const memId = req.query.memberId;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);

    // Exit if the keys don't match
    // if (!secureCompare(key, functions.config().service_account.key)) {
    //     console.log('The key provided in the request does not match the key set in the environment. Check that', key,
    //         'matches the cron.key attribute in `firebase env:get`');
    //     return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
    //         'cron.key environment variable.');
    // }

    //dateのHour以下は必ず0で初期化する
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    endDate.setHours(0);
    endDate.setMinutes(0);
    endDate.setSeconds(0);
    endDate.setMilliseconds(0);

    // ref.child("/members").orderByKey().once("value", (snap) => {
    //     snap.forEach((member) => {
    //         //ログ追加
    //         ref.child(`/logs/${member.key}/${update_day}`).push(
    //             {
    //                 date: update_date,
    //                 update_status: member.child('status').val()
    //             }
    //         );
    //         return null;
    //     });
    // });

    return res.status(200).send("startDate == endDate : " + (startDate.getTime() === endDate.getTime()));
});