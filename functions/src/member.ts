import * as functions from 'firebase-functions';
import { List } from 'linqts';

import { adminSdk } from './firebaseConfig';
import * as geofenceConst from './const/geofenceIdentifiers';
import { Status } from './const/states';
import * as dUtil from './utils/dateUtil';

const ref = adminSdk.database().ref();

/**
 * 引数に指定されたデバイスIDのジオフェンス状態を初期化します。
 * @param deviceId デバイスID
 */
function resetGeofenceStatus(deviceId: string): Promise<void> {
  const dict: { [key: string]: boolean; } = {};
  geofenceConst.Identifiers.forEach(i => dict[i] = false);

  return ref.child(`/devices/${deviceId}/geofence_status`).set(dict);
}

/**
 * Realtime Database Trigger
 * statusが更新された際にログと最終更新を更新します。
 */
export const updateMemberStatus = functions.database.ref('/members/{memberId}/status').onUpdate(async (change, context) => {
  console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
  // 更新時間
  const nowDate = dUtil.getJstDate();
  const update_date = dUtil.getDateString(nowDate);
  const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");

  // 更新ステータスが帰宅であれば、更新されたメンバーのデバイスのジオフェンス状態を初期化
  const status = parseInt(change.after.val());
  if (status === Status.帰宅) {
    const snap = await ref.child('/devices').once('value');
    snap.forEach((devices) => {
      if (parseInt(devices.child('member_id').val()) === parseInt(context.params.memberId)) {
        console.log("initializeGeofenceStatus");
        resetGeofenceStatus(devices.key).then((_) => { return null; }).catch((reason) => { console.log("deviceGeofenceInitError:" + reason); return null; });
      }
      else { return null; }
    });
  }

  // 自動更新であればプッシュ通知送信


  return Promise.all([
    ref.child(`/members/${context.params.memberId}/last_update_date`).set({ // 最終更新の更新
      last_update_date: update_date,
      last_status: change.before.val()
    }),
    ref.child(`/logs/${context.params.memberId}/${update_day}`).push( // ログ更新
      {
        date: update_date,
        update_status: change.after.val()
      }
    )
  ]);
});