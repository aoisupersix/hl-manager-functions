import * as functions from 'firebase-functions';

import { adminSdk } from './firebaseConfig'
import { Identifiers } from './const/geofenceIdentifiers'
import * as dUtil from './utils/dateUtil';

const ref = adminSdk.database().ref();

/**
 * 引数に指定されたデバイスIDのジオフェンス状態を初期化します。
 * @param deviceId デバイスID
 */
function InitializeGeofenceStatus(deviceId: string): Promise<void> {
  const dict: { [key: string]: boolean; } = {};
  Identifiers.forEach(i => dict[i] = false);

  console.log(dict);

  return ref.child(`/devices/${deviceId}/geofence_status`).set(dict);
}

/**
 * DBトリガー
 * statusが更新された際にログと最終更新を更新します。
 */
export const statusUpdater = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");

    //更新ステータスが在室であれば、更新されたメンバーのデバイスのジオフェンス状態を初期化
    const STATUS_REGION_LABORATORY = 2, STATUS_REGION_HOME = 0;
    const status = parseInt(change.after.val());
    if (status === STATUS_REGION_LABORATORY || status === STATUS_REGION_HOME) {
      ref.child('/devices').once('value').then((snap) => {
        snap.forEach((devices) => {
          if (parseInt(devices.child('member_id').val()) === parseInt(context.params.memberId)) {
            console.log("initializeGeofenceStatus");
            InitializeGeofenceStatus(devices.key).then((_) => { return null; }).catch((reason) => { console.log("deviceGeofenceInitError:" + reason); return null; });
          }
          else {
            return null;
          }
        })
      }).catch((reason) => { console.log(reason); });
    }

    //ログ更新
    return Promise.all([
      ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date),
      ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val()),
      ref.child(`/logs/${context.params.memberId}/${update_day}`).push(
        {
            date: update_date,
            update_status: change.after.val()
        }
      )
    ]);
});

/**
 * DBトリガー
 * deviceが更新された際に最終更新を更新します。
 */
export const deviceUpdater = functions.database.ref('/devices/{deviceId}').onUpdate((_, context) => {
  //更新時間
  const nowDate = dUtil.getJstDate();
  const update_date = dUtil.getDateString(nowDate);

  //最終更新の更新
  return ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
})

/**
 * DBトリガー
 * device追加時にジオフェンスのステータスを初期化します。
 */
export const geofenceStatusInitializer = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {
  console.log('New device created. Initialize geofence status.');
  return InitializeGeofenceStatus(context.params.deviceId);
})