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
    return ref.child(`/members/${memberId}`).set({
        status: status,
        last_update_is_auto: true
    });
}
/**
 * Realtime Database Trigger
 * /deviceが更新された際にステータスと最終更新を更新します。
 */
exports.updateDeviceInfo = functions.database.ref('/devices/{deviceId}/geofence_status').onUpdate((change, context) => __awaiter(this, void 0, void 0, function* () {
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    //メンバーIDとステータス取得
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
    const nowStatus = memSnap.val();
    //ジオフェンス状態取得
    const geofenceStates = new linqts_1.List(geofenceConst.Identifiers);
    const states = geofenceStates.Select(g => change.after.child(`${g}`).val());
    //条件を満たしていればステータス更新
    if (nowStatus === states_1.Status.帰宅 && states.Any(_ => _)) {
        yield updateStatus(parseInt(memberId), states_1.Status.学内);
    }
    else if (nowStatus === states_1.Status.学内 && states.All(_ => !_)) {
        yield updateStatus(parseInt(memberId), states_1.Status.帰宅);
    }
    //最終更新の更新
    yield ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
    return change.after;
}));
//# sourceMappingURL=device.js.map