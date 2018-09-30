"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const firebaseConfig_1 = require("./firebaseConfig");
const geofenceConst = require("./const/geofenceIdentifiers");
const states_1 = require("./const/states");
const dUtil = require("./utils/dateUtil");
const ref = firebaseConfig_1.adminSdk.database().ref();
/**
 * 引数に指定されたデバイスIDのジオフェンス状態を初期化します。
 * @param deviceId デバイスID
 */
function resetGeofenceStatus(deviceId) {
    const dict = {};
    geofenceConst.Identifiers.forEach(i => dict[i] = false);
    return ref.child(`/devices/${deviceId}/geofence_status`).set(dict);
}
/**
 * Realtime Database Trigger
 * statusが更新された際にログと最終更新を更新します。
 */
exports.updateMemberStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");
    //更新ステータスが帰宅であれば、更新されたメンバーのデバイスのジオフェンス状態を初期化
    const status = parseInt(change.after.val());
    if (status === states_1.Status.帰宅) {
        ref.child('/devices').once('value').then((snap) => {
            snap.forEach((devices) => {
                if (parseInt(devices.child('member_id').val()) === parseInt(context.params.memberId)) {
                    console.log("initializeGeofenceStatus");
                    resetGeofenceStatus(devices.key).then((_) => { return null; }).catch((reason) => { console.log("deviceGeofenceInitError:" + reason); return null; });
                }
                else {
                    return null;
                }
            });
        }).catch((reason) => { console.log(reason); });
    }
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
//# sourceMappingURL=member.js.map