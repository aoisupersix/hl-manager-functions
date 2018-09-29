"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const firebaseConfig_1 = require("./firebaseConfig");
const geofenceIdentifiers_1 = require("./geofenceIdentifiers");
const dUtil = require("./utils/dateUtil");
const ref = firebaseConfig_1.adminSdk.database().ref();
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
    //ログ更新
    return Promise.all([
        ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date),
        ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val()),
        ref.child(`/logs/${context.params.memberId}/${update_day}`).push({
            date: update_date,
            update_status: change.after.val()
        })
    ]);
});
/**
 * DBトリガー
 * deviceが更新された際に最終更新を更新します。
 */
exports.deviceUpdater = functions.database.ref('/devices/{deviceId}').onUpdate((_, context) => {
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    //最終更新の更新
    return ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
});
/**
 * DBトリガー
 * device追加時にジオフェンスのステータスを初期化します。
 */
exports.geofenceStatusInitializer = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {
    console.log('New device created. Initialize geofence status.');
    const dict = {};
    geofenceIdentifiers_1.Identifiers.forEach(i => dict[i] = false);
    console.log(dict);
    return ref.child(`/devices/${context.params.deviceId}/geofence_status`).set(dict);
});
//# sourceMappingURL=dbtriggers.js.map