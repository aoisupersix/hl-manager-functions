import * as functions from 'firebase-functions';
import * as secureCompare from 'secure-compare';

import { adminSdk } from './firebaseConfig'
import { initializeDevice, updateDeviceInfo } from './device'
import { updateMemberStatus } from './member'
import { holdTime, getTimelineData } from './getStatusHttpFunction'
import { updateGeofenceStatus } from './geofenceHttpFunction'
import * as util from './utils/util';
import * as dUtil from './utils/dateUtil';

const ref = adminSdk.database().ref();

export {
    initializeDevice,
    updateMemberStatus,
    updateDeviceInfo,
    holdTime,
    getTimelineData,
    updateGeofenceStatus
}

/**
 * ※CRON用（通常は呼ばないこと）
 * 0:00に全てのメンバーのログの初期データをデータベースに生成します。
 * Method: PUT
 * Query {
 *   key : 認証用キー
 * }
 */
export const initDailyLog = functions.https.onRequest((req, res) => {
    //リクエストがPUTではない
    if(req.method !== 'PUT') {
        return res.status(405).send("This functions is only used to 'PUT' method.");
    }
    //パラメータ不足
    if(util.ContainsUndefined(req.query.key)) {
        return res.status(400).send("Invalid query parameters.");
    }
    const key = req.query.key;

    //キーが異なる
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

    const promise = ref.child("/members").orderByKey().once("value", (snap) => {
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

    return promise.then((_) => {
        res.status(200).send("done.");
    }).catch((reason) => {
        res.status(500).send(reason);
    });
});

/**
 * ※CRON用（通常は呼ばないこと）
 * 3ヶ月以上古いログを削除します。
 * Method: PUT
 * Query {
 *   key : 認証用キー
 * }
 */
export const deleteOldLogs = functions.https.onRequest((req, res) => {
    //リクエストがPUTではない
    if(req.method !== 'PUT') {
        return res.status(405).send("This functions is only used to 'PUT' method.");
    }
    //パラメータ不足
    if(util.ContainsUndefined(req.query.key)) {
        return res.status(400).send("Invalid query parameters.");
    }
    const key = req.query.key;

    //キーが異なる
    if (!secureCompare(key, functions.config().service_account.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key,
            'matches the cron.key attribute in `firebase env:get`');
        return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
            'cron.key environment variable.');
    }

    //3ヶ月以上古いログの削除
    const sepDate = new Date();
    sepDate.setMonth(sepDate.getMonth() -3);
    const promise = ref.child('/logs').orderByKey().once("value", (snap) => {
        snap.forEach((memLogs) => {
            console.log("memLogs:" + memLogs.key)
            memLogs.forEach((log) => {
                const dStr = log.key.slice(0, 4) + "/" + log.key.slice(4, 6) + "/" + log.key.slice(6, 8) + " 00:00:00";
                const d = new Date(dStr);
                console.log("sepDate:" + sepDate.toString() + ",date:" + d.toString());
                if(d < sepDate) {
                    console.log("rem:" + log.key);
                    log.ref.remove().then((_) => { return null; }).catch((reason) => { console.log("remove error:" + reason); return true;})
                }
                return null;
            })
            return null;
        });
    });

    return promise.then((_) => {
        res.status(200).send("done.");
    }).catch((reason) => {
        res.status(500).send(reason);
    });
});