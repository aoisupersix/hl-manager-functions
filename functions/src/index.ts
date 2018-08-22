import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as secureCompare from 'secure-compare';
import * as util from './util';

admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

/**
 * statusが更新された際にログと最終更新を更新します。
 */
export const updateStatusReferences = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = util.getJstDate();
    const update_date = util.getDateString(nowDate);
    const update_day = util.getDayString(nowDate).replace(/\//g, "");
    
    //最終更新
    ref.child(`/members/${context.params.memberId}/last_update_date`).set(update_date);
    ref.child(`/members/${context.params.memberId}/last_status`).set(change.before.val());

    //ログ更新
    return ref.child(`/logs/${context.params.memberId}/${update_day}`).push(
        {
            date: update_date,
            update_status: change.after.val()
        }
    );
});

export const addNowStatusReferences = functions.https.onRequest((req, res) => {
    const key = req.query.key;

    // Exit if the keys don't match
    if (!secureCompare(key, functions.config().service_account.key)) {
      console.log('The key provided in the request does not match the key set in the environment. Check that', key,
          'matches the cron.key attribute in `firebase env:get`');
      res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
          'cron.key environment variable.');
      return;
    }

    console.log("AddNowStatusReferences");
});