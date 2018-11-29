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
/*
 * *********************************************
 * アプリをインストールしている端末関係の処理
 * *********************************************
 */
const functions = require("firebase-functions");
const linqts_1 = require("linqts");
const firebaseConfig_1 = require("./firebaseConfig");
const geofenceConst = require("./const/geofenceIdentifiers");
const states_1 = require("./const/states");
const dUtil = require("./utils/dateUtil");
const ref = firebaseConfig_1.adminSdk.database().ref();
/**
 * メンバーのステータスを更新します。
 * @param memberId メンバーID
 * @param status ステータスID
 */
function updateStatus(memberId, status) {
    return Promise.all([
        ref.child(`/members/${memberId}/status`).set(status),
        ref.child(`/members/${memberId}/last_update_is_auto`).set(true)
    ]);
}
/**
 * デバイスの最終更新日時を更新します。
 * @param deviceId デバイスID
 */
function updateLastUpdate(deviceId) {
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    return ref.child(`/devices/${deviceId}/last_update_date`).set(update_date);
}
/**
 * Realtime Database Trigger
 * 新たにデバイスが追加された際に各種データを初期化します。
 */
exports.initializeDevice = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {
    //ジオフェンス状態初期データ
    const geofenceStates = new linqts_1.List(geofenceConst.Identifiers);
    const promises = geofenceStates.Where(g => !snapshot.hasChild(`geofence_status/${g}`))
        .Select(g => ref.child(`devices/${snapshot.key}/geofence_status/${g}`).set(false))
        .ToArray();
    return Promise.all(promises);
});
/**
 * Realtime Database Trigger
 * /deviceが更新された際にステータスと最終更新を更新します。
 */
exports.updateDeviceInfo = functions.database.ref('/devices/{deviceId}/geofence_status').onUpdate((change, context) => __awaiter(this, void 0, void 0, function* () {
    // 最終更新
    const lastUpdate = updateLastUpdate(context.params.deviceId);
    // メンバーIDとステータス取得
    const devSnap = yield ref.child(`/devices/${context.params.deviceId}`).once('value');
    if (!devSnap.hasChild('member_id')) {
        return change.after;
    }
    const memberId = devSnap.child('member_id').val();
    let memSnap;
    try {
        memSnap = yield ref.child(`/members/${memberId}/status`).once('value');
    }
    catch (err) {
        console.log(`error. member id [ ${memberId} ] is not found.`);
        return change.after;
    }
    if (memSnap.val() === null) {
        console.log(`error. member id [ ${memberId} ] is not found.`);
        return change.after;
    }
    const nowStatus = memSnap.val();
    //ジオフェンス状態取得
    const geofenceStates = new linqts_1.List(geofenceConst.Identifiers);
    const states = geofenceStates.Select(g => change.after.child(`${g}`).val());
    console.log("geofence states: " + states.ToArray().join(','));
    //条件を満たしていればステータス更新
    if (nowStatus === states_1.Status.帰宅 && states.Any(_ => _)) {
        const statesPromise = updateStatus(parseInt(memberId), states_1.Status.学内);
        return Promise.all([statesPromise, lastUpdate]);
    }
    else if (states.All(_ => !_)) {
        const statesPromise = updateStatus(parseInt(memberId), states_1.Status.帰宅);
        return Promise.all([statesPromise, lastUpdate]);
    }
    return lastUpdate;
}));
/**
 * Realtime Database Trigger
 * device/member_idが更新された際にmembers以下のデバイス情報を更新します。
 */
exports.updateMemberId = functions.database.ref('/devices/{deviceId}/member_id').onUpdate((change, context) => __awaiter(this, void 0, void 0, function* () {
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    //最終更新の更新
    const lastUpdate = ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
    const beforeMemId = '' + change.before.exportVal();
    const afterMemId = '' + change.after.exportVal();
    const memSnap = yield ref.child('/members').once('value');
    if (false === memSnap.hasChild(beforeMemId) && false === memSnap.hasChild(afterMemId)) {
        // メンバーIDが存在しない（そんな場合はないと思うが一応ケア）
        console.log('member_id not found: ' + beforeMemId + '->' + afterMemId);
        return lastUpdate;
    }
    const deleteBeforeDev = ref.child(`/members/${beforeMemId}/devices/${context.params.deviceId}`).set(null);
    const addAfterDev = ref.child(`/members/${afterMemId}/devices/${context.params.deviceId}`).set(true);
    return Promise.all([lastUpdate, deleteBeforeDev, addAfterDev]);
}));
//# sourceMappingURL=device.js.map