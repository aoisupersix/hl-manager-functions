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
function InitializeGeofenceStatus(deviceId: string): Promise<void> {
  const dict: { [key: string]: boolean; } = {};
  geofenceConst.Identifiers.forEach(i => dict[i] = false);

  console.log(dict);

  return ref.child(`/devices/${deviceId}/geofence_status`).set(dict);
}

/**
 * メンバーのステータスを更新します。
 * @param memberId メンバーID
 * @param statusId ステータスID
 */
function updateStatus(memberId: number, statusId: number): Promise<void> {
  return ref.child(`/members/${memberId}/status`).set(statusId);
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

    //更新ステータスが帰宅であれば、更新されたメンバーのデバイスのジオフェンス状態を初期化
    const status = parseInt(change.after.val());
    if (status === Status.帰宅) {
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
 * deviceが更新された際にステータスと最終更新を更新します。
 */
export const deviceUpdater = functions.database.ref('/devices/{deviceId}/geofence_status').onUpdate(async (change, context) => {
  //更新時間
  const nowDate = dUtil.getJstDate();
  const update_date = dUtil.getDateString(nowDate);

  //メンバーIDとステータス取得
  const devSnap = await ref.child(`/devices/${context.params.deviceId}`).once('value');
  if (!devSnap.hasChild('member_id')) { return; }
  const memberId = devSnap.child('member_id').val(); //TODO: member_idがnullの場合がある？
  const memSnap = await ref.child(`/members/${memberId}/status`).once('value');
  const nowStatus = memSnap.val();

  const geofenceStates = new List<string>(geofenceConst.Identifiers);
  const states = geofenceStates.Select(g => change.after.child(`${g}`).val());
  //ステータス更新
  if (nowStatus === Status.帰宅 && states.Any(_ => _)) {
    await ref.child(`/members/${memberId}/status`).set(Status.学内);
  } else if (nowStatus === Status.学内 && states.All(_ => !_)) {
    await ref.child(`/members/${memberId}/status`).set(Status.帰宅);
  }
  console.log(states);

  //最終更新の更新
  return ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);
});

/**
 * DBトリガー
 * device追加時にジオフェンスのステータスを初期化します。
 */
export const geofenceStatusInitializer = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {
  console.log('New device created. Initialize geofence status.');
  return InitializeGeofenceStatus(context.params.deviceId);
});