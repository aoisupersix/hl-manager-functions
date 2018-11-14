/*
 * *********************************************
 * アプリをインストールしている端末関係の処理
 * *********************************************
 */
import * as functions from 'firebase-functions';
import { List } from 'linqts';

import { adminSdk } from './firebaseConfig';
import * as geofenceConst from './const/geofenceIdentifiers';
import { Status } from './const/states';
import * as dUtil from './utils/dateUtil';

const ref = adminSdk.database().ref();

/**
 * メンバーのステータスを更新します。
 * @param memberId メンバーID
 * @param status ステータスID
 */
function updateStatus(memberId: number, status: number) {
  return Promise.all([
    ref.child(`/members/${memberId}/status`).set(status),
    ref.child(`/members/${memberId}/last_update_is_auto`).set(true)
  ]);
}

/**
 * Realtime Database Trigger
 * 新たにデバイスが追加された際に各種データを初期化します。
 */
export const initializeDevice = functions.database.ref('/devices/{deviceId}').onCreate((snapshot, context) => {

  //ジオフェンス状態初期データ
  const geofenceStates = new List<string>(geofenceConst.Identifiers);
  const promises = geofenceStates.Where(g => !snapshot.hasChild(`geofence_status/${g}`))
    .Select(g => ref.child(`devices/${snapshot.key}/geofence_status/${g}`).set(false))
    .ToArray();

  return Promise.all(promises);
});

/**
 * Realtime Database Trigger
 * /deviceが更新された際にステータスと最終更新を更新します。
 */
export const updateDeviceInfo = functions.database.ref('/devices/{deviceId}/geofence_status').onUpdate(async (change, context) => {
  //更新時間
  const nowDate = dUtil.getJstDate();
  const update_date = dUtil.getDateString(nowDate);

  //最終更新の更新
  await ref.child(`/devices/${context.params.deviceId}/last_update_date`).set(update_date);

  //メンバーIDとステータス取得
  const devSnap = await ref.child(`/devices/${context.params.deviceId}`).once('value');
  if (!devSnap.hasChild('member_id')) { return change.after; }
  const memberId = devSnap.child('member_id').val();
  let memSnap;
  try {
    memSnap = await ref.child(`/members/${memberId}/status`).once('value');
  }catch(err) {
    console.log(`error. member id [ ${memberId} ] is not found.`);
    return change.after;
  }
  if (memSnap.val() === null) {
    console.log(`error. member id [ ${memberId} ] is not found.`);
    return change.after;
  }
  const nowStatus = memSnap.val();

  //ジオフェンス状態取得
  const geofenceStates = new List<string>(geofenceConst.Identifiers);
  const states = geofenceStates.Select(g => change.after.child(`${g}`).val());
  console.log("geofence states: " + states.ToArray().join(','))

  //条件を満たしていればステータス更新
  if (nowStatus === Status.帰宅 && states.Any(_ => _)) {
    return updateStatus(parseInt(memberId), Status.学内);
  } else if (nowStatus === Status.学内 && states.All(_ => !_)) {
    return updateStatus(parseInt(memberId), Status.帰宅);
  }

  return change.after;
});