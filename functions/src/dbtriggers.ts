import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as util from './utils/util';
import * as dUtil from './utils/dateUtil';

admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

/**
 * DBトリガー
 * statusが更新された際にログと最終更新を更新します。
 */
export const statusReferences = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    //更新時間
    const nowDate = dUtil.getJstDate();
    const update_date = dUtil.getDateString(nowDate);
    const update_day = dUtil.getDayString(nowDate).replace(/\//g, "");

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