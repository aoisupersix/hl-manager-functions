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
const firebaseConfig_1 = require("./firebaseConfig");
const notification = require("./notification");
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
 * メンバーが指定されているデバイスのプッシュ通知トークンを取得します。
 * @param memberId メンバーID
 */
function getFcmTokens(memberId) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const tokens = [];
        const devSnaps = yield ref.child('devices').once('value');
        devSnaps.forEach((devSnap) => {
            if (devSnap.child('member_id').exists() && devSnap.child('fcm_token').exists() && parseInt(devSnap.child('member_id').val()) === memberId) {
                tokens.push(devSnap.child('fcm_token').val());
            }
            return null;
        });
        resolve(tokens);
    }));
}
/**
 * Realtime Database Trigger
 * statusが更新された際にログと最終更新を更新します。
 */
exports.updateMemberStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => __awaiter(this, void 0, void 0, function* () {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    // 更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");
    // 更新ステータスが帰宅であれば、更新されたメンバーのデバイスのジオフェンス状態を初期化
    const status = parseInt(change.after.val());
    if (status === states_1.Status.帰宅) {
        const snap = yield ref.child('/devices').once('value');
        snap.forEach((devices) => {
            if (parseInt(devices.child('member_id').val()) === parseInt(context.params.memberId)) {
                console.log("initializeGeofenceStatus");
                resetGeofenceStatus(devices.key).then((_) => { return null; }).catch((reason) => { console.log("deviceGeofenceInitError:" + reason); return null; });
            }
            else {
                return null;
            }
        });
    }
    // 自動更新であればプッシュ通知送信
    const lastUpdateIsAuto = yield ref.child(`/members/${context.params.memberId}/last_update_is_auto`).once('value');
    if (lastUpdateIsAuto.val() !== false) {
        const tokens = yield getFcmTokens(parseInt(context.params.memberId));
        if (tokens.length > 0) {
            yield notification.sendNotification(tokens, "ステータス自動更新", `ステータスを「${states_1.Status[status]}」に更新しました。`, "");
        }
    }
    return Promise.all([
        ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date),
        ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val()),
        ref.child(`/logs/${context.params.memberId}/${update_day}`).push(// ログ更新
        {
            date: update_date,
            update_status: change.after.val()
        })
    ]);
}));
//# sourceMappingURL=member.js.map