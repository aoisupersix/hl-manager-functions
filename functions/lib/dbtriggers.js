"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const linqts_1 = require("linqts");
const firebaseConfig_1 = require("./firebaseConfig");
const geofenceConst = require("./const/geofenceIdentifiers");
const states_1 = require("./const/states");
const dUtil = require("./utils/dateUtil");
const ref = firebaseConfig_1.adminSdk.database().ref();
/**
 * 引数に指定されたデバイスIDのジオフェンス状態を初期化します。
 * @param deviceId デバイスID
 */
function InitializeGeofenceStatus(deviceId) {
    const dict = {};
    geofenceConst.Identifiers.forEach(i => dict[i] = false);
    console.log(dict);
    return ref.child(`/devices/${deviceId}/geofence_status`).set(dict);
}
/**
 * メンバーのステータスを更新します。
 * @param memberId メンバーID
 * @param statusId ステータスID
 */
function updateStatus(memberId, statusId) {
    return ref.child(`/members/${memberId}/status`).set(statusId);
}
/**
 * DBトリガー
 * statusが更新された際にログと最終更新を更新します。
 */
exports.statusUpdater = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
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
                    InitializeGeofenceStatus(devices.key).then((_) => { return null; }).catch((reason) => { console.log("deviceGeofenceInitError:" + reason); return null; });
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
/**
 * DBトリガー
 * deviceが更新された際にステータスと最終更新を更新します。
 */
exports.deviceUpdater = functions.database.ref('/devices/{deviceId}/geofence_status').onUpdate((change, context) => __awaiter(this, void 0, void 0, function* () {
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    //メンバーIDとステータス取得
    const devSnap = yield ref.child(`/devices/${context.params.deviceId}`).once('value');
    if (!devSnap.hasChild('member_id')) {
        return;
    }
    const memberId = devSnap.child('member_id').val(); //TODO: member_idがnullの場合がある？
    const memSnap = yield ref.child(`/members/${memberId}/status`).once('value');
    const nowStatus = memSnap.val();
    const geofenceStates = new linqts_1.List(geofenceConst.Identifiers);
    const states = geofenceStates.Select(g => change.after.child(`${g}`).val());
    //ステータス更新
    if (nowStatus === states_1.Status.帰宅 && states.Any(_ => _)) {
        yield ref.child(`/members/${memberId}/status`).set(states_1.Status.学内);
    }
    else if (nowStatus === states_1.Status.学内 && states.All(_ => !_)) {
        yield ref.child(`/members/${memberId}/status`).set(states_1.Status.帰宅);
    }
    console.log(states);
    //最終更新の更新
    return ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
}));
/**
 * DBトリガー
 * device追加時にジオフェンスのステータスを初期化します。
 */
exports.geofenceStatusInitializer = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {
    console.log('New device created. Initialize geofence status.');
    return InitializeGeofenceStatus(context.params.deviceId);
});
//# sourceMappingURL=dbtriggers.js.map