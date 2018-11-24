import * as functions from 'firebase-functions';
import * as secureCompare from 'secure-compare';

import { adminSdk } from './firebaseConfig'
import * as util from './utils/util';

const ref = adminSdk.database().ref();

export const updateGeofenceStatus = functions.https.onRequest(async (req, res) => {
  //リクエストがPUTではない
  if(req.method !== 'PUT') {
      return res.status(405).send("This functions is only used to 'PUT' method.");
  }
  //パラメータ不足
  if(util.ContainsUndefined(req.query.key, req.query.deviceId, req.query.identifier, req.query.value)) {
      return res.status(400).send("Invalid query parameters.");
  }
  const key = req.query.key;

  //キーが異なる
  if (!secureCompare(key, functions.config().service_account.key)) {
      console.log('The key provided in the request does not match the key set in the environment. Check that', key,
          'matches the cron.key attribute in `firebase env:get`');
      return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
          'cron.key environment variable.');
  }

  const deviceId = req.query.deviceId;
  const identifier = req.query.identifier;
  const value = req.query.value.toLowerCase() === "true";

  await ref.child(`/devices/${deviceId}/geofence_status/${identifier}`).set(value);

  return res.status(200).send("更新完了");
});